using System.Globalization;
using System.Text.RegularExpressions;
using Arturia.ShortLink.Application.Links.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class RiskControlService(AppDbContext dbContext, IMemoryCache cache) : IRiskControlService
{
    private const string RulesCacheKey = "risk-control:active-rules";
    private const string DomainsCacheKey = "risk-control:platform-domains";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private static readonly HashSet<string> ReservedSlugs = new(StringComparer.OrdinalIgnoreCase)
    {
        "api", "admin", "login", "register", "dashboard", "settings", "analytics", "domains",
        "links", "workspaces", "members", "invitations", "apikeys", "keys", "unlock", "banned",
        "suspended", "expired", "not-found", "404", "500", "health", "live", "ready", "scalar",
        "swagger", "favicon", "robots", "sitemap"
    };

    public async Task ValidateOriginalUrlAsync(string originalUrl, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(originalUrl, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            throw new BusinessException("目标链接仅支持 http 或 https 协议", 422);

        var host = NormalizeHost(uri.Host);
        var platformDomains = await GetPlatformDomainsAsync(cancellationToken);
        if (platformDomains.Contains(host))
            throw new BusinessException("目标链接不能指向本平台短链域名，以防止循环重定向", 422);

        var rules = await GetRulesAsync(cancellationToken);
        foreach (var rule in rules)
        {
            var matched = rule.RuleType switch
            {
                RiskRuleType.BlockedProtocol => Matches(uri.Scheme, rule.Pattern, rule.MatchType),
                RiskRuleType.BlockedDomain => Matches(host, rule.Pattern, rule.MatchType),
                RiskRuleType.BlockedKeyword => Matches(originalUrl, rule.Pattern, rule.MatchType),
                _ => false
            };
            if (matched)
                throw new BusinessException(string.IsNullOrWhiteSpace(rule.Reason) ? $"链接命中安全风控规则：{rule.DisplayName}" : rule.Reason, 422);
        }
    }

    public async Task<bool> IsReservedSlugAsync(string slug, CancellationToken cancellationToken)
    {
        if (ReservedSlugs.Contains(slug)) return true;
        var rules = await GetRulesAsync(cancellationToken);
        return rules.Any(rule => rule.RuleType == RiskRuleType.ReservedSlug && Matches(slug, rule.Pattern, rule.MatchType));
    }

    public void InvalidateCache()
    {
        cache.Remove(RulesCacheKey);
        cache.Remove(DomainsCacheKey);
    }

    private async Task<IReadOnlyList<RiskRule>> GetRulesAsync(CancellationToken cancellationToken) =>
        (await cache.GetOrCreateAsync(RulesCacheKey, async entry =>
        {
            entry.SetSlidingExpiration(CacheDuration);
            return await dbContext.RiskRules.AsNoTracking().Where(value => value.IsActive).ToListAsync(cancellationToken);
        })) ?? [];

    private async Task<HashSet<string>> GetPlatformDomainsAsync(CancellationToken cancellationToken) =>
        (await cache.GetOrCreateAsync(DomainsCacheKey, async entry =>
        {
            entry.SetSlidingExpiration(CacheDuration);
            var domains = await dbContext.LinkDomains.AsNoTracking().Select(value => value.Domain).ToListAsync(cancellationToken);
            return domains.Select(NormalizeHost).ToHashSet(StringComparer.OrdinalIgnoreCase);
        })) ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    private static string NormalizeHost(string host) => new IdnMapping().GetAscii(host.TrimEnd('.')).ToLowerInvariant();

    private static bool Matches(string input, string pattern, RiskMatchType matchType) => matchType switch
    {
        RiskMatchType.Exact => string.Equals(input, pattern, StringComparison.OrdinalIgnoreCase),
        RiskMatchType.Suffix => input.EndsWith(pattern, StringComparison.OrdinalIgnoreCase),
        RiskMatchType.Contains => input.Contains(pattern, StringComparison.OrdinalIgnoreCase),
        RiskMatchType.Regex => Regex.IsMatch(input, pattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100)),
        _ => false
    };
}
