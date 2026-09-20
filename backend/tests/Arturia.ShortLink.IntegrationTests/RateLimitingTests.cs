using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class LoginRateLimitingTests(RateLimitingApiFactory factory) : IClassFixture<RateLimitingApiFactory>
{
    [Fact]
    public async Task Login_ShouldReturnStandard429AfterTenRequestsPerMinute()
    {
        var client = factory.CreateClient();
        for (var attempt = 1; attempt <= 10; attempt++)
        {
            using var accepted = await client.PostAsJsonAsync("/api/v1/auth/login", new
            {
                email = "admin@arturia.link",
                password = "password123!"
            });
            Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        }

        using var rejected = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "admin@arturia.link",
            password = "password123!"
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After"));
        var body = await rejected.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(429, body.GetProperty("code").GetInt32());
        Assert.False(body.GetProperty("success").GetBoolean());
        Assert.Equal("请求过于频繁，请稍后重试", body.GetProperty("message").GetString());
    }
}

public sealed class LinkRateLimitingTests(RateLimitingApiFactory factory) : IClassFixture<RateLimitingApiFactory>
{
    [Fact]
    public async Task CreateLink_ShouldReturnStandard429AfterThirtyRequestsPerIdentity()
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");
        for (var attempt = 1; attempt <= 30; attempt++)
        {
            using var accepted = await client.PostAsJsonAsync("/api/v1/links", new
            {
                originalUrl = $"https://example.com/rate/{attempt}",
                domain = "art.link",
                slug = $"rate-{attempt:D2}"
            });
            Assert.Equal(HttpStatusCode.Created, accepted.StatusCode);
        }

        using var rejected = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/rate/rejected",
            domain = "art.link",
            slug = "rate-rejected"
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        var body = await rejected.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(429, body.GetProperty("code").GetInt32());
        Assert.False(body.GetProperty("success").GetBoolean());
    }
}
