namespace Arturia.ShortLink.Application.Auth.Dtos;

public sealed record LoginRequest(string Email, string Password);
public sealed record RegisterRequest(string Email, string Password, string Nickname);
public sealed record UserDto(string Id, string Email, string Nickname, string? AvatarUrl);
public sealed record WorkspaceDto(string Id, string Name, string Slug, string Role);
public sealed record AuthResponseDto(string Token, UserDto User, IReadOnlyList<WorkspaceDto> Workspaces);
public sealed record AuthMeResponseDto(UserDto User, IReadOnlyList<WorkspaceDto> Workspaces);
