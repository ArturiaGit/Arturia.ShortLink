namespace Arturia.ShortLink.Application.Common;

public sealed record ApiResponse<T>(int Code, bool Success, string Message, T? Data)
{
    public static ApiResponse<T> Ok(T data, string message = "操作成功") => new(200, true, message, data);
    public static ApiResponse<T> Fail(int code, string message, T? data = default) => new(code, false, message, data);
}

public sealed record PagedData<T>(IReadOnlyList<T> Items, int Page, int PageSize, long Total);
