namespace Arturia.ShortLink.Domain.Common;

public class BusinessException(string message, int statusCode = 400) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class UnauthorizedException(string message = "未授权访问") : BusinessException(message, 401);
public sealed class ForbiddenException(string message = "无权进行此操作") : BusinessException(message, 403);
public sealed class NotFoundException(string message = "所请求的资源不存在") : BusinessException(message, 404);
public sealed class ConflictException(string message = "资源冲突或已存在") : BusinessException(message, 409);
