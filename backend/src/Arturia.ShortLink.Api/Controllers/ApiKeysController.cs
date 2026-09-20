using Arturia.ShortLink.Application.ApiKeys.Dtos;
using Arturia.ShortLink.Application.ApiKeys.Interfaces;
using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Arturia.ShortLink.Api.Controllers;

[ApiController]
[Authorize(Policy = "JwtOnly")]
[Route("api/v1/api-keys")]
public sealed class ApiKeysController(
    IApiKeyService apiKeyService,
    IWorkspaceContext workspaceContext,
    ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ApiKeyItemDto>>>> List(CancellationToken cancellationToken)
    {
        EnsureWorkspaceAdmin();
        return Ok(ApiResponse<IReadOnlyList<ApiKeyItemDto>>.Ok(await apiKeyService.ListAsync(cancellationToken)));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ApiKeyCreatedResultDto>>> Create(
        CreateApiKeyDto request,
        CancellationToken cancellationToken)
    {
        EnsureWorkspaceAdmin();
        var workspaceId = workspaceContext.CurrentWorkspaceId ?? throw new ForbiddenException("缺少工作空间上下文");
        var userId = currentUserService.UserId ?? throw new UnauthorizedException();
        var result = await apiKeyService.CreateAsync(workspaceId, userId, request, cancellationToken);
        Response.Headers.CacheControl = "no-store";
        return StatusCode(StatusCodes.Status201Created, ApiResponse<ApiKeyCreatedResultDto>.Ok(result));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(ulong id, CancellationToken cancellationToken)
    {
        EnsureWorkspaceAdmin();
        await apiKeyService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }));
    }

    private void EnsureWorkspaceAdmin()
    {
        if (workspaceContext.CurrentRole is not ("owner" or "admin"))
            throw new ForbiddenException("仅工作空间所有者或管理员可管理 API Key");
    }
}
