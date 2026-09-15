using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Arturia.ShortLink.Api;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class ApiBaselineTests : IClassFixture<WebApplicationFactory<ApiAssemblyMarker>>
{
    private readonly HttpClient client;
    private readonly WebApplicationFactory<ApiAssemblyMarker> factory;

    public ApiBaselineTests(WebApplicationFactory<ApiAssemblyMarker> factory)
    {
        this.factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Database:AutoMigrate", "false");
            builder.UseSetting("Database:SeedDemoData", "false");
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Server=127.0.0.1;Port=1;Database=unused;User=unused;Password=unused");
        });
        client = this.factory.CreateClient();
    }

    [Fact]
    public async Task LiveHealthDoesNotRequireDatabase()
    {
        using var response = await client.GetAsync("/health/live", CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task VersionUsesUnifiedCamelCaseEnvelope()
    {
        using var response = await client.GetAsync("/api/v1/system/version", CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(CancellationToken.None));
        Assert.Equal(200, json.RootElement.GetProperty("code").GetInt32());
        Assert.True(json.RootElement.GetProperty("success").GetBoolean());
        Assert.Equal("0.4.0", json.RootElement.GetProperty("data").GetProperty("version").GetString());
        Assert.False(json.RootElement.TryGetProperty("Code", out _));
    }

    [Theory]
    [InlineData("/openapi/v1.json")]
    [InlineData("/scalar/v1")]
    public async Task DocumentationEndpointsAreAvailable(string path)
    {
        using var response = await client.GetAsync(path, CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OpenApiAndScalarAreLinkedWithoutSensitiveSchemas()
    {
        var openApi = await client.GetStringAsync("/openapi/v1.json", CancellationToken.None);
        var scalar = await client.GetStringAsync("/scalar/v1", CancellationToken.None);
        using var document = JsonDocument.Parse(openApi);

        Assert.True(document.RootElement.GetProperty("paths").TryGetProperty("/api/v1/system/version", out _));
        Assert.True(document.RootElement.GetProperty("paths").TryGetProperty("/health/live", out _));
        Assert.True(document.RootElement.GetProperty("paths").TryGetProperty("/health/ready", out _));
        Assert.DoesNotContain("passwordHash", openApi, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("keyHash", openApi, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("openapi", scalar, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("v1.json", scalar, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ReadyHealthFailsWhenDatabaseIsUnavailable()
    {
        using var response = await client.GetAsync("/health/ready", CancellationToken.None);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task UnknownApiRouteUsesUnifiedNotFoundEnvelope()
    {
        using var response = await client.GetAsync("/api/v1/does-not-exist", CancellationToken.None);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(CancellationToken.None);
        Assert.Equal(404, json.GetProperty("code").GetInt32());
        Assert.False(json.GetProperty("success").GetBoolean());
    }

    [Fact]
    public async Task UnsupportedMethodUsesRealStatusAndUnifiedEnvelope()
    {
        using var response = await client.PostAsync("/api/v1/system/version", null, CancellationToken.None);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(CancellationToken.None);
        Assert.Equal(405, json.GetProperty("code").GetInt32());
        Assert.False(json.GetProperty("success").GetBoolean());
    }

    [Fact]
    public void EmptyProxyConfigurationKeepsSafeLoopbackTrustBoundary()
    {
        var options = factory.Services.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;
        Assert.NotEmpty(options.KnownProxies);
        Assert.Equal(1, options.ForwardLimit);
    }
}
