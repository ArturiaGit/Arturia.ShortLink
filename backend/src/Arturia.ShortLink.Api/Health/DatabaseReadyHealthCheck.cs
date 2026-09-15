using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Arturia.ShortLink.Api.Health;

public sealed class DatabaseReadyHealthCheck(IServiceScopeFactory scopeFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database;
            if (!await database.CanConnectAsync(cancellationToken)) return HealthCheckResult.Unhealthy("MySQL 无法连接。");
            var pending = await database.GetPendingMigrationsAsync(cancellationToken);
            return pending.Any() ? HealthCheckResult.Unhealthy("存在尚未应用的数据库迁移。") : HealthCheckResult.Healthy();
        }
        catch (Exception exception) { return HealthCheckResult.Unhealthy("MySQL 就绪检查失败。", exception); }
    }
}
