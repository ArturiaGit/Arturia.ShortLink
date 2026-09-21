using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Threading.Channels;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Infrastructure.Channels;
using Arturia.ShortLink.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class RedirectPipelineTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    private HttpClient Client(string host = "art.link")
    {
        var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions { AllowAutoRedirect = false, HandleCookies = false });
        client.DefaultRequestHeaders.Host = host;
        return client;
    }

    private async Task<ShortLinkEntity> AddLinkAsync(string originalUrl = "https://example.com/path?promo=old&keep=yes", string? password = null)
    {
        using var startup = Client();
        using var ready = await startup.GetAsync("/health/live");
        ready.EnsureSuccessStatusCode();
        await using var db = await factory.CreateDbContextAsync();
        var link = new ShortLinkEntity
        {
            WorkspaceId = 1,
            DomainId = 1,
            CreatedBy = 1,
            Slug = $"p4-{Guid.NewGuid():N}"[..20],
            OriginalUrl = originalUrl,
            PasswordHash = password is null ? null : BCrypt.Net.BCrypt.HashPassword(password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.ShortLinks.Add(link);
        await db.SaveChangesAsync();
        return link;
    }

    [Fact]
    public async Task ActiveLink_MergesQueryAndQueuesLog()
    {
        var link = await AddLinkAsync();
        using var client = Client();
        using var response = await client.GetAsync($"/{link.Slug}?promo=new&utm_source=mail");
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("https://example.com/path?promo=new&keep=yes&utm_source=mail", response.Headers.Location?.ToString());
        Assert.Contains("no-cache", response.Headers.CacheControl?.ToString());
        await WaitForAsync(async db => await db.LinkAccessLogs.IgnoreQueryFilters().AnyAsync(x => x.LinkId == link.Id));
        await using var verify = await factory.CreateDbContextAsync();
        Assert.Equal("mail", (await verify.LinkAccessLogs.IgnoreQueryFilters().SingleAsync(x => x.LinkId == link.Id)).UtmSource);
        Assert.Equal((ulong)1, (await verify.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id)).TotalClicks);
    }

    [Fact]
    public async Task StatusChecks_RespectPriority_AndUnknownHostNeverRedirectsToAttacker()
    {
        var link = await AddLinkAsync(password: "valid-password");
        using var client = Client();
        Assert.EndsWith("/unlock/" + link.Slug, (await client.GetAsync("/" + link.Slug)).Headers.Location?.ToString());
        await using (var db = await factory.CreateDbContextAsync())
        {
            var row = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
            row.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            row.IsEnabled = false;
            row.IsBanned = true;
            await db.SaveChangesAsync();
        }
        Assert.EndsWith("/banned", (await client.GetAsync("/" + link.Slug)).Headers.Location?.ToString());
        await using (var db = await factory.CreateDbContextAsync())
        {
            var row = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
            row.IsBanned = false;
            await db.SaveChangesAsync();
        }
        Assert.EndsWith("/suspended", (await client.GetAsync("/" + link.Slug)).Headers.Location?.ToString());
        await using (var db = await factory.CreateDbContextAsync())
        {
            var row = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
            row.IsEnabled = true;
            await db.SaveChangesAsync();
        }
        Assert.EndsWith("/expired", (await client.GetAsync("/" + link.Slug)).Headers.Location?.ToString());
        await using (var db = await factory.CreateDbContextAsync())
        {
            var row = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
            row.DeletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        Assert.EndsWith("/404", (await client.GetAsync("/" + link.Slug)).Headers.Location?.ToString());
        Assert.EndsWith("/404", (await client.GetAsync("/does-not-exist")).Headers.Location?.ToString());
        using var attacker = Client("attacker.example");
        var unknown = await attacker.GetAsync("/" + link.Slug);
        Assert.Equal(HttpStatusCode.Redirect, unknown.StatusCode);
        Assert.DoesNotContain("attacker.example", unknown.Headers.Location?.ToString());
    }

    [Fact]
    public async Task Unlock_CookieAllowsRedirect_ButPasswordChangeRevokesIt()
    {
        var link = await AddLinkAsync(password: "valid-password");
        using var client = Client();
        using var wrong = await client.PostAsJsonAsync($"/api/v1/links/{link.Slug}/unlock", new { password = "wrong" });
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Empty(wrong.Headers.GetValuesOrEmpty("Set-Cookie"));
        using var unlocked = await client.PostAsJsonAsync($"/api/v1/links/{link.Slug}/unlock", new { password = "valid-password" });
        Assert.Equal(HttpStatusCode.OK, unlocked.StatusCode);
        var body = await unlocked.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("https://example.com/path?promo=old&keep=yes", body.GetProperty("data").GetProperty("originalUrl").GetString());
        var cookie = Assert.Single(unlocked.Headers.GetValues("Set-Cookie")).Split(';')[0];
        Assert.StartsWith("art_pwd_ticket_" + link.Slug + "=", cookie);
        using var forged = new HttpRequestMessage(HttpMethod.Get, "/" + link.Slug);
        forged.Headers.Add("Cookie", cookie + "tampered");
        Assert.EndsWith("/unlock/" + link.Slug, (await client.SendAsync(forged)).Headers.Location?.ToString());
        using var unknownHost = Client("unknown.example");
        using var unknownUnlock = await unknownHost.PostAsJsonAsync($"/api/v1/links/{link.Slug}/unlock", new { password = "valid-password" });
        Assert.Equal(HttpStatusCode.NotFound, unknownUnlock.StatusCode);
        using var allowed = new HttpRequestMessage(HttpMethod.Get, "/" + link.Slug);
        allowed.Headers.Add("Cookie", cookie);
        Assert.Equal("https://example.com/path?promo=old&keep=yes", (await client.SendAsync(allowed)).Headers.Location?.ToString());
        await using (var db = await factory.CreateDbContextAsync())
        {
            var row = await db.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
            do { row.PasswordHash = BCrypt.Net.BCrypt.HashPassword("new-password"); }
            while (row.PasswordHash[..8] == link.PasswordHash![..8]);
            await db.SaveChangesAsync();
        }
        using var revoked = new HttpRequestMessage(HttpMethod.Get, "/" + link.Slug);
        revoked.Headers.Add("Cookie", cookie);
        Assert.EndsWith("/unlock/" + link.Slug, (await client.SendAsync(revoked)).Headers.Location?.ToString());
    }

    [Fact]
    public async Task Consumer_FlushesAtFiveHundredEvents_WithoutWaitingForTimer()
    {
        var link = await AddLinkAsync();
        var writer = factory.Services.GetRequiredService<Arturia.ShortLink.Application.Common.Interfaces.IChannelLogWriter>();
        var now = DateTime.UtcNow;
        for (var i = 0; i < 500; i++)
            Assert.True(writer.TryWrite(new ClickLogEvent(link.Id, link.WorkspaceId, "127.0.0.1", "Mozilla/5.0", null, now,
                null, null, null, null, null)));
        await WaitForAsync(async db => await db.LinkAccessLogs.IgnoreQueryFilters().CountAsync(x => x.LinkId == link.Id) == 500);
        await using var verify = await factory.CreateDbContextAsync();
        var count = await verify.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
        Assert.Equal((ulong)500, count.TotalClicks);
        Assert.Equal((ulong)1, count.TotalUniqueVisitors);
    }

    [Fact]
    public async Task Consumer_PreloadsTodayUv_AndDrainsOnStop()
    {
        var link = await AddLinkAsync();
        using var client = Client();
        using var first = await client.GetAsync("/" + link.Slug);
        await WaitForAsync(async db => await db.LinkAccessLogs.IgnoreQueryFilters().AnyAsync(x => x.LinkId == link.Id));
        await using var db = await factory.CreateDbContextAsync();
        var old = await db.LinkAccessLogs.IgnoreQueryFilters().SingleAsync(x => x.LinkId == link.Id);
        var isolated = Channel.CreateBounded<ClickLogEvent>(50000);
        var consumer = new LogConsumerHostedService(isolated, factory.Services.GetRequiredService<IServiceScopeFactory>(),
            new UserAgentParser(), new DefaultGeoLocationResolver(), factory.Services.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>(),
            NullLogger<LogConsumerHostedService>.Instance);
        await consumer.StartAsync(CancellationToken.None);
        Assert.True(isolated.Writer.TryWrite(new ClickLogEvent(link.Id, link.WorkspaceId, old.IpAddress, old.UserAgent, null,
            DateTime.UtcNow, null, null, null, null, null)));
        using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        await consumer.StopAsync(stop.Token);
        await WaitForAsync(async context => await context.LinkAccessLogs.IgnoreQueryFilters().CountAsync(x => x.LinkId == link.Id) == 2);
        await using var verify = await factory.CreateDbContextAsync();
        var updated = await verify.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
        Assert.Equal((ulong)2, updated.TotalClicks);
        Assert.Equal((ulong)1, updated.TotalUniqueVisitors);
        consumer.Dispose();
    }

    [Fact]
    public async Task Consumer_DeduplicatesVisitors_AndExcludesBots()
    {
        var link = await AddLinkAsync();
        using var client = Client();
        for (var i = 0; i < 3; i++)
        {
            using var response = await client.GetAsync("/" + link.Slug);
            Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        }
        using var botRequest = new HttpRequestMessage(HttpMethod.Get, "/" + link.Slug);
        botRequest.Headers.UserAgent.ParseAdd("Googlebot/2.1");
        using var botResponse = await client.SendAsync(botRequest);
        Assert.Equal(HttpStatusCode.Redirect, botResponse.StatusCode);
        await WaitForAsync(async db => await db.LinkAccessLogs.IgnoreQueryFilters().CountAsync(x => x.LinkId == link.Id) == 4);
        await using var verify = await factory.CreateDbContextAsync();
        var logs = await verify.LinkAccessLogs.IgnoreQueryFilters().Where(x => x.LinkId == link.Id).ToListAsync();
        Assert.Single(logs, x => x.IsBot && x.BotName == "Googlebot");
        var updated = await verify.ShortLinks.IgnoreQueryFilters().SingleAsync(x => x.Id == link.Id);
        Assert.Equal((ulong)3, updated.TotalClicks);
        Assert.Equal((ulong)1, updated.TotalUniqueVisitors);
    }

    private async Task WaitForAsync(Func<Arturia.ShortLink.Infrastructure.Persistence.AppDbContext, Task<bool>> condition)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        while (!timeout.IsCancellationRequested)
        {
            await using var db = await factory.CreateDbContextAsync();
            if (await condition(db)) return;
            await Task.Delay(100, timeout.Token);
        }
        Assert.Fail("后台消费未在规定时间内完成。");
    }
}

public sealed class ChannelWriterTests
{
    [Fact]
    public void FullChannel_DropsWithoutBlocking()
    {
        var channel = Channel.CreateBounded<ClickLogEvent>(1);
        var writer = new ChannelLogWriter(channel);
        var evt = new ClickLogEvent(1, 1, "127.0.0.1", null, null, DateTime.UtcNow, null, null, null, null, null);
        Assert.True(writer.TryWrite(evt));
        Assert.False(writer.TryWrite(evt));
        Assert.Equal(1, writer.DroppedEventsCount);
    }
}

internal static class HeaderTestExtensions
{
    public static IEnumerable<string> GetValuesOrEmpty(this System.Net.Http.Headers.HttpResponseHeaders headers, string name) =>
        headers.TryGetValues(name, out var values) ? values : [];
}
