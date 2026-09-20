using Arturia.ShortLink.Application.Links.Dtos;

namespace Arturia.ShortLink.Application.Links.Interfaces;

public interface IBase62Generator
{
    string Generate(int length = 6);
}

public interface IRiskControlService
{
    Task ValidateOriginalUrlAsync(string originalUrl, CancellationToken cancellationToken);
    Task<bool> IsReservedSlugAsync(string slug, CancellationToken cancellationToken);
    void InvalidateCache();
}

public interface ILinkService
{
    Task<PageResultDto<ShortLinkItemDto>> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? domain,
        bool? isEnabled,
        CancellationToken cancellationToken);
    Task<ShortLinkItemDto> CreateAsync(ulong createdBy, CreateLinkDto request, CancellationToken cancellationToken);
    Task<CheckSlugResultDto> CheckSlugAsync(string domain, string slug, ulong? excludeId, CancellationToken cancellationToken);
    Task<ShortLinkItemDto> UpdateAsync(ulong id, ulong actorUserId, UpdateLinkDto request, CancellationToken cancellationToken);
    Task<ShortLinkItemDto> ToggleStatusAsync(ulong id, ulong actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(ulong id, ulong actorUserId, CancellationToken cancellationToken);
    Task<ShortLinkItemDto> BanAsync(ulong id, ulong actorUserId, BanLinkDto request, CancellationToken cancellationToken);
}
