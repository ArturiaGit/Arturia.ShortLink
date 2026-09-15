using System.Data;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.Infrastructure.Persistence;

public sealed class DbInitializer(AppDbContext context)
{
    public async Task InitializeAsync(bool applyMigrations, bool seedDemoData, CancellationToken cancellationToken = default)
    {
        if (applyMigrations) await context.Database.MigrateAsync(cancellationToken);
        if (!seedDemoData) return;

        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        await SeedUsersAsync(cancellationToken);
        await SeedWorkspacesAsync(cancellationToken);
        await SeedMembersAsync(cancellationToken);
        await SeedDomainsAsync(cancellationToken);
        await SeedDomainBindingsAsync(cancellationToken);
        await SeedLinksAsync(cancellationToken);
        await SeedRiskRulesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private async Task SeedUsersAsync(CancellationToken cancellationToken)
    {
        var existing = await ExistingIdsAsync("sys_user", cancellationToken, 1, 2);
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("password123!", workFactor: 11);
        var rows = new[]
        {
            new User { Id = 1, Email = "admin@arturia.link", PasswordHash = passwordHash, Nickname = "Arturia 管理员", AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop" },
            new User { Id = 2, Email = "member@arturia.link", PasswordHash = passwordHash, Nickname = "业务协作者" }
        };
        context.Users.AddRange(rows.Where(row => !existing.Contains(row.Id)));
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedWorkspacesAsync(CancellationToken cancellationToken)
    {
        var existing = await ExistingIdsAsync("sys_workspace", cancellationToken, 1, 2);
        var rows = new[]
        {
            new Workspace { Id = 1, Name = "Arturia 官方团队", Slug = "arturia-core", PlanTier = PlanTier.Pro, MaxLinks = 5000, MaxDomains = 10, CreatedBy = 1 },
            new Workspace { Id = 2, Name = "市场增长实验室", Slug = "growth-lab", CreatedBy = 1 }
        };
        context.Workspaces.AddRange(rows.Where(row => !existing.Contains(row.Id)));
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedMembersAsync(CancellationToken cancellationToken)
    {
        var existing = await ExistingIdsAsync("sys_workspace_member", cancellationToken, 1, 2, 3);
        var rows = new[]
        {
            new WorkspaceMember { Id = 1, WorkspaceId = 1, UserId = 1, Role = WorkspaceRole.Owner },
            new WorkspaceMember { Id = 2, WorkspaceId = 2, UserId = 1, Role = WorkspaceRole.Owner },
            new WorkspaceMember { Id = 3, WorkspaceId = 1, UserId = 2, Role = WorkspaceRole.Member }
        };
        context.WorkspaceMembers.AddRange(rows.Where(row => !existing.Contains(row.Id)));
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedDomainsAsync(CancellationToken cancellationToken)
    {
        var existing = await ExistingIdsAsync("link_domain", cancellationToken, 1, 2);
        var rows = new[]
        {
            new LinkDomain { Id = 1, Domain = "art.link", IsSystem = true, IsVerified = true, SslStatus = SslStatus.Active },
            new LinkDomain { Id = 2, Domain = "go.arturia.dev", IsVerified = true, VerificationCode = "cname-verify-98124", SslStatus = SslStatus.Active }
        };
        context.LinkDomains.AddRange(rows.Where(row => !existing.Contains(row.Id)));
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedDomainBindingsAsync(CancellationToken cancellationToken)
    {
        var existing = await ExistingIdsAsync("workspace_domain", cancellationToken, 1, 2, 3);
        var rows = new[]
        {
            new WorkspaceDomain { Id = 1, WorkspaceId = 1, DomainId = 1, IsSystem = true, IsPrimary = true },
            new WorkspaceDomain { Id = 2, WorkspaceId = 1, DomainId = 2 },
            new WorkspaceDomain { Id = 3, WorkspaceId = 2, DomainId = 1, IsSystem = true, IsPrimary = true }
        };
        context.WorkspaceDomains.AddRange(rows.Where(row => !existing.Contains(row.Id)));
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedLinksAsync(CancellationToken cancellationToken)
    {
        var existing = await ExistingIdsAsync("short_link", cancellationToken, 1, 2, 3);
        var rows = new[]
        {
            Link(1, 1, "github-repo", "https://github.com/dotnet/aspnetcore", "ASP.NET Core 官方主页", "微软官方开源高性能 Web 框架仓库", "newsletter", "banner", "dotnet10_launch", 3482, 2190),
            Link(2, 1, "summer-sale", "https://store.steampowered.com/sale/special", "2026 夏季促销主会场", "年度游戏特惠专题活动分发入口", "twitter", "social", "summer26", 15200, 8940),
            Link(3, 2, "api-docs", "https://learn.microsoft.com/aspnet/core", "开发文档与快速入门", "内部团队与外部开发者技术手册", "direct", "docs", "v2", 892, 610)
        };
        context.ShortLinks.AddRange(rows.Where(row => !existing.Contains(row.Id)));
        await context.SaveChangesAsync(cancellationToken);

        static ShortLinkEntity Link(ulong id, ulong domainId, string slug, string url, string title, string description, string source, string medium, string campaign, ulong clicks, ulong visitors) =>
            new() { Id = id, WorkspaceId = 1, DomainId = domainId, Slug = slug, OriginalUrl = url, Title = title, Description = description, UtmSource = source, UtmMedium = medium, UtmCampaign = campaign, TotalClicks = clicks, TotalUniqueVisitors = visitors, CreatedBy = 1 };
    }

    private async Task SeedRiskRulesAsync(CancellationToken cancellationToken)
    {
        var rows = new (RiskRuleType Type, string Pattern, RiskMatchType Match, string Name)[]
        {
            (RiskRuleType.BlockedDomain, "malware.test", RiskMatchType.Exact, "恶意域名示例"),
            (RiskRuleType.BlockedDomain, ".phishing.test", RiskMatchType.Suffix, "钓鱼域名示例"),
            (RiskRuleType.BlockedKeyword, "钓鱼", RiskMatchType.Contains, "钓鱼关键词"),
            (RiskRuleType.ReservedSlug, "api", RiskMatchType.Exact, "系统API路由"),
            (RiskRuleType.ReservedSlug, "login", RiskMatchType.Exact, "登录路由"),
            (RiskRuleType.ReservedSlug, "admin", RiskMatchType.Exact, "管理路由"),
            (RiskRuleType.ReservedSlug, "health", RiskMatchType.Exact, "健康检查路由"),
            (RiskRuleType.ReservedSlug, "scalar", RiskMatchType.Exact, "API文档路由"),
            (RiskRuleType.ReservedSlug, "openapi", RiskMatchType.Exact, "OpenAPI路由"),
            (RiskRuleType.ReservedSlug, "unlock", RiskMatchType.Exact, "密码解锁路由"),
            (RiskRuleType.ReservedSlug, "suspended", RiskMatchType.Exact, "停用提示路由"),
            (RiskRuleType.ReservedSlug, "expired", RiskMatchType.Exact, "过期提示路由"),
            (RiskRuleType.ReservedSlug, "banned", RiskMatchType.Exact, "封禁提示路由"),
            (RiskRuleType.BotUserAgent, "Googlebot", RiskMatchType.Contains, "Googlebot"),
            (RiskRuleType.BotUserAgent, "Baiduspider", RiskMatchType.Contains, "Baiduspider"),
            (RiskRuleType.BotUserAgent, "bingbot", RiskMatchType.Contains, "Bingbot"),
            (RiskRuleType.BotUserAgent, "facebookexternalhit", RiskMatchType.Contains, "Facebook Preview"),
            (RiskRuleType.BotUserAgent, "Twitterbot", RiskMatchType.Contains, "Twitter Preview"),
            (RiskRuleType.ReservedSlug, "register", RiskMatchType.Exact, "注册路由"),
            (RiskRuleType.ReservedSlug, "dashboard", RiskMatchType.Exact, "控制台首页路由"),
            (RiskRuleType.ReservedSlug, "links", RiskMatchType.Exact, "短链管理路由"),
            (RiskRuleType.ReservedSlug, "analytics", RiskMatchType.Exact, "分析路由"),
            (RiskRuleType.ReservedSlug, "domains", RiskMatchType.Exact, "域名路由"),
            (RiskRuleType.ReservedSlug, "team", RiskMatchType.Exact, "团队路由"),
            (RiskRuleType.ReservedSlug, "settings", RiskMatchType.Exact, "设置路由"),
            (RiskRuleType.ReservedSlug, "assets", RiskMatchType.Exact, "静态资源路由"),
            (RiskRuleType.ReservedSlug, "404", RiskMatchType.Exact, "未找到状态页路由"),
            (RiskRuleType.BlockedProtocol, "javascript", RiskMatchType.Exact, "JavaScript伪协议"),
            (RiskRuleType.BlockedProtocol, "data", RiskMatchType.Exact, "Data伪协议"),
            (RiskRuleType.BlockedProtocol, "file", RiskMatchType.Exact, "File本地协议"),
            (RiskRuleType.BlockedProtocol, "vbscript", RiskMatchType.Exact, "VBScript伪协议"),
            (RiskRuleType.BlockedDomain, "art.link", RiskMatchType.Exact, "系统域名自环"),
            (RiskRuleType.BlockedDomain, "go.arturia.dev", RiskMatchType.Exact, "自定义域名自环示例")
        };
        var existing = await ExistingIdsAsync("risk_rule", cancellationToken, Enumerable.Range(1, rows.Length).Select(value => (ulong)value).ToArray());
        context.RiskRules.AddRange(rows.Select((row, index) => new RiskRule { Id = (ulong)index + 1, RuleType = row.Type, Pattern = row.Pattern, MatchType = row.Match, DisplayName = row.Name }).Where(row => !existing.Contains(row.Id)));
        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task<HashSet<ulong>> ExistingIdsAsync(string tableName, CancellationToken cancellationToken, params ulong[] ids)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose) await connection.OpenAsync(cancellationToken);
        try
        {
            await using var command = connection.CreateCommand();
            command.Transaction = context.Database.CurrentTransaction?.GetDbTransaction();
            command.CommandText = $"SELECT `id` FROM `{tableName}` WHERE `id` IN ({string.Join(',', ids)})";
            var result = new HashSet<ulong>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken)) result.Add(reader.GetFieldValue<ulong>(0));
            return result;
        }
        finally
        {
            if (shouldClose) await connection.CloseAsync();
        }
    }
}
