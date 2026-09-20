using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Infrastructure.Authentication;
using Microsoft.AspNetCore.RateLimiting;

namespace Arturia.ShortLink.Api.Extensions;

public static class RateLimiterExtensions
{
    public const string AuthUnlockPolicy = "auth-unlock-limiter";
    public const string LinkCreatePolicy = "link-create-limiter";
    public const string PublicRedirectPolicy = "public-redirect-limiter";

    public static IServiceCollection AddApplicationRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var value)
                    ? value
                    : TimeSpan.FromMinutes(1);
                context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
                await context.HttpContext.Response.WriteAsJsonAsync(
                    ApiResponse<object>.Fail(429, "请求过于频繁，请稍后重试"), cancellationToken);
            };
            options.AddPolicy(AuthUnlockPolicy, context => SlidingWindow(
                $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}", 10));
            options.AddPolicy(LinkCreatePolicy, context =>
            {
                var credentialType = context.User.FindFirstValue(DualBearerAuthenticationHandler.CredentialTypeClaim);
                var subject = credentialType == DualBearerAuthenticationHandler.ApiKeyCredential
                    ? context.User.FindFirstValue(DualBearerAuthenticationHandler.ApiKeyHashClaim)
                    : context.User.FindFirstValue("sub");
                return SlidingWindow($"{credentialType ?? "anonymous"}:{subject ?? "unknown"}", 30);
            });
            options.AddPolicy(PublicRedirectPolicy, context => SlidingWindow(
                $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}", 120));
        });
        return services;
    }

    private static RateLimitPartition<string> SlidingWindow(string partitionKey, int permitLimit) =>
        RateLimitPartition.GetSlidingWindowLimiter(partitionKey, _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 6,
            QueueLimit = 0,
            AutoReplenishment = true
        });
}
