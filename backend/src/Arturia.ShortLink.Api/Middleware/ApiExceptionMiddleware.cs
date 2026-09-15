using Arturia.ShortLink.Application.Common;

namespace Arturia.ShortLink.Api.Middleware;

public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (Exception exception)
        {
            logger.LogError("请求处理发生未预期异常。Path={Path}; ErrorType={ErrorType}", context.Request.Path, exception.GetType().Name);
            if (context.Response.HasStarted) throw;
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(500, "服务器内部错误。"));
        }
    }
}
