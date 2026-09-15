using Arturia.ShortLink.Api.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class ExceptionMiddlewareTests
{
    [Fact]
    public async Task ExceptionDetailsAndCredentialsAreNotLoggedOrReturned()
    {
        const string sensitive = "Password=secret-value;Authorization=Bearer secret-token";
        var logger = new RecordingLogger<ApiExceptionMiddleware>();
        var middleware = new ApiExceptionMiddleware(_ => throw new InvalidOperationException(sensitive), logger);
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/test";
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);
        context.Response.Body.Position = 0;
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync(CancellationToken.None);

        Assert.Equal(500, context.Response.StatusCode);
        Assert.DoesNotContain("secret-value", body, StringComparison.Ordinal);
        Assert.DoesNotContain("secret-token", body, StringComparison.Ordinal);
        Assert.DoesNotContain("secret-value", logger.Output, StringComparison.Ordinal);
        Assert.DoesNotContain("secret-token", logger.Output, StringComparison.Ordinal);
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public string Output { get; private set; } = string.Empty;
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) => Output += formatter(state, exception);
    }
}
