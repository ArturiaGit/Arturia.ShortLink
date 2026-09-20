namespace Arturia.ShortLink.Application.Links.Dtos;

public sealed record CreateLinkDto(
    string OriginalUrl,
    string Domain,
    string? Slug = null,
    string? Title = null,
    string? Description = null,
    string? Password = null,
    DateTime? ExpiresAt = null);

public sealed record ShortLinkItemDto(
    string Id,
    string WorkspaceId,
    string Domain,
    string Slug,
    string FullShortUrl,
    string OriginalUrl,
    string Title,
    string Description,
    bool IsEnabled,
    bool IsBanned,
    bool HasPassword,
    DateTime? ExpiresAt,
    ulong PvCount,
    ulong UvCount,
    string CreatedById,
    string CreatorName,
    string CreatorAvatar,
    DateTime CreatedAt);

public sealed record CheckSlugResultDto(bool Available, string Message);

public sealed record UpdateLinkDto(
    string OriginalUrl,
    string? Title,
    string? Description,
    bool HasPassword,
    string? Password,
    DateTime? ExpiresAt);

public sealed record BanLinkDto(bool IsBanned, string? Reason);

public sealed record PageResultDto<T>(
    IReadOnlyList<T> Items,
    long Total,
    int Page,
    int PageSize,
    int TotalPages);
