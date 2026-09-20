using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class Phase3ValidationTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    [Fact]
    public async Task CreateApiKey_WithBlankName_ShouldReturnBadRequest()
    {
        var client = await AuthenticatedClientAsync();
        using var response = await client.PostAsJsonAsync("/api/v1/api-keys", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateLink_WithBlankDomainOrOversizedFields_ShouldReturnBadRequest()
    {
        var client = await AuthenticatedClientAsync();
        using var blankDomain = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com",
            domain = "",
            slug = "valid-slug"
        });
        using var oversizedTitle = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com",
            domain = "art.link",
            slug = "valid-slug",
            title = new string('a', 256)
        });
        Assert.Equal(HttpStatusCode.BadRequest, blankDomain.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, oversizedTitle.StatusCode);
    }

    [Fact]
    public async Task UpdateLink_WithOversizedDescription_ShouldReturnBadRequest()
    {
        var client = await AuthenticatedClientAsync();
        using var response = await client.PutAsJsonAsync("/api/v1/links/1", new
        {
            originalUrl = "https://example.com",
            title = "合法标题",
            description = new string('a', 513),
            hasPassword = false,
            password = (string?)null,
            expiresAt = (DateTime?)null
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateApiKey_WithPastExpiration_ShouldReturnUnprocessableEntity()
    {
        var client = await AuthenticatedClientAsync();
        using var response = await client.PostAsJsonAsync("/api/v1/api-keys", new
        {
            name = "过期密钥",
            expiresAt = DateTime.UtcNow.AddMinutes(-1)
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");
        return client;
    }
}
