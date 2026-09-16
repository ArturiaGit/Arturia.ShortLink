using Arturia.ShortLink.Application.Auth.Interfaces;
using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Application.Workspaces.Dtos;
using Arturia.ShortLink.Application.Workspaces.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Arturia.ShortLink.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/workspaces/{workspaceId}/members")]
public sealed class WorkspaceMembersController(IWorkspaceMemberService memberService, ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TeamMemberDto>>>> List(ulong workspaceId, CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<TeamMemberDto>>.Ok(await memberService.ListAsync(workspaceId, cancellationToken)));

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TeamMemberDto>>> Invite(ulong workspaceId, InviteMemberRequest request, CancellationToken cancellationToken)
    {
        var result = await memberService.InviteAsync(workspaceId, RequireUserId(), request, cancellationToken);
        var status = result.Status == "pending" ? StatusCodes.Status202Accepted : StatusCodes.Status201Created;
        return StatusCode(status, ApiResponse<TeamMemberDto>.Ok(result));
    }

    [HttpPut("{memberId}")]
    public async Task<ActionResult<ApiResponse<TeamMemberDto>>> UpdateRole(ulong workspaceId, ulong memberId, UpdateMemberRoleRequest request, CancellationToken cancellationToken) =>
        Ok(ApiResponse<TeamMemberDto>.Ok(await memberService.UpdateRoleAsync(workspaceId, memberId, RequireUserId(), request, cancellationToken)));

    [HttpDelete("{memberId}")]
    public async Task<ActionResult<ApiResponse<object>>> Remove(ulong workspaceId, ulong memberId, CancellationToken cancellationToken)
    {
        await memberService.RemoveAsync(workspaceId, memberId, RequireUserId(), cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }));
    }

    private ulong RequireUserId() => currentUserService.UserId ?? throw new UnauthorizedException();
}
