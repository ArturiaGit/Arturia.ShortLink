using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Arturia.ShortLink.Infrastructure.Security;
using Arturia.ShortLink.Infrastructure.Services;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class AuthTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    [Fact]
    public async Task Register_WithoutInvitations_ShouldCreateUserAndPersonalWorkspaceWithOwnerRole()
    {
        var email = $"Zhang-San_88-{Guid.NewGuid():N}@example.com";
        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password = "Password123",
            nickname = "张三"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.Equal(200, json.GetProperty("code").GetInt32());
        Assert.Single(json.GetProperty("data").GetProperty("workspaces").EnumerateArray());

        await using var db = await factory.CreateDbContextAsync();
        var user = await db.Users.SingleAsync(value => value.Email == email.ToLowerInvariant());
        var member = await db.WorkspaceMembers.IgnoreQueryFilters().SingleAsync(value => value.UserId == user.Id);
        var workspace = await db.Workspaces.SingleAsync(value => value.Id == member.WorkspaceId);
        Assert.Equal(WorkspaceRole.Owner, member.Role);
        Assert.Matches("^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$", workspace.Slug);
        Assert.True(await db.WorkspaceDomains.IgnoreQueryFilters().AnyAsync(value => value.WorkspaceId == workspace.Id && value.DomainId == 1 && value.IsPrimary));
    }

    [Fact]
    public async Task Register_DuplicateEmail_ShouldReturnConflict409()
    {
        var payload = new { email = "admin@arturia.link", password = "Password123", nickname = "重复用户" };
        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", payload);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_ConcurrentDuplicateEmail_ShouldReturnCreatedAndConflict()
    {
        var email = $"concurrent-register-{Guid.NewGuid():N}@example.com";
        var payload = new { email, password = "Password123", nickname = "并发注册" };
        var responses = await Task.WhenAll(
            factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", payload),
            factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", payload));
        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Conflict);
        await using var db = await factory.CreateDbContextAsync();
        Assert.Equal(1, await db.Users.CountAsync(value => value.Email == email));
    }

    [Fact]
    public async Task Login_Success_ShouldReturnValidJwtAndWorkspaces()
    {
        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "admin@arturia.link",
            password = "password123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var token = json.GetProperty("data").GetProperty("token").GetString();
        Assert.NotNull(token);
        Assert.Equal(3, token.Split('.').Length);
        Assert.Equal(2, json.GetProperty("data").GetProperty("workspaces").GetArrayLength());
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("Arturia.ShortLink.Tests", jwt.Issuer);
        Assert.Contains("Arturia.ShortLink.Tests", jwt.Audiences);
        Assert.InRange(jwt.ValidTo - DateTime.UtcNow, TimeSpan.FromDays(7).Subtract(TimeSpan.FromMinutes(1)), TimeSpan.FromDays(7).Add(TimeSpan.FromMinutes(1)));
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type.Contains("workspace", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type.Contains("role", StringComparison.OrdinalIgnoreCase));
        Assert.Single(jwt.Claims, claim => claim.Type == JwtRegisteredClaimNames.Sub);
        Assert.Single(jwt.Claims, claim => claim.Type == JwtRegisteredClaimNames.Email);
        Assert.Single(jwt.Claims, claim => claim.Type == JwtRegisteredClaimNames.Name);
        Assert.Single(jwt.Claims, claim => claim.Type == JwtRegisteredClaimNames.Jti);
        var validation = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "Arturia.ShortLink.Tests",
            ValidateAudience = true,
            ValidAudience = "Arturia.ShortLink.Tests",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("phase-2-integration-test-secret-key-at-least-32-bytes"))
        }, out _);
        Assert.NotNull(validation);
    }

    [Fact]
    public async Task Login_WrongPassword_ShouldReturnUnauthorized401()
    {
        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "admin@arturia.link",
            password = "wrong-password"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMe_ShouldReturnUserInfoWithoutPasswordHash()
    {
        var client = factory.CreateClient();
        var token = await LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("passwordHash", body, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("admin@arturia.link", body, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-a-valid-jwt")]
    public async Task GetMe_WithMissingOrInvalidToken_ShouldReturnUnifiedUnauthorizedEnvelope(string? token)
    {
        var client = factory.CreateClient();
        if (token is not null) client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(401, json.GetProperty("code").GetInt32());
        Assert.False(json.GetProperty("success").GetBoolean());
    }

    [Fact]
    public async Task Register_ShouldStoreBcryptCostEleven()
    {
        var email = $"bcrypt-{Guid.NewGuid():N}@example.com";
        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Password123", nickname = "哈希测试" });
        response.EnsureSuccessStatusCode();
        await using var db = await factory.CreateDbContextAsync();
        var hash = await db.Users.Where(value => value.Email == email).Select(value => value.PasswordHash).SingleAsync();
        Assert.StartsWith("$2", hash, StringComparison.Ordinal);
        Assert.Equal("11", hash.Split('$')[2]);
    }

    [Fact]
    public async Task Register_WithPendingInvitations_ShouldCreatePersonalWorkspaceAndAcceptAllInvitations()
    {
        var email = $"invited-{Guid.NewGuid():N}@example.com";
        await SeedInvitationsAsync(email, DateTime.UtcNow.AddDays(2), DateTime.UtcNow.AddDays(3));

        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password = "Password123",
            nickname = "受邀用户"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(3, json.GetProperty("data").GetProperty("workspaces").GetArrayLength());
        await using var db = await factory.CreateDbContextAsync();
        Assert.Equal(2, await db.WorkspaceInvitations.IgnoreQueryFilters().CountAsync(value => value.Email == email && value.Status == InvitationStatus.Accepted));
    }

    [Fact]
    public async Task Register_WithExpiredInvitation_ShouldMarkAsExpiredAndNotJoin()
    {
        var email = $"expired-{Guid.NewGuid():N}@example.com";
        await SeedInvitationsAsync(email, DateTime.UtcNow.AddMinutes(-1));

        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password = "Password123",
            nickname = "过期受邀用户"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Single(json.GetProperty("data").GetProperty("workspaces").EnumerateArray());
        await using var db = await factory.CreateDbContextAsync();
        Assert.Equal(InvitationStatus.Expired, await db.WorkspaceInvitations.IgnoreQueryFilters().Where(value => value.Email == email).Select(value => value.Status).SingleAsync());
    }

    [Fact]
    public async Task Register_WhenSystemDomainBindingFails_ShouldRollbackUserAndWorkspace()
    {
        var email = $"rollback-{Guid.NewGuid():N}@example.com";
        await using (var arrange = await factory.CreateDbContextAsync())
        {
            var systemDomain = await arrange.LinkDomains.SingleAsync(value => value.Id == 1);
            systemDomain.Domain = "temporarily-unavailable.test";
            await arrange.SaveChangesAsync();
        }
        try
        {
            using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new
            {
                email,
                password = "Password123",
                nickname = "事务回滚"
            });
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            await using var verify = await factory.CreateDbContextAsync();
            Assert.False(await verify.Users.AnyAsync(value => value.Email == email));
            Assert.False(await verify.Workspaces.AnyAsync(value => value.Name == "事务回滚的工作空间"));
        }
        finally
        {
            await using var restore = await factory.CreateDbContextAsync();
            var systemDomain = await restore.LinkDomains.SingleAsync(value => value.Id == 1);
            systemDomain.Domain = "art.link";
            await restore.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Register_WhenFailureOccursAfterInvitationAcceptance_ShouldRollbackEntireTransaction()
    {
        var email = $"late-rollback-{Guid.NewGuid():N}@example.com";
        _ = factory.CreateClient();
        await SeedInvitationsAsync(email, DateTime.UtcNow.AddDays(1));
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(factory.ConnectionString, ServerVersion.Parse("8.0.46-mysql"))
            .AddInterceptors(new UtcConnectionInterceptor(), new FailAfterInvitationAcceptanceInterceptor())
            .Options;
        await using var db = new AppDbContext(options, new Arturia.ShortLink.Infrastructure.Context.WorkspaceContext());
        var service = new AuthService(
            db,
            new BCryptPasswordHasher(),
            new JwtTokenService(Options.Create(new JwtOptions
            {
                SecretKey = "phase-2-integration-test-secret-key-at-least-32-bytes",
                Issuer = "Arturia.ShortLink.Tests",
                Audience = "Arturia.ShortLink.Tests"
            })));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RegisterAsync(
            new Arturia.ShortLink.Application.Auth.Dtos.RegisterRequest(email, "Password123", "后段回滚"), CancellationToken.None));

        await using var verify = await factory.CreateDbContextAsync();
        Assert.False(await verify.Users.AnyAsync(value => value.Email == email));
        Assert.False(await verify.Workspaces.AnyAsync(value => value.Name == "后段回滚的工作空间"));
        Assert.Equal(InvitationStatus.Pending, await verify.WorkspaceInvitations.IgnoreQueryFilters().Where(value => value.Email == email).Select(value => value.Status).SingleAsync());
    }

    internal static async Task<string> LoginAsync(HttpClient client, string email, string password)
    {
        using var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private async Task SeedInvitationsAsync(string email, params DateTime[] expirations)
    {
        await using var db = await factory.CreateDbContextAsync();
        for (var index = 0; index < expirations.Length; index++)
        {
            db.WorkspaceInvitations.Add(new WorkspaceInvitation
            {
                WorkspaceId = (ulong)index + 1,
                Email = email,
                Role = index == 0 ? InvitationRole.Member : InvitationRole.Admin,
                TokenHash = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)).ToLowerInvariant(),
                ExpiresAt = expirations[index],
                InvitedBy = 1
            });
        }
        await db.SaveChangesAsync();
    }
}

internal sealed class FailAfterInvitationAcceptanceInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context is not null &&
            context.ChangeTracker.Entries<WorkspaceInvitation>().Any(entry => entry.State == EntityState.Modified && entry.Entity.Status == InvitationStatus.Accepted) &&
            context.ChangeTracker.Entries<WorkspaceMember>().Any(entry => entry.State == EntityState.Added && entry.Entity.Role != WorkspaceRole.Owner))
            throw new InvalidOperationException("测试注入：邀请接受后失败。");
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
