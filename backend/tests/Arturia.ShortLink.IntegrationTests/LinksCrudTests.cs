using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class LinksCrudTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    [Fact]
    public async Task List_ShouldFilterAndReturnCreatorAndPagingMetadata()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        using var response = await client.GetAsync("/api/v1/links?page=1&pageSize=10&search=github&domain=art.link&isEnabled=true");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var data = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.Equal(1, data.GetProperty("total").GetInt64());
        Assert.Equal(1, data.GetProperty("totalPages").GetInt32());
        var item = Assert.Single(data.GetProperty("items").EnumerateArray());
        Assert.Equal("github-repo", item.GetProperty("slug").GetString());
        Assert.Equal("1", item.GetProperty("createdById").GetString());
        Assert.Equal("Arturia 管理员", item.GetProperty("creatorName").GetString());
    }

    [Fact]
    public async Task Member_ShouldOnlyMutateOwnLinks()
    {
        var member = await AuthenticatedClientAsync("member@arturia.link");
        using var updateOther = await member.PutAsJsonAsync("/api/v1/links/1", UpdatePayload("https://example.com/forbidden"));
        using var toggleOther = await member.PatchAsync("/api/v1/links/1/status", null);
        using var deleteOther = await member.DeleteAsync("/api/v1/links/1");
        using var banOther = await member.PatchAsJsonAsync("/api/v1/links/1/ban", new { isBanned = true, reason = "越权" });
        Assert.Equal(HttpStatusCode.Forbidden, updateOther.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, toggleOther.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, deleteOther.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, banOther.StatusCode);

        var slug = $"member-{Guid.NewGuid():N}"[..20];
        using var create = await member.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/member",
            domain = "art.link",
            slug
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetString();

        using var updateOwn = await member.PutAsJsonAsync($"/api/v1/links/{id}", UpdatePayload("https://example.com/member-updated"));
        using var toggleOwn = await member.PatchAsync($"/api/v1/links/{id}/status", null);
        using var deleteOwn = await member.DeleteAsync($"/api/v1/links/{id}");
        Assert.Equal(HttpStatusCode.OK, updateOwn.StatusCode);
        Assert.Equal(HttpStatusCode.OK, toggleOwn.StatusCode);
        Assert.Equal(HttpStatusCode.OK, deleteOwn.StatusCode);
        var toggleData = (await toggleOwn.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.False(toggleData.GetProperty("isEnabled").GetBoolean());
    }

    [Fact]
    public async Task SoftDelete_ShouldReleaseSlugForReuse()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        var slug = $"reuse-{Guid.NewGuid():N}"[..20];
        var firstId = await CreateLinkAsync(client, slug);

        using var delete = await client.DeleteAsync($"/api/v1/links/{firstId}");
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);
        using var available = await client.GetAsync($"/api/v1/links/check-slug?domain=art.link&slug={slug}");
        var availability = (await available.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.True(availability.GetProperty("available").GetBoolean());
        var secondId = await CreateLinkAsync(client, slug);
        Assert.NotEqual(firstId, secondId);

        await using var db = await factory.CreateDbContextAsync();
        var rows = await db.ShortLinks.IgnoreQueryFilters().Where(value => value.DomainId == 1 && value.Slug == slug).OrderBy(value => value.Id).ToListAsync();
        Assert.Equal(2, rows.Count);
        Assert.NotNull(rows[0].DeletedAt);
        Assert.Null(rows[1].DeletedAt);
    }

    [Fact]
    public async Task BanByOwner_ShouldPersistAuditAndUnbanShouldClearIt()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        var id = await CreateLinkAsync(client, $"ban-{Guid.NewGuid():N}"[..20]);

        using var ban = await client.PatchAsJsonAsync($"/api/v1/links/{id}/ban", new { isBanned = true, reason = "安全测试封禁" });
        Assert.Equal(HttpStatusCode.OK, ban.StatusCode);
        await using (var db = await factory.CreateDbContextAsync())
        {
            var entity = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(value => value.Id == ulong.Parse(id));
            Assert.True(entity.IsBanned);
            Assert.Equal("安全测试封禁", entity.BannedReason);
            Assert.Equal((ulong)1, entity.BannedBy);
            Assert.NotNull(entity.BannedAt);
        }

        using var unban = await client.PatchAsJsonAsync($"/api/v1/links/{id}/ban", new { isBanned = false, reason = (string?)null });
        Assert.Equal(HttpStatusCode.OK, unban.StatusCode);
        await using var verify = await factory.CreateDbContextAsync();
        var updated = await verify.ShortLinks.IgnoreQueryFilters().SingleAsync(value => value.Id == ulong.Parse(id));
        Assert.False(updated.IsBanned);
        Assert.Null(updated.BannedReason);
        Assert.Null(updated.BannedBy);
        Assert.Null(updated.BannedAt);
    }

    [Fact]
    public async Task UpdatePassword_ShouldPreserveOrClearHashAccordingToHasPassword()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        var slug = $"password-{Guid.NewGuid():N}"[..24];
        using var create = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/password",
            domain = "art.link",
            slug,
            password = "OriginalPassword123"
        });
        create.EnsureSuccessStatusCode();
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetString()!;
        string originalHash;
        await using (var db = await factory.CreateDbContextAsync())
        {
            originalHash = (await db.ShortLinks.IgnoreQueryFilters().SingleAsync(value => value.Id == ulong.Parse(id))).PasswordHash!;
        }

        using var preserve = await client.PutAsJsonAsync($"/api/v1/links/{id}", new
        {
            originalUrl = "https://example.com/password-preserved",
            title = "保留密码",
            description = "",
            hasPassword = true,
            password = (string?)null,
            expiresAt = (DateTime?)null
        });
        Assert.Equal(HttpStatusCode.OK, preserve.StatusCode);
        await using (var db = await factory.CreateDbContextAsync())
        {
            Assert.Equal(originalHash, (await db.ShortLinks.IgnoreQueryFilters().SingleAsync(value => value.Id == ulong.Parse(id))).PasswordHash);
        }

        using var clear = await client.PutAsJsonAsync($"/api/v1/links/{id}", new
        {
            originalUrl = "https://example.com/password-cleared",
            title = "清除密码",
            description = "",
            hasPassword = false,
            password = (string?)null,
            expiresAt = (DateTime?)null
        });
        Assert.Equal(HttpStatusCode.OK, clear.StatusCode);
        await using var verify = await factory.CreateDbContextAsync();
        Assert.Null((await verify.ShortLinks.IgnoreQueryFilters().SingleAsync(value => value.Id == ulong.Parse(id))).PasswordHash);
    }

    [Fact]
    public async Task Admin_ShouldUpdateMemberCreatedLink()
    {
        var adminEmail = $"link-admin-{Guid.NewGuid():N}@example.com";
        using var register = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = adminEmail,
            password = "Password123",
            nickname = "短链管理员"
        });
        register.EnsureSuccessStatusCode();
        var owner = await AuthenticatedClientAsync("admin@arturia.link");
        using var invite = await owner.PostAsJsonAsync("/api/v1/workspaces/1/members", new { email = adminEmail, role = "admin" });
        Assert.Equal(HttpStatusCode.Created, invite.StatusCode);

        var member = await AuthenticatedClientAsync("member@arturia.link");
        var memberLinkId = await CreateLinkAsync(member, $"member-owned-{Guid.NewGuid():N}"[..30]);
        var admin = await AuthenticatedClientAsync(adminEmail, "Password123");
        using var update = await admin.PutAsJsonAsync($"/api/v1/links/{memberLinkId}", UpdatePayload("https://example.com/admin-updated"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
    }

    private async Task<HttpClient> AuthenticatedClientAsync(string email, string password = "password123!")
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, email, password);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");
        return client;
    }

    private static object UpdatePayload(string originalUrl) => new
    {
        originalUrl,
        title = "更新后的标题",
        description = "更新后的描述",
        hasPassword = false,
        password = (string?)null,
        expiresAt = (DateTime?)null
    };

    private static async Task<string> CreateLinkAsync(HttpClient client, string slug)
    {
        using var response = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/crud",
            domain = "art.link",
            slug
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetString()!;
    }
}
