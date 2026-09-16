using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Arturia.ShortLink.Api.Middleware;

public sealed class WorkspaceMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext, IWorkspaceContext workspaceContext, ICurrentUserService currentUserService)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;
        if (IsTenantFreePath(path) || currentUserService.UserId is not { } userId)
        {
            await next(context);
            return;
        }

        var routeWorkspaceId = TryReadRouteWorkspaceId(context.Request.Path);
        ulong? headerWorkspaceId = null;
        if (context.Request.Headers.TryGetValue("X-Workspace-Id", out var header))
        {
            if (!ulong.TryParse(header, out var parsedHeader))
            {
                await WriteFailureAsync(context, 400, "请求头 X-Workspace-Id 无效");
                return;
            }
            headerWorkspaceId = parsedHeader;
        }
        if (routeWorkspaceId.HasValue && headerWorkspaceId.HasValue && routeWorkspaceId != headerWorkspaceId)
        {
            await WriteFailureAsync(context, 400, "请求头 X-Workspace-Id 与路由空间参数冲突");
            return;
        }

        var targetWorkspaceId = routeWorkspaceId ?? headerWorkspaceId;
        // 上下文解析需要跨租户读取当前用户的成员关系，因此绕过过滤并显式补回用户与空间条件。
        var query = dbContext.WorkspaceMembers.IgnoreQueryFilters().Where(value => value.UserId == userId);
        var member = targetWorkspaceId.HasValue
            ? await query.SingleOrDefaultAsync(value => value.WorkspaceId == targetWorkspaceId.Value, context.RequestAborted)
            : await query.OrderBy(value => value.Id).FirstOrDefaultAsync(context.RequestAborted);
        if (member is null)
        {
            await WriteFailureAsync(context, 403, targetWorkspaceId.HasValue ? "无权访问此工作空间" : "未加入任何有效工作空间");
            return;
        }

        workspaceContext.SetContext(member.WorkspaceId, member.Role.ToString().ToLowerInvariant());
        await next(context);
    }

    private static bool IsTenantFreePath(string path) =>
        !path.StartsWith("/api/v1/", StringComparison.Ordinal) ||
        path.StartsWith("/api/v1/auth/", StringComparison.Ordinal) ||
        path.StartsWith("/api/v1/system/", StringComparison.Ordinal) ||
        path == "/api/v1/workspaces" ||
        path == "/api/v1/workspaces/check-slug";

    private static ulong? TryReadRouteWorkspaceId(PathString path)
    {
        var segments = path.Value?.ToLowerInvariant().Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments is { Length: >= 4 } && segments[0] == "api" && segments[1] == "v1" && segments[2] == "workspaces" && ulong.TryParse(segments[3], out var id) ? id : null;
    }

    private static async Task WriteFailureAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(statusCode, message));
    }
}
