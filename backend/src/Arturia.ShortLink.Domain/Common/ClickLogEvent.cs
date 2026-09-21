namespace Arturia.ShortLink.Domain.Common;

public sealed record ClickLogEvent(
    ulong LinkId, ulong WorkspaceId, string IpAddress, string? UserAgent, string? Referer,
    DateTime CreatedAtUtc, string? UtmSource, string? UtmMedium, string? UtmCampaign,
    string? UtmTerm, string? UtmContent);
