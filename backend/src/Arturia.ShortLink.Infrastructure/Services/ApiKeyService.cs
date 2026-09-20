using System.Security.Cryptography;
using System.Text;
using Arturia.ShortLink.Application.ApiKeys.Dtos;
using Arturia.ShortLink.Application.ApiKeys.Interfaces;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Infrastructure.Persistence;
using Arturia.ShortLink.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class ApiKeyService(AppDbContext dbContext) : IApiKeyService
{
    private const string Prefix = "art_live_";
    private const string Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    public async Task<IReadOnlyList<ApiKeyItemDto>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.ApiKeys
            .OrderByDescending(value => value.CreatedAt)
            .Select(value => new ApiKeyItemDto(
                value.Id.ToString(),
                value.Name,
                value.KeyPrefix,
                value.CreatedAt,
                value.LastUsedAt,
                value.ExpiresAt))
            .ToListAsync(cancellationToken);

    public async Task<ApiKeyCreatedResultDto> CreateAsync(
        ulong workspaceId,
        ulong createdBy,
        CreateApiKeyDto request,
        CancellationToken cancellationToken)
    {
        if (request.ExpiresAt is { } expiresAt && expiresAt <= DateTime.UtcNow)
            throw new BusinessException("API Key 到期时间必须晚于当前时间", 422);
        var random = RandomNumberGenerator.GetString(Alphabet, 32);
        var plaintext = Prefix + random;
        var entity = new ApiKey
        {
            WorkspaceId = workspaceId,
            Name = request.Name.Trim(),
            KeyPrefix = Prefix + random[..3],
            KeyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plaintext))).ToLowerInvariant(),
            ExpiresAt = request.ExpiresAt,
            CreatedBy = createdBy
        };
        dbContext.ApiKeys.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new ApiKeyCreatedResultDto(
            entity.Id.ToString(),
            entity.Name,
            entity.KeyPrefix,
            plaintext,
            entity.CreatedAt,
            entity.ExpiresAt);
    }

    public async Task DeleteAsync(ulong id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.ApiKeys.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw new NotFoundException("API Key 不存在");
        dbContext.ApiKeys.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
