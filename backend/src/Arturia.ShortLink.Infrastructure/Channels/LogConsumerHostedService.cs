using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using Arturia.ShortLink.Application.Common.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Arturia.ShortLink.Infrastructure.Channels;

public sealed class LogConsumerHostedService(
    Channel<ClickLogEvent> channel, IServiceScopeFactory scopes, IUserAgentParser parser,
    IGeoLocationResolver geo, IConfiguration configuration, ILogger<LogConsumerHostedService> logger) : BackgroundService
{
    private readonly ConcurrentDictionary<string, byte> uv = new(StringComparer.Ordinal);
    private readonly byte[] hashSecret = DeriveSecret(configuration);
    private DateOnly currentDay = DateOnly.FromDateTime(DateTime.UtcNow);

    private async Task PreloadAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 3 && !cancellationToken.IsCancellationRequested; attempt++)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var today = DateTime.UtcNow.Date;
                var prior = await db.LinkAccessLogs.IgnoreQueryFilters().AsNoTracking()
                    .Where(x => x.CreatedAt >= today && !x.IsBot)
                    .Select(x => new { x.LinkId, x.VisitorHash, x.CreatedAt }).ToListAsync(cancellationToken);
                foreach (var item in prior)
                    uv.TryAdd(Key(item.LinkId, DateOnly.FromDateTime(item.CreatedAt), item.VisitorHash), 0);
                return;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { return; }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "当日 UV 预热失败，等待数据库恢复后重试");
                await Task.Delay(TimeSpan.FromMilliseconds(200 * (attempt + 1)), cancellationToken);
            }
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await PreloadAsync(stoppingToken);
        if (stoppingToken.IsCancellationRequested) return;
        var batch = new List<ClickLogEvent>(500);
        var batchStart = Stopwatch.GetTimestamp();
        while (!stoppingToken.IsCancellationRequested)
        {
            while (batch.Count < 500 && channel.Reader.TryRead(out var next))
            {
                if (batch.Count == 0) batchStart = Stopwatch.GetTimestamp();
                batch.Add(next);
            }
            if (batch.Count >= 500 || batch.Count > 0 &&
                (channel.Reader.Completion.IsCompleted || Stopwatch.GetElapsedTime(batchStart) >= TimeSpan.FromSeconds(2)))
            {
                await FlushAsync(batch);
                batch.Clear();
                continue;
            }
            if (channel.Reader.Completion.IsCompleted) break;
            try
            {
                using var wait = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                var remainingTime = batch.Count == 0 ? TimeSpan.FromSeconds(2) :
                    TimeSpan.FromSeconds(2) - Stopwatch.GetElapsedTime(batchStart);
                wait.CancelAfter(remainingTime > TimeSpan.Zero ? remainingTime : TimeSpan.FromMilliseconds(1));
                if (!await channel.Reader.WaitToReadAsync(wait.Token)) break;
                RotateDay();
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (OperationCanceledException) { RotateDay(); }
        }
        while (channel.Reader.TryRead(out var remaining))
        {
            batch.Add(remaining);
            if (batch.Count < 500) continue;
            await FlushAsync(batch);
            batch.Clear();
        }
        if (batch.Count > 0) await FlushAsync(batch);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        channel.Writer.TryComplete();
        if (ExecuteTask is { } task)
        {
            try { await task.WaitAsync(cancellationToken); }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning("日志消费者停机超时，剩余事件未完成刷盘");
            }
        }
        await base.StopAsync(cancellationToken);
    }

    private async Task FlushAsync(List<ClickLogEvent> events)
    {
        // 失败重试复用同一批事件，UV 键仅在数据库提交成功后才进入内存集合。
        for (var attempt = 0; attempt < 4; attempt++)
        {
            try
            {
                await PersistAsync(events);
                return;
            }
            catch (Exception exception) when (attempt < 3)
            {
                logger.LogWarning(exception, "日志批次写入失败，将进行第 {Attempt} 次重试", attempt + 1);
                await Task.Delay(TimeSpan.FromMilliseconds(50 * (1 << attempt)));
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "日志批次重试耗尽，丢弃 {Count} 条事件", events.Count);
            }
        }
    }

    private async Task PersistAsync(List<ClickLogEvent> events)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rules = await db.RiskRules.AsNoTracking().Where(x => x.IsActive && x.RuleType == RiskRuleType.BotUserAgent).ToListAsync();
        var pendingUv = new HashSet<string>(StringComparer.Ordinal);
        var totals = new Dictionary<ulong, (int Pv, int Uv)>();
        var rows = new List<LinkAccessLog>(events.Count);
        foreach (var evt in events)
        {
            var agent = evt.UserAgent ?? string.Empty;
            var bot = rules.FirstOrDefault(rule => Matches(agent, rule));
            var day = DateOnly.FromDateTime(evt.CreatedAtUtc);
            var hash = HashVisitor(evt.IpAddress, agent, day);
            var key = Key(evt.LinkId, day, hash);
            var isNew = bot is null && !uv.ContainsKey(key) && pendingUv.Add(key);
            if (bot is null)
            {
                totals.TryGetValue(evt.LinkId, out var count);
                totals[evt.LinkId] = (count.Pv + 1, count.Uv + (isNew ? 1 : 0));
            }
            var ua = parser.Parse(agent);
            GeoLocationResult location;
            try
            {
                using var timeout = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));
                location = await geo.ResolveAsync(evt.IpAddress, timeout.Token).AsTask().WaitAsync(timeout.Token);
            }
            catch (Exception exception) when (exception is not OutOfMemoryException)
            {
                location = new GeoLocationResult("未知", "", "");
            }
            rows.Add(new LinkAccessLog
            {
                LinkId = evt.LinkId,
                WorkspaceId = evt.WorkspaceId,
                IpAddress = Limit(evt.IpAddress, 64),
                VisitorHash = hash,
                UserAgent = Limit(agent, 512),
                Referer = Limit(evt.Referer, 512),
                RefererDomain = Uri.TryCreate(evt.Referer, UriKind.Absolute, out var referer) ? Limit(referer.Host, 128) : "",
                Country = Limit(location.Country, 64),
                Region = Limit(location.Region, 64),
                City = Limit(location.City, 64),
                DeviceType = ua.DeviceType,
                Os = ua.Os,
                Browser = ua.Browser,
                IsBot = bot is not null,
                BotName = bot?.DisplayName ?? "",
                UtmSource = LimitNullable(evt.UtmSource, 128),
                UtmMedium = LimitNullable(evt.UtmMedium, 128),
                UtmCampaign = LimitNullable(evt.UtmCampaign, 128),
                UtmTerm = LimitNullable(evt.UtmTerm, 128),
                UtmContent = LimitNullable(evt.UtmContent, 128),
                CreatedAt = evt.CreatedAtUtc
            });
        }
        await using var transaction = await db.Database.BeginTransactionAsync();
        db.LinkAccessLogs.AddRange(rows);
        await db.SaveChangesAsync();
        foreach (var (linkId, delta) in totals)
            await db.ShortLinks.IgnoreQueryFilters().Where(x => x.Id == linkId)
                .ExecuteUpdateAsync(set => set.SetProperty(x => x.TotalClicks, x => x.TotalClicks + (ulong)delta.Pv)
                    .SetProperty(x => x.TotalUniqueVisitors, x => x.TotalUniqueVisitors + (ulong)delta.Uv));
        await transaction.CommitAsync();
        foreach (var key in pendingUv) uv.TryAdd(key, 0);
    }

    private void RotateDay()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (today == currentDay) return;
        currentDay = today;
        foreach (var key in uv.Keys)
            if (!key.Contains($":{today:yyyyMMdd}:", StringComparison.Ordinal)) uv.TryRemove(key, out _);
    }

    private string HashVisitor(string ip, string agent, DateOnly date)
    {
        var daily = HMACSHA256.HashData(hashSecret, Encoding.UTF8.GetBytes(date.ToString("yyyy-MM-dd")));
        var address = IPAddress.TryParse(ip, out var parsed)
            ? (parsed.IsIPv4MappedToIPv6 ? parsed.MapToIPv4() : parsed).GetAddressBytes()
            : IPAddress.None.GetAddressBytes();
        var ua = Encoding.UTF8.GetBytes(agent);
        var bytes = new byte[address.Length + ua.Length];
        address.CopyTo(bytes, 0);
        ua.CopyTo(bytes, address.Length);
        return Convert.ToHexStringLower(HMACSHA256.HashData(daily, bytes));
    }

    private static byte[] DeriveSecret(IConfiguration config)
    {
        var master = config["ShortLink:VisitorHashSecret"] ?? config["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("必须配置访客哈希密钥。");
        if (Encoding.UTF8.GetByteCount(master) < 32) throw new InvalidOperationException("访客哈希密钥至少需要 32 字节。");
        return HMACSHA256.HashData(Encoding.UTF8.GetBytes(master), Encoding.UTF8.GetBytes("shortlink-visitor-hash-v1"));
    }

    private static bool Matches(string agent, RiskRule rule)
    {
        try
        {
            return rule.MatchType switch
            {
                RiskMatchType.Exact => agent.Equals(rule.Pattern, StringComparison.OrdinalIgnoreCase),
                RiskMatchType.Suffix => agent.EndsWith(rule.Pattern, StringComparison.OrdinalIgnoreCase),
                RiskMatchType.Contains => agent.Contains(rule.Pattern, StringComparison.OrdinalIgnoreCase),
                RiskMatchType.Regex => Regex.IsMatch(agent, rule.Pattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(50)),
                _ => false
            };
        }
        catch (RegexMatchTimeoutException) { return false; }
        catch (ArgumentException) { return false; }
    }

    private static string Key(ulong linkId, DateOnly date, string hash) => $"uv:{linkId}:{date:yyyyMMdd}:{hash}";
    private static string Limit(string? value, int max) => value is null ? "" : value[..Math.Min(value.Length, max)];
    private static string? LimitNullable(string? value, int max) => value is null ? null : Limit(value, max);
}
