using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class ApiKeyAuthTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    [Fact]
    public async Task CreateApiKey_ShouldReturnPlaintextOnceAndPersistOnlyHashAndPrefix()
    {
        var client = await AuthenticatedClientAsync();

        using var response = await client.PostAsJsonAsync("/api/v1/api-keys", new
        {
            name = "CI 自动化密钥",
            expiresAt = (DateTime?)null
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        var plaintext = data.GetProperty("apiKey").GetString();
        Assert.NotNull(plaintext);
        Assert.StartsWith("art_live_", plaintext, StringComparison.Ordinal);
        Assert.Equal(41, plaintext.Length);

        var id = ulong.Parse(data.GetProperty("id").GetString()!);
        await using var db = await factory.CreateDbContextAsync();
        var entity = await db.ApiKeys.IgnoreQueryFilters().SingleAsync(value => value.Id == id);
        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plaintext))).ToLowerInvariant();
        Assert.Equal(expectedHash, entity.KeyHash);
        Assert.Equal(plaintext[..12], entity.KeyPrefix);
        Assert.DoesNotContain(plaintext, JsonSerializer.Serialize(entity), StringComparison.Ordinal);
    }

    [Fact]
    public async Task ListAndDeleteApiKey_ShouldNeverReturnPlaintextAndShouldRevokeKey()
    {
        var client = await AuthenticatedClientAsync();
        var created = await CreateApiKeyAsync(client, "待撤销密钥");

        using var listResponse = await client.GetAsync("/api/v1/api-keys");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var listBody = await listResponse.Content.ReadAsStringAsync();
        Assert.DoesNotContain(created.Plaintext, listBody, StringComparison.Ordinal);
        Assert.DoesNotContain("apiKey", listBody, StringComparison.Ordinal);
        var listJson = JsonDocument.Parse(listBody).RootElement;
        Assert.Contains(listJson.GetProperty("data").EnumerateArray(), item =>
            item.GetProperty("id").GetString() == created.Id &&
            item.GetProperty("keyPrefix").GetString() == created.Plaintext[..12]);

        using var deleteResponse = await client.DeleteAsync($"/api/v1/api-keys/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        await using var db = await factory.CreateDbContextAsync();
        Assert.False(await db.ApiKeys.IgnoreQueryFilters().AnyAsync(value => value.Id == ulong.Parse(created.Id)));
    }

    [Fact]
    public async Task ApiKeyCredential_ShouldBeForbiddenFromWorkspaceAndApiKeyManagement()
    {
        var jwtClient = await AuthenticatedClientAsync();
        var created = await CreateApiKeyAsync(jwtClient, "受限密钥");
        var apiKeyClient = factory.CreateClient();
        apiKeyClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", created.Plaintext);
        apiKeyClient.DefaultRequestHeaders.Add("X-Workspace-Id", "1");

        using var workspaceResponse = await apiKeyClient.GetAsync("/api/v1/workspaces");
        using var apiKeyResponse = await apiKeyClient.PostAsJsonAsync("/api/v1/api-keys", new { name = "越权密钥" });
        using var domainResponse = await apiKeyClient.GetAsync("/api/v1/domains");

        Assert.Equal(HttpStatusCode.Forbidden, workspaceResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, apiKeyResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, domainResponse.StatusCode);
    }

    [Fact]
    public async Task ApiKeyCredential_ShouldCreateLinksInLockedWorkspaceAndBeRevokedImmediately()
    {
        var jwtClient = await AuthenticatedClientAsync();
        var created = await CreateApiKeyAsync(jwtClient, "短链自动化密钥");
        var apiKeyClient = factory.CreateClient();
        apiKeyClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", created.Plaintext);
        var slug = $"key-{Guid.NewGuid():N}"[..20];

        using var createLink = await apiKeyClient.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/api-key",
            domain = "art.link",
            slug
        });
        Assert.Equal(HttpStatusCode.Created, createLink.StatusCode);
        await using (var db = await factory.CreateDbContextAsync())
        {
            var link = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(value => value.Slug == slug);
            Assert.Equal((ulong)1, link.WorkspaceId);
            Assert.Equal((ulong)1, link.CreatedBy);
            var apiKey = await db.ApiKeys.IgnoreQueryFilters().SingleAsync(value => value.Id == ulong.Parse(created.Id));
            Assert.NotNull(apiKey.LastUsedAt);
        }

        using var ban = await apiKeyClient.PatchAsJsonAsync("/api/v1/links/1/ban", new { isBanned = true, reason = "越权" });
        Assert.Equal(HttpStatusCode.Forbidden, ban.StatusCode);

        var wrongWorkspaceClient = factory.CreateClient();
        wrongWorkspaceClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", created.Plaintext);
        wrongWorkspaceClient.DefaultRequestHeaders.Add("X-Workspace-Id", "2");
        using var wrongWorkspace = await wrongWorkspaceClient.GetAsync("/api/v1/links");
        Assert.Equal(HttpStatusCode.Forbidden, wrongWorkspace.StatusCode);

        using var delete = await jwtClient.DeleteAsync($"/api/v1/api-keys/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);
        using var revoked = await apiKeyClient.GetAsync("/api/v1/links");
        Assert.Equal(HttpStatusCode.Unauthorized, revoked.StatusCode);
    }

    [Fact]
    public async Task ExpiredApiKey_ShouldReturnUnauthorized()
    {
        var jwtClient = await AuthenticatedClientAsync();
        var created = await CreateApiKeyAsync(jwtClient, "即将过期密钥");
        await using (var db = await factory.CreateDbContextAsync())
        {
            var apiKey = await db.ApiKeys.IgnoreQueryFilters().SingleAsync(value => value.Id == ulong.Parse(created.Id));
            apiKey.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }
        var apiKeyClient = factory.CreateClient();
        apiKeyClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", created.Plaintext);
        using var response = await apiKeyClient.GetAsync("/api/v1/links");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MemberJwt_ShouldBeForbiddenFromApiKeyManagement()
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "member@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");
        using var response = await client.PostAsJsonAsync("/api/v1/api-keys", new { name = "成员越权密钥" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");
        return client;
    }

    private static async Task<(string Id, string Plaintext)> CreateApiKeyAsync(HttpClient client, string name)
    {
        using var response = await client.PostAsJsonAsync("/api/v1/api-keys", new { name });
        response.EnsureSuccessStatusCode();
        var data = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        return (data.GetProperty("id").GetString()!, data.GetProperty("apiKey").GetString()!);
    }
}
