using System.Security.Claims;
using Arturia.ShortLink.Domain.Interfaces;

namespace Arturia.ShortLink.Api.Services;

public sealed class CurrentUserService(IHttpContextAccessor accessor) : ICurrentUserService
{
    public ulong? UserId => ulong.TryParse(accessor.HttpContext?.User.FindFirstValue("sub"), out var id) ? id : null;
    public string? Email => accessor.HttpContext?.User.FindFirstValue("email");
}
