using Arturia.ShortLink.Application.Auth.Dtos;
using Arturia.ShortLink.Application.Auth.Interfaces;
using Arturia.ShortLink.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Api.Extensions;
using Microsoft.AspNetCore.RateLimiting;

namespace Arturia.ShortLink.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService authService, ICurrentUserService currentUserService) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting(RateLimiterExtensions.AuthUnlockPolicy)]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login(LoginRequest request, CancellationToken cancellationToken) =>
        Ok(ApiResponse<AuthResponseDto>.Ok(await authService.LoginAsync(request, cancellationToken)));

    [AllowAnonymous]
    [EnableRateLimiting(RateLimiterExtensions.AuthUnlockPolicy)]
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register(RegisterRequest request, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, ApiResponse<AuthResponseDto>.Ok(await authService.RegisterAsync(request, cancellationToken)));

    [Authorize(Policy = "JwtOnly")]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<AuthMeResponseDto>>> Me(CancellationToken cancellationToken)
    {
        if (currentUserService.UserId is not { } userId) return Unauthorized(ApiResponse<object>.Fail(401, "未授权访问"));
        return Ok(ApiResponse<AuthMeResponseDto>.Ok(await authService.GetMeAsync(userId, cancellationToken)));
    }
}
