using System.Net;
using System.Text.Json;
using System.Text;
using System.Threading.Channels;
using Arturia.ShortLink.Api.Health;
using Arturia.ShortLink.Api.Middleware;
using Arturia.ShortLink.Api.Serialization;
using Arturia.ShortLink.Application.Common;
using Arturia.ShortLink.Application.Auth.Interfaces;
using Arturia.ShortLink.Application.Auth.Validators;
using Arturia.ShortLink.Api.Services;
using Arturia.ShortLink.Infrastructure.Persistence;
using Arturia.ShortLink.Infrastructure.Security;
using Arturia.ShortLink.Infrastructure.Services;
using Arturia.ShortLink.Application.Workspaces.Interfaces;
using Arturia.ShortLink.Application.ApiKeys.Interfaces;
using Arturia.ShortLink.Application.Links.Interfaces;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Infrastructure.Context;
using Arturia.ShortLink.Infrastructure.Authentication;
using Arturia.ShortLink.Api.Extensions;
using Arturia.ShortLink.Application.Common.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Infrastructure.Channels;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
    options.JsonSerializerOptions.Converters.Add(new NullableUtcDateTimeJsonConverter());
});
builder.Services.Configure<ApiBehaviorOptions>(options => options.InvalidModelStateResponseFactory = context =>
{
    var errors = context.ModelState
        .Where(value => value.Value?.Errors.Count > 0)
        .ToDictionary(
            value => string.IsNullOrEmpty(value.Key) ? "request" : char.ToLowerInvariant(value.Key[0]) + value.Key[1..],
            value => value.Value!.Errors.Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage) ? "请求参数无效。" : error.ErrorMessage).ToArray());
    return new BadRequestObjectResult(ApiResponse<object>.Fail(400, "请求参数验证失败。", new { errors }));
});
builder.Services.AddOpenApi("v1");
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IWorkspaceService, WorkspaceService>();
builder.Services.AddScoped<IWorkspaceMemberService, WorkspaceMemberService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();
builder.Services.AddScoped<ILinkService, LinkService>();
builder.Services.AddScoped<IRiskControlService, RiskControlService>();
builder.Services.AddSingleton<IBase62Generator, Base62Generator>();
builder.Services.AddMemoryCache();
builder.Services.AddApplicationRateLimiting();
builder.Services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton(Channel.CreateBounded<ClickLogEvent>(new BoundedChannelOptions(50000)
{
    FullMode = BoundedChannelFullMode.Wait,
    SingleReader = true,
    SingleWriter = false
}));
builder.Services.AddSingleton<IChannelLogWriter, ChannelLogWriter>();
builder.Services.AddSingleton<IPasswordTicketService, PasswordTicketService>();
builder.Services.AddSingleton<IUserAgentParser, UserAgentParser>();
builder.Services.AddSingleton<IGeoLocationResolver, DefaultGeoLocationResolver>();
builder.Services.AddHostedService<LogConsumerHostedService>();
builder.Services.AddOptions<JwtOptions>().Bind(builder.Configuration.GetSection(JwtOptions.SectionName)).Validate(options =>
    Encoding.UTF8.GetByteCount(options.SecretKey) >= 32 && !string.IsNullOrWhiteSpace(options.Issuer) && !string.IsNullOrWhiteSpace(options.Audience),
    "JWT 配置无效。SecretKey 至少需要 32 字节，Issuer 与 Audience 不得为空。").ValidateOnStart();
builder.Services.AddAuthentication(DualBearerAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, DualBearerAuthenticationHandler>(DualBearerAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization(options => options.AddPolicy("JwtOnly", policy => policy
    .RequireAuthenticatedUser()
    .RequireClaim(DualBearerAuthenticationHandler.CredentialTypeClaim, DualBearerAuthenticationHandler.JwtCredential)));
builder.Services.AddScoped<IWorkspaceContext, WorkspaceContext>();
builder.Services.AddSingleton<UtcConnectionInterceptor>();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("缺少数据库连接配置 ConnectionStrings:DefaultConnection。");
builder.Services.AddDbContext<AppDbContext>((services, options) => options
    .UseMySql(connectionString, ServerVersion.Parse("8.0.46-mysql"))
    .AddInterceptors(services.GetRequiredService<UtcConnectionInterceptor>()));
builder.Services.AddScoped<DbInitializer>();
builder.Services.AddHealthChecks().AddCheck<DatabaseReadyHealthCheck>("mysql-ready", tags: ["ready"]);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    var proxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [];
    var networks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [];
    if (proxies.Length > 0 || networks.Length > 0)
    {
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        foreach (var address in proxies)
        {
            if (!IPAddress.TryParse(address, out var proxy)) throw new InvalidOperationException("ForwardedHeaders:KnownProxies 包含无效 IP。");
            options.KnownProxies.Add(proxy);
        }
        foreach (var cidr in networks)
        {
            if (!System.Net.IPNetwork.TryParse(cidr, out var network)) throw new InvalidOperationException("ForwardedHeaders:KnownNetworks 包含无效 CIDR。");
            options.KnownIPNetworks.Add(network);
        }
    }
});
builder.Services.AddCors(options => options.AddPolicy("DevelopmentVite", policy => policy
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseForwardedHeaders();
if (app.Environment.IsDevelopment()) app.UseCors("DevelopmentVite");
app.UseRouting();
app.UseStatusCodePages(async statusContext =>
{
    var context = statusContext.HttpContext;
    if (context.Request.Path.StartsWithSegments("/api/v1"))
    {
        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(context.Response.StatusCode, "请求处理失败。"));
    }
});
app.UseAuthentication();
app.UseMiddleware<ApiKeyScopeMiddleware>();
if (!(app.Environment.IsEnvironment("Testing") && app.Configuration.GetValue<bool>("RateLimiting:DisabledForTesting")))
    app.UseRateLimiter();
app.UseMiddleware<WorkspaceMiddleware>();
app.UseAuthorization();
app.MapOpenApi("/openapi/{documentName}.json");
app.MapScalarApiReference("/scalar/v1", options => options.WithOpenApiRoutePattern("/openapi/v1.json"));
app.MapGet("/health/live", () => Results.Ok())
    .WithName("GetLiveHealth")
    .Produces(StatusCodes.Status200OK);
app.MapGet("/health/ready", async (HealthCheckService healthChecks, CancellationToken cancellationToken) =>
    {
        var report = await healthChecks.CheckHealthAsync(check => check.Tags.Contains("ready"), cancellationToken);
        return report.Status == HealthStatus.Healthy ? Results.Ok() : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    })
    .WithName("GetReadyHealth")
    .Produces(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status503ServiceUnavailable);
app.MapControllers();

var autoMigrate = app.Configuration.GetValue<bool>("Database:AutoMigrate");
var seedDemoData = app.Configuration.GetValue<bool>("Database:SeedDemoData");
if (seedDemoData && !(app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing")))
{
    throw new InvalidOperationException("演示种子只允许在 Development 或 Testing 环境启用。");
}
if (autoMigrate || seedDemoData)
{
    await using var scope = app.Services.CreateAsyncScope();
    var initializer = scope.ServiceProvider.GetRequiredService<DbInitializer>();
    await initializer.InitializeAsync(autoMigrate, seedDemoData);
}

app.Run();

public partial class Program;
