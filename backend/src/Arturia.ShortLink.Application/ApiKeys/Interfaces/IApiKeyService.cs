using Arturia.ShortLink.Application.ApiKeys.Dtos;

namespace Arturia.ShortLink.Application.ApiKeys.Interfaces;

public interface IApiKeyService
{
    Task<IReadOnlyList<ApiKeyItemDto>> ListAsync(CancellationToken cancellationToken);
    Task<ApiKeyCreatedResultDto> CreateAsync(
        ulong workspaceId,
        ulong createdBy,
        CreateApiKeyDto request,
        CancellationToken cancellationToken);
    Task DeleteAsync(ulong id, CancellationToken cancellationToken);
}
