using Arturia.ShortLink.Application.Workspaces.Dtos;

namespace Arturia.ShortLink.Application.Workspaces.Interfaces;

public interface IWorkspaceService
{
    Task<IReadOnlyList<WorkspaceDto>> ListAsync(ulong userId, CancellationToken cancellationToken);
    Task<WorkspaceDto> CreateAsync(ulong userId, CreateWorkspaceDto request, CancellationToken cancellationToken);
    Task<CheckSlugResultDto> CheckSlugAsync(string slug, CancellationToken cancellationToken);
}

public interface IWorkspaceMemberService
{
    Task<IReadOnlyList<TeamMemberDto>> ListAsync(ulong workspaceId, CancellationToken cancellationToken);
    Task<TeamMemberDto> InviteAsync(ulong workspaceId, ulong actorUserId, InviteMemberRequest request, CancellationToken cancellationToken);
    Task<TeamMemberDto> UpdateRoleAsync(ulong workspaceId, ulong memberId, ulong actorUserId, UpdateMemberRoleRequest request, CancellationToken cancellationToken);
    Task RemoveAsync(ulong workspaceId, ulong memberId, ulong actorUserId, CancellationToken cancellationToken);
}
