namespace Arturia.ShortLink.Application.ApiKeys.Dtos;

public sealed record CreateApiKeyDto(string Name, DateTime? ExpiresAt);

public sealed record ApiKeyItemDto(
    string Id,
    string Name,
    string KeyPrefix,
    DateTime CreatedAt,
    DateTime? LastUsedAt,
    DateTime? ExpiresAt);

public sealed record ApiKeyCreatedResultDto(
    string Id,
    string Name,
    string KeyPrefix,
    string ApiKey,
    DateTime CreatedAt,
    DateTime? ExpiresAt);
