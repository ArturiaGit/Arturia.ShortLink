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
[Route("api/v1/workspaces")]
public sealed class WorkspacesController(IWorkspaceService workspaceService, ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkspaceDto>>>> List(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<WorkspaceDto>>.Ok(await workspaceService.ListAsync(RequireUserId(), cancellationToken)));

    [HttpPost]
    public async Task<ActionResult<ApiResponse<WorkspaceDto>>> Create(CreateWorkspaceDto request, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, ApiResponse<WorkspaceDto>.Ok(await workspaceService.CreateAsync(RequireUserId(), request, cancellationToken)));

    [HttpGet("check-slug")]
    public async Task<ActionResult<ApiResponse<CheckSlugResultDto>>> CheckSlug([FromQuery] string slug, CancellationToken cancellationToken) =>
        Ok(ApiResponse<CheckSlugResultDto>.Ok(await workspaceService.CheckSlugAsync(slug, cancellationToken)));

    private ulong RequireUserId() => currentUserService.UserId ?? throw new UnauthorizedException();
}
