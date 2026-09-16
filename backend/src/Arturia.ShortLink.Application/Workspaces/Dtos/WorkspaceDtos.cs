namespace Arturia.ShortLink.Application.Workspaces.Dtos;

public sealed record CreateWorkspaceDto(string Name, string Slug);
public sealed record WorkspaceDto(string Id, string Name, string Slug, string Role);
public sealed record CheckSlugResultDto(bool Available, string Message);
public sealed record TeamMemberDto(
    string Id,
    string UserId,
    string Email,
    string Nickname,
    string? AvatarUrl,
    string Role,
    string Status,
    DateTime JoinedAt);
public sealed record InviteMemberRequest(string Email, string Role);
public sealed record UpdateMemberRoleRequest(string Role);
