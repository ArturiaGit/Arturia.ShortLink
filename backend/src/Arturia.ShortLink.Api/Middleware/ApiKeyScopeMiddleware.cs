using System.Security.Claims;
using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Infrastructure.Authentication;

namespace Arturia.ShortLink.Api.Middleware;

public sealed class ApiKeyScopeMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.FindFirstValue(DualBearerAuthenticationHandler.CredentialTypeClaim) != DualBearerAuthenticationHandler.ApiKeyCredential ||
            IsAllowedLinkRequest(context.Request))
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(403, "API Key 仅允许访问短链管理接口"));
    }

    private static bool IsAllowedLinkRequest(HttpRequest request)
    {
        var path = request.Path.Value?.TrimEnd('/').ToLowerInvariant() ?? string.Empty;
        if (path.Equals("/api/v1/links", StringComparison.OrdinalIgnoreCase))
            return HttpMethods.IsGet(request.Method) || HttpMethods.IsPost(request.Method);
        if (path.Equals("/api/v1/links/check-slug", StringComparison.OrdinalIgnoreCase))
            return HttpMethods.IsGet(request.Method);

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 4 || segments[0] != "api" || segments[1] != "v1" || segments[2] != "links" || !ulong.TryParse(segments[3], out _))
            return false;
        if (segments.Length == 4)
            return HttpMethods.IsPut(request.Method) || HttpMethods.IsDelete(request.Method);
        return segments.Length == 5 && segments[4] == "status" && HttpMethods.IsPatch(request.Method);
    }
}
