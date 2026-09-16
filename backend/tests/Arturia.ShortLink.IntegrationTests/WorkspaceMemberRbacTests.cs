using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class WorkspaceMemberRbacTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    [Fact]
    public async Task CreateWorkspace_ShouldBindSystemDomainAndOwner()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        var slug = $"workspace-{Guid.NewGuid():N}"[..30];
        using var response = await client.PostAsJsonAsync("/api/v1/workspaces", new { name = "新工作空间", slug });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("owner", json.GetProperty("data").GetProperty("role").GetString());
        var workspaceId = ulong.Parse(json.GetProperty("data").GetProperty("id").GetString()!);
        await using var db = await factory.CreateDbContextAsync();
        Assert.True(await db.WorkspaceMembers.IgnoreQueryFilters().AnyAsync(value => value.WorkspaceId == workspaceId && value.UserId == 1 && value.Role == WorkspaceRole.Owner));
        Assert.True(await db.WorkspaceDomains.IgnoreQueryFilters().AnyAsync(value => value.WorkspaceId == workspaceId && value.DomainId == 1 && value.IsPrimary));
    }

    [Fact]
    public async Task CreateWorkspace_ConcurrentDuplicateSlug_ShouldReturnCreatedAndConflict()
    {
        var slug = $"concurrent-{Guid.NewGuid():N}"[..30];
        var first = await AuthenticatedClientAsync("admin@arturia.link");
        var second = await AuthenticatedClientAsync("admin@arturia.link");
        var payload = new { name = "并发空间", slug };
        var responses = await Task.WhenAll(
            first.PostAsJsonAsync("/api/v1/workspaces", payload),
            second.PostAsJsonAsync("/api/v1/workspaces", payload));
        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Conflict);
        await using var db = await factory.CreateDbContextAsync();
        Assert.Equal(1, await db.Workspaces.CountAsync(value => value.Slug == slug));
    }

    [Fact]
    public async Task CheckSlug_ShouldReportExistingSlugUnavailable()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        using var response = await client.GetAsync("/api/v1/workspaces/check-slug?slug=arturia-core");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("data").GetProperty("available").GetBoolean());
    }

    [Fact]
    public async Task CheckSlug_WithInvalidFormat_ShouldReturnBadRequest400()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        using var response = await client.GetAsync("/api/v1/workspaces/check-slug?slug=INVALID_slug");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Invite_AlreadyRegisteredUser_ShouldAddMemberDirectly()
    {
        var email = $"registered-{Guid.NewGuid():N}@example.com";
        await RegisterAsync(email);
        var client = await AuthenticatedClientAsync("admin@arturia.link", 2);
        using var response = await client.PostAsJsonAsync("/api/v1/workspaces/2/members", new { email, role = "member" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("active", json.GetProperty("data").GetProperty("status").GetString());
    }

    [Fact]
    public async Task Invite_UnregisteredEmail_ShouldCreateInvitationWith202()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link", 1);
        using var response = await client.PostAsJsonAsync("/api/v1/workspaces/1/members", new
        {
            email = $"pending-{Guid.NewGuid():N}@example.com",
            role = "member"
        });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task Invite_AfterExpiredPendingInvitation_ShouldExpireOldAndCreateNewInvitation()
    {
        var email = $"reinvite-{Guid.NewGuid():N}@example.com";
        await using (var db = await factory.CreateDbContextAsync())
        {
            db.WorkspaceInvitations.Add(new WorkspaceInvitation
            {
                WorkspaceId = 1,
                Email = email,
                TokenHash = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)).ToLowerInvariant(),
                ExpiresAt = DateTime.UtcNow.AddMinutes(-1),
                InvitedBy = 1
            });
            await db.SaveChangesAsync();
        }
        var client = await AuthenticatedClientAsync("admin@arturia.link", 1);
        using var response = await client.PostAsJsonAsync("/api/v1/workspaces/1/members", new { email, role = "member" });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        await using var verify = await factory.CreateDbContextAsync();
        var statuses = await verify.WorkspaceInvitations.IgnoreQueryFilters().Where(value => value.Email == email).Select(value => value.Status).ToListAsync();
        Assert.Contains(InvitationStatus.Expired, statuses);
        Assert.Contains(InvitationStatus.Pending, statuses);
    }

    [Fact]
    public async Task Invite_ConcurrentDuplicateEmail_ShouldReturnAcceptedAndConflict()
    {
        var email = $"concurrent-{Guid.NewGuid():N}@example.com";
        var first = await AuthenticatedClientAsync("admin@arturia.link", 1);
        var second = await AuthenticatedClientAsync("admin@arturia.link", 1);
        var requests = new[]
        {
            first.PostAsJsonAsync("/api/v1/workspaces/1/members", new { email, role = "member" }),
            second.PostAsJsonAsync("/api/v1/workspaces/1/members", new { email, role = "member" })
        };
        var responses = await Task.WhenAll(requests);
        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Accepted);
        Assert.Contains(responses, response => response.StatusCode == HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Invite_ConcurrentWithRegister_ShouldConvergeToActiveMemberWithoutPendingInvitation()
    {
        var email = $"invite-register-{Guid.NewGuid():N}@example.com";
        var registerClient = factory.CreateClient();
        var inviteClient = await AuthenticatedClientAsync("admin@arturia.link", 2);
        var registerPayload = new { email, password = "Password123", nickname = "并发受邀" };
        var invitePayload = new { email, role = "member" };
        var registerTask = registerClient.PostAsJsonAsync("/api/v1/auth/register", registerPayload);
        var inviteTask = inviteClient.PostAsJsonAsync("/api/v1/workspaces/2/members", invitePayload);
        var initialResponses = await Task.WhenAll(registerTask, inviteTask);
        using var initialRegister = initialResponses[0];
        using var initialInvite = initialResponses[1];
        using var retryRegister = initialRegister.StatusCode == HttpStatusCode.Conflict
            ? await registerClient.PostAsJsonAsync("/api/v1/auth/register", registerPayload)
            : null;
        using var retryInvite = initialInvite.StatusCode == HttpStatusCode.Conflict
            ? await inviteClient.PostAsJsonAsync("/api/v1/workspaces/2/members", invitePayload)
            : null;
        var registerResponse = retryRegister ?? initialRegister;
        var inviteResponse = retryInvite ?? initialInvite;
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);
        Assert.True(inviteResponse.StatusCode is HttpStatusCode.Created or HttpStatusCode.Accepted or HttpStatusCode.Conflict);

        await using var db = await factory.CreateDbContextAsync();
        var userId = await db.Users.Where(value => value.Email == email).Select(value => value.Id).SingleAsync();
        Assert.Equal(1, await db.WorkspaceMembers.IgnoreQueryFilters().CountAsync(value => value.WorkspaceId == 2 && value.UserId == userId));
        Assert.False(await db.WorkspaceInvitations.IgnoreQueryFilters().AnyAsync(value => value.WorkspaceId == 2 && value.Email == email && value.Status == InvitationStatus.Pending));
    }

    [Fact]
    public async Task Invite_ByMemberRole_ShouldReturnForbidden403()
    {
        var client = await AuthenticatedClientAsync("member@arturia.link", 1);
        using var response = await client.PostAsJsonAsync("/api/v1/workspaces/1/members", new
        {
            email = $"forbidden-{Guid.NewGuid():N}@example.com",
            role = "member"
        });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Invite_InactiveRegisteredUser_ShouldReturnConflictWithoutInvitation()
    {
        var email = $"inactive-{Guid.NewGuid():N}@example.com";
        await RegisterAsync(email);
        await using (var db = await factory.CreateDbContextAsync())
        {
            var user = await db.Users.SingleAsync(value => value.Email == email);
            user.IsActive = false;
            await db.SaveChangesAsync();
        }
        var client = await AuthenticatedClientAsync("admin@arturia.link", 2);
        using var response = await client.PostAsJsonAsync("/api/v1/workspaces/2/members", new { email, role = "member" });
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await using var verify = await factory.CreateDbContextAsync();
        Assert.False(await verify.WorkspaceInvitations.IgnoreQueryFilters().AnyAsync(value => value.Email == email));
    }

    [Fact]
    public async Task Delete_MemberByOwner_ShouldSucceed()
    {
        var email = $"delete-{Guid.NewGuid():N}@example.com";
        await RegisterAsync(email);
        var client = await AuthenticatedClientAsync("admin@arturia.link", 2);
        using var invite = await client.PostAsJsonAsync("/api/v1/workspaces/2/members", new { email, role = "member" });
        var member = (await invite.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        using var response = await client.DeleteAsync($"/api/v1/workspaces/2/members/{member.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Delete_OwnerBySelf_ShouldReturnBadRequestOrForbidden()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link", 1);
        using var response = await client.DeleteAsync("/api/v1/workspaces/1/members/1");
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateRole_OwnerRole_ShouldBeBlocked()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link", 1);
        using var response = await client.PutAsJsonAsync("/api/v1/workspaces/1/members/1", new { role = "member" });
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateRole_ByOwner_ShouldChangeMemberRole()
    {
        var email = $"role-change-{Guid.NewGuid():N}@example.com";
        await RegisterAsync(email);
        var client = await AuthenticatedClientAsync("admin@arturia.link", 1);
        using var add = await client.PostAsJsonAsync("/api/v1/workspaces/1/members", new { email, role = "member" });
        var added = (await add.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        using var response = await client.PutAsJsonAsync($"/api/v1/workspaces/1/members/{added.GetProperty("id").GetString()}", new { role = "admin" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("admin", json.GetProperty("data").GetProperty("role").GetString());
    }

    [Fact]
    public async Task UpdateRole_WithMemberFromAnotherWorkspace_ShouldReturnNotFound404()
    {
        var email = $"cross-space-{Guid.NewGuid():N}@example.com";
        await RegisterAsync(email);
        var workspaceOne = await AuthenticatedClientAsync("admin@arturia.link", 1);
        using var add = await workspaceOne.PostAsJsonAsync("/api/v1/workspaces/1/members", new { email, role = "member" });
        var added = (await add.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var client = await AuthenticatedClientAsync("admin@arturia.link", 2);
        using var response = await client.PutAsJsonAsync($"/api/v1/workspaces/2/members/{added.GetProperty("id").GetString()}", new { role = "admin" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Admin_ShouldInviteMemberButNotAdmin()
    {
        var adminEmail = $"workspace-admin-{Guid.NewGuid():N}@example.com";
        await RegisterAsync(adminEmail);
        var owner = await AuthenticatedClientAsync("admin@arturia.link", 2);
        using var addAdmin = await owner.PostAsJsonAsync("/api/v1/workspaces/2/members", new { email = adminEmail, role = "admin" });
        Assert.Equal(HttpStatusCode.Created, addAdmin.StatusCode);

        await using (var verify = await factory.CreateDbContextAsync())
        {
            var user = await verify.Users.SingleAsync(value => value.Email == adminEmail);
            Assert.True(user.IsActive);
            Assert.True(BCrypt.Net.BCrypt.EnhancedVerify("Password123", user.PasswordHash));
        }

        var admin = await AuthenticatedClientAsync(adminEmail, 2, "Password123");
        using var inviteMember = await admin.PostAsJsonAsync("/api/v1/workspaces/2/members", new { email = $"admin-member-{Guid.NewGuid():N}@example.com", role = "member" });
        using var inviteAdmin = await admin.PostAsJsonAsync("/api/v1/workspaces/2/members", new { email = $"admin-admin-{Guid.NewGuid():N}@example.com", role = "admin" });
        Assert.Equal(HttpStatusCode.Accepted, inviteMember.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, inviteAdmin.StatusCode);
    }

    [Fact]
    public async Task Admin_ShouldDeleteMemberButNotAdminOrOwner()
    {
        var firstAdminEmail = $"delete-admin-one-{Guid.NewGuid():N}@example.com";
        var secondAdminEmail = $"delete-admin-two-{Guid.NewGuid():N}@example.com";
        var memberEmail = $"delete-member-{Guid.NewGuid():N}@example.com";
        await RegisterAsync(firstAdminEmail);
        await RegisterAsync(secondAdminEmail);
        await RegisterAsync(memberEmail);
        var owner = await AuthenticatedClientAsync("admin@arturia.link", 2);
        var firstAdminId = await AddRegisteredMemberAsync(owner, 2, firstAdminEmail, "admin");
        var secondAdminId = await AddRegisteredMemberAsync(owner, 2, secondAdminEmail, "admin");
        var memberId = await AddRegisteredMemberAsync(owner, 2, memberEmail, "member");
        Assert.NotEqual(firstAdminId, secondAdminId);

        var admin = await AuthenticatedClientAsync(firstAdminEmail, 2, "Password123");
        using var deleteMember = await admin.DeleteAsync($"/api/v1/workspaces/2/members/{memberId}");
        using var deleteAdmin = await admin.DeleteAsync($"/api/v1/workspaces/2/members/{secondAdminId}");
        using var deleteOwner = await admin.DeleteAsync("/api/v1/workspaces/2/members/2");
        Assert.Equal(HttpStatusCode.OK, deleteMember.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, deleteAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, deleteOwner.StatusCode);
    }

    private async Task<HttpClient> AuthenticatedClientAsync(string email, ulong? workspaceId = null, string password = "password123!")
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, email, password);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (workspaceId.HasValue) client.DefaultRequestHeaders.Add("X-Workspace-Id", workspaceId.Value.ToString());
        return client;
    }

    private async Task RegisterAsync(string email)
    {
        using var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password = "Password123",
            nickname = "测试成员"
        });
        response.EnsureSuccessStatusCode();
    }

    private static async Task<string> AddRegisteredMemberAsync(HttpClient owner, ulong workspaceId, string email, string role)
    {
        using var response = await owner.PostAsJsonAsync($"/api/v1/workspaces/{workspaceId}/members", new { email, role });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("id").GetString()!;
    }
}
