using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Infrastructure.Persistence;

namespace Arturia.ShortLink.Api.Middleware;

public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (BusinessException exception)
        {
            if (context.Response.HasStarted) throw;
            context.Response.StatusCode = exception.StatusCode;
            await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(exception.StatusCode, exception.Message));
        }
        catch (Exception exception) when (DatabaseErrors.IsConcurrencyConflict(exception))
        {
            logger.LogWarning("请求发生数据库并发冲突。Path={Path}; ErrorType={ErrorType}", context.Request.Path, exception.GetType().Name);
            if (context.Response.HasStarted) throw;
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(409, "资源状态已被并发修改，请重试。"));
        }
        catch (Exception exception)
        {
            logger.LogError("请求处理发生未预期异常。Path={Path}; ErrorType={ErrorType}", context.Request.Path, exception.GetType().Name);
            if (context.Response.HasStarted) throw;
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(500, "服务器内部错误。"));
        }
    }
}
