using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Application.Links.Dtos;
using Arturia.ShortLink.Application.Links.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Arturia.ShortLink.Api.Extensions;
using Microsoft.AspNetCore.RateLimiting;
using Arturia.ShortLink.Api.Services;
using Arturia.ShortLink.Infrastructure.Persistence;

namespace Arturia.ShortLink.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/links")]
public sealed class LinksController(ILinkService linkService, ICurrentUserService currentUserService) : ControllerBase
{
    [HttpPost("{slug}/unlock")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimiterExtensions.AuthUnlockPolicy)]
    public async Task<ActionResult<ApiResponse<UnlockLinkResultDto>>> UnlockLink(string slug, UnlockLinkCommand command,
        [FromServices] AppDbContext db, [FromServices] IPasswordTicketService ticketService, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Password))
            return BadRequest(ApiResponse<UnlockLinkResultDto>.Fail(400, "访问密码不能为空"));
        var (domain, link) = await PublicLinkLookup.FindAsync(db, Request.Host, slug, cancellationToken);
        if (domain is null || link is null || link.IsBanned || !link.IsEnabled ||
            link.ExpiresAt is { } expires && expires <= DateTime.UtcNow || string.IsNullOrEmpty(link.PasswordHash))
            return NotFound(ApiResponse<UnlockLinkResultDto>.Fail(404, "短链不存在或已失效"));
        if (!BCrypt.Net.BCrypt.Verify(command.Password, link.PasswordHash))
            return BadRequest(ApiResponse<UnlockLinkResultDto>.Fail(400, "访问密码错误，请重新输入"));
        var ticket = ticketService.GenerateTicket(domain.Id, slug, link.PasswordHash, DateTimeOffset.UtcNow.AddMinutes(30));
        Response.Cookies.Append($"art_pwd_ticket_{slug}", ticket, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsProduction() || Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromMinutes(30)
        });
        return Ok(ApiResponse<UnlockLinkResultDto>.Ok(new UnlockLinkResultDto(link.OriginalUrl, ticket), "解锁成功"));
    }

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
