using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Arturia.ShortLink.Application.Links.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class LinksSlugTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    [Fact]
    public async Task CreateWithoutSlug_ShouldGenerateBase62SlugAndPersistUtmAndPasswordHash()
    {
        var client = await AuthenticatedClientAsync();
        const string password = "private-password";
        using var response = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/landing?utm_source=newsletter&utm_medium=email&utm_campaign=launch&utm_term=dotnet&utm_content=hero",
            domain = "art.link",
            title = "自动短码",
            description = "测试自动发号",
            password,
            expiresAt = (DateTime?)null
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(password, body, StringComparison.Ordinal);
        Assert.DoesNotContain("passwordHash", body, StringComparison.Ordinal);
        var data = JsonDocument.Parse(body).RootElement.GetProperty("data");
        var slug = data.GetProperty("slug").GetString();
        Assert.NotNull(slug);
        Assert.Matches("^[0-9a-zA-Z]{6}$", slug);
        Assert.True(data.GetProperty("hasPassword").GetBoolean());

        await using var db = await factory.CreateDbContextAsync();
        var entity = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(value => value.Slug == slug && value.DeletedAt == null);
        Assert.True(BCrypt.Net.BCrypt.EnhancedVerify(password, entity.PasswordHash));
        Assert.Equal("newsletter", entity.UtmSource);
        Assert.Equal("email", entity.UtmMedium);
        Assert.Equal("launch", entity.UtmCampaign);
        Assert.Equal("dotnet", entity.UtmTerm);
        Assert.Equal("hero", entity.UtmContent);
    }

    [Theory]
    [InlineData("api")]
    [InlineData("admin")]
    [InlineData("ab")]
    [InlineData("contains space")]
    public async Task CreateWithReservedOrInvalidSlug_ShouldReturnUnprocessableEntity(string slug)
    {
        var client = await AuthenticatedClientAsync();
        using var response = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/safe",
            domain = "art.link",
            slug
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task CheckSlug_ShouldRespectOccupancyAndExcludedLink()
    {
        var client = await AuthenticatedClientAsync();
        using var occupied = await client.GetAsync("/api/v1/links/check-slug?domain=art.link&slug=github-repo");
        using var excluded = await client.GetAsync("/api/v1/links/check-slug?domain=art.link&slug=github-repo&excludeId=1");

        Assert.Equal(HttpStatusCode.OK, occupied.StatusCode);
        Assert.Equal(HttpStatusCode.OK, excluded.StatusCode);
        var occupiedData = (await occupied.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        var excludedData = (await excluded.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.False(occupiedData.GetProperty("available").GetBoolean());
        Assert.True(excludedData.GetProperty("available").GetBoolean());
    }

    [Fact]
    public async Task CreateWithOccupiedCustomSlug_ShouldReturnConflict()
    {
        var client = await AuthenticatedClientAsync();
        using var response = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/conflict",
            domain = "art.link",
            slug = "github-repo"
        });
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("https://art.link/loop")]
    [InlineData("https://go.arturia.dev/loop")]
    [InlineData("https://malware.test/payload")]
    [InlineData("javascript:alert(1)")]
    public async Task CreateWithUnsafeTarget_ShouldReturnUnprocessableEntity(string originalUrl)
    {
        var client = await AuthenticatedClientAsync();
        using var response = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl,
            domain = "art.link",
            slug = $"risk-{Guid.NewGuid():N}"[..20]
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task AutomaticSlug_ShouldRetryAfterCollisionAndUseNextCandidate()
    {
        using var bootstrapClient = factory.CreateClient();
        await using (var db = await factory.CreateDbContextAsync())
        {
            db.ShortLinks.Add(new ShortLinkEntity
            {
                WorkspaceId = 1,
                DomainId = 1,
                Slug = "ABC123",
                OriginalUrl = "https://example.com/existing-collision",
                CreatedBy = 1
            });
            await db.SaveChangesAsync();
        }
        var generator = new SequenceBase62Generator("ABC123", "zYx987");
        using var configuredFactory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IBase62Generator>();
            services.AddSingleton<IBase62Generator>(generator);
        }));
        var client = configuredFactory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");

        using var response = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/retried",
            domain = "art.link"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var data = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.Equal("zYx987", data.GetProperty("slug").GetString());
        Assert.Equal(2, generator.Attempts);
    }

    [Fact]
    public async Task AutomaticSlug_ShouldReturnConflictAfterThreeCollisions()
    {
        using var bootstrapClient = factory.CreateClient();
        await using (var db = await factory.CreateDbContextAsync())
        {
            db.ShortLinks.Add(new ShortLinkEntity
            {
                WorkspaceId = 1,
                DomainId = 1,
                Slug = "CLLIDE",
                OriginalUrl = "https://example.com/exhausted-collision",
                CreatedBy = 1
            });
            await db.SaveChangesAsync();
        }
        var generator = new SequenceBase62Generator("CLLIDE");
        using var configuredFactory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IBase62Generator>();
            services.AddSingleton<IBase62Generator>(generator);
        }));
        var client = configuredFactory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");

        using var response = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/exhausted",
            domain = "art.link"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(3, generator.Attempts);
    }

    [Fact]
    public async Task SharedSystemDomain_ShouldDetectAndRetrySlugUsedByAnotherWorkspace()
    {
        using var bootstrapClient = factory.CreateClient();
        await using (var db = await factory.CreateDbContextAsync())
        {
            db.ShortLinks.Add(new ShortLinkEntity
            {
                WorkspaceId = 2,
                DomainId = 1,
                Slug = "XWS123",
                OriginalUrl = "https://example.com/workspace-two",
                CreatedBy = 1
            });
            await db.SaveChangesAsync();
        }
        var generator = new SequenceBase62Generator("XWS123", "NEW123");
        using var configuredFactory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IBase62Generator>();
            services.AddSingleton<IBase62Generator>(generator);
        }));
        var client = configuredFactory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");

        using var check = await client.GetAsync("/api/v1/links/check-slug?domain=art.link&slug=XWS123");
        var checkData = (await check.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.False(checkData.GetProperty("available").GetBoolean());

        using var create = await client.PostAsJsonAsync("/api/v1/links", new
        {
            originalUrl = "https://example.com/workspace-one",
            domain = "art.link"
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var data = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.Equal("NEW123", data.GetProperty("slug").GetString());
        Assert.Equal(2, generator.Attempts);
    }

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, "admin@arturia.link", "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");
        return client;
    }

    private sealed class SequenceBase62Generator(params string[] values) : IBase62Generator
    {
        private int index;
        public int Attempts => index;

        public string Generate(int length = 6)
        {
            var current = Interlocked.Increment(ref index) - 1;
            return values[Math.Min(current, values.Length - 1)];
        }
    }
}
