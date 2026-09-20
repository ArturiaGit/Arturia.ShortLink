using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Application.Links.Dtos;
using Arturia.ShortLink.Application.Links.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Arturia.ShortLink.Api.Extensions;
using Microsoft.AspNetCore.RateLimiting;

namespace Arturia.ShortLink.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/links")]
public sealed class LinksController(ILinkService linkService, ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PageResultDto<ShortLinkItemDto>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? domain = null,
        [FromQuery] bool? isEnabled = null,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PageResultDto<ShortLinkItemDto>>.Ok(
            await linkService.ListAsync(page, pageSize, search, domain, isEnabled, cancellationToken)));

    [HttpGet("check-slug")]
    public async Task<ActionResult<ApiResponse<CheckSlugResultDto>>> CheckSlug(
        [FromQuery] string domain,
        [FromQuery] string slug,
        [FromQuery] ulong? excludeId,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<CheckSlugResultDto>.Ok(await linkService.CheckSlugAsync(domain, slug, excludeId, cancellationToken)));

    [HttpPost]
    [EnableRateLimiting(RateLimiterExtensions.LinkCreatePolicy)]
    public async Task<ActionResult<ApiResponse<ShortLinkItemDto>>> Create(CreateLinkDto request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new UnauthorizedException();
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<ShortLinkItemDto>.Ok(await linkService.CreateAsync(userId, request, cancellationToken)));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<ShortLinkItemDto>>> Update(ulong id, UpdateLinkDto request, CancellationToken cancellationToken) =>
        Ok(ApiResponse<ShortLinkItemDto>.Ok(await linkService.UpdateAsync(id, RequireUserId(), request, cancellationToken)));

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApiResponse<ShortLinkItemDto>>> ToggleStatus(ulong id, CancellationToken cancellationToken) =>
        Ok(ApiResponse<ShortLinkItemDto>.Ok(await linkService.ToggleStatusAsync(id, RequireUserId(), cancellationToken)));

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(ulong id, CancellationToken cancellationToken)
    {
        await linkService.DeleteAsync(id, RequireUserId(), cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }));
    }

    [Authorize(Policy = "JwtOnly")]
    [HttpPatch("{id}/ban")]
    public async Task<ActionResult<ApiResponse<ShortLinkItemDto>>> Ban(ulong id, BanLinkDto request, CancellationToken cancellationToken) =>
        Ok(ApiResponse<ShortLinkItemDto>.Ok(await linkService.BanAsync(id, RequireUserId(), request, cancellationToken)));

    private ulong RequireUserId() => currentUserService.UserId ?? throw new UnauthorizedException();
}
