using Arturia.ShortLink.Domain.Abstractions;
using Arturia.ShortLink.Domain.Enums;

namespace Arturia.ShortLink.Domain.Entities;

public sealed class User
{
    public ulong Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Nickname { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class Workspace
{
    public ulong Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public PlanTier PlanTier { get; set; } = PlanTier.Free;
    public int MaxLinks { get; set; } = 1000;
    public int MaxDomains { get; set; } = 3;
    public ulong CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class WorkspaceMember : IWorkspaceScopedEntity
{
    public ulong Id { get; set; }
    public ulong WorkspaceId { get; set; }
    public ulong UserId { get; set; }
    public WorkspaceRole Role { get; set; } = WorkspaceRole.Member;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class WorkspaceInvitation : IWorkspaceScopedEntity
{
    public ulong Id { get; set; }
    public ulong WorkspaceId { get; set; }
    public string Email { get; set; } = string.Empty;
    public InvitationRole Role { get; set; } = InvitationRole.Member;
    public string TokenHash { get; set; } = string.Empty;
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;
    public DateTime ExpiresAt { get; set; }
    public ulong InvitedBy { get; set; }
    public ulong? AcceptedBy { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? PendingEmail { get; private set; }
}

public sealed class LinkDomain
{
    public ulong Id { get; set; }
    public string Domain { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public bool IsVerified { get; set; }
    public string? VerificationCode { get; set; }
    public SslStatus SslStatus { get; set; } = SslStatus.Pending;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class WorkspaceDomain : IWorkspaceScopedEntity
{
    public ulong Id { get; set; }
    public ulong WorkspaceId { get; set; }
    public ulong DomainId { get; set; }
    public bool IsSystem { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ulong? PrimaryWorkspaceId { get; private set; }
    public ulong? CustomDomainId { get; private set; }
}

public sealed class ShortLink : IWorkspaceScopedEntity
{
    public ulong Id { get; set; }
    public ulong WorkspaceId { get; set; }
    public ulong DomainId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string OriginalUrl { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public bool IsBanned { get; set; }
    public string? PasswordHash { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public string? UtmTerm { get; set; }
    public string? UtmContent { get; set; }
    public ulong TotalClicks { get; set; }
    public ulong TotalUniqueVisitors { get; set; }
    public ulong CreatedBy { get; set; }
    public string? BannedReason { get; set; }
    public ulong? BannedBy { get; set; }
    public DateTime? BannedAt { get; set; }
    public ulong? DeletedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? ActiveSlug { get; private set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class LinkAccessLog : IWorkspaceScopedEntity
{
    public ulong Id { get; set; }
    public ulong LinkId { get; set; }
    public ulong WorkspaceId { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string VisitorHash { get; set; } = string.Empty;
    public string Country { get; set; } = "未知";
    public string Region { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string DeviceType { get; set; } = "桌面端";
    public string Os { get; set; } = string.Empty;
    public string Browser { get; set; } = string.Empty;
    public string Referer { get; set; } = string.Empty;
    public string RefererDomain { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public bool IsBot { get; set; }
    public string BotName { get; set; } = string.Empty;
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public string? UtmTerm { get; set; }
    public string? UtmContent { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class ApiKey : IWorkspaceScopedEntity
{
    public ulong Id { get; set; }
    public ulong WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string KeyPrefix { get; set; } = string.Empty;
    public string KeyHash { get; set; } = string.Empty;
    public DateTime? LastUsedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public ulong CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class RiskRule
{
    public ulong Id { get; set; }
    public RiskRuleType RuleType { get; set; }
    public string Pattern { get; set; } = string.Empty;
    public RiskMatchType MatchType { get; set; } = RiskMatchType.Contains;
    public string DisplayName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Source { get; set; } = "system";
    public bool IsActive { get; set; } = true;
    public ulong? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
