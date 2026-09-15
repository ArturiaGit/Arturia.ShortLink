using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.MySql;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class MySqlDatabaseTests
{
    [Fact]
    public async Task InitialMigrationCreatesFrozenSchemaAndIdempotentSeeds()
    {
        var password = $"T-{Guid.NewGuid():N}";
        using var startupTimeout = new CancellationTokenSource(TimeSpan.FromMinutes(2));
        await using var container = new MySqlBuilder("mysql:8.0.46")
            .WithDatabase("arturia_test")
            .WithUsername("arturia_test")
            .WithPassword(password)
            .Build();
        await container.StartAsync(startupTimeout.Token);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(container.GetConnectionString(), ServerVersion.Parse("8.0.46-mysql"))
            .AddInterceptors(new UtcConnectionInterceptor())
            .Options;
        await using var context = new AppDbContext(options, new TestWorkspaceContext(null));
        var initializer = new DbInitializer(context);

        await initializer.InitializeAsync(applyMigrations: true, seedDemoData: true, CancellationToken.None);
        await initializer.InitializeAsync(applyMigrations: true, seedDemoData: true, CancellationToken.None);

        Assert.Equal("+00:00", await ScalarAsync<string>(context, "SELECT @@session.time_zone"));
        Assert.Equal(10, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '__EFMigrationsHistory'"));
        Assert.Equal(4, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND extra LIKE '%STORED GENERATED%'"));
        Assert.Equal(18, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND constraint_type = 'CHECK'"));
        Assert.Equal(32, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND column_type LIKE '%unsigned%'"));
        Assert.Equal(8, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND collation_name = 'ascii_bin'"));
        Assert.Equal(8, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND column_name = 'updated_at' AND extra LIKE '%on update CURRENT_TIMESTAMP%'"));
        Assert.Equal(49, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM (SELECT DISTINCT table_name, index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name <> '__EFMigrationsHistory') indexes_actual"));
        Assert.Equal(0, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name LIKE 'IX\\_%'"));
        Assert.Equal(16, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()"));
        Assert.Equal(
            new[] { "link_access_log:22", "link_domain:8", "risk_rule:11", "short_link:27", "sys_api_key:9", "sys_user:8", "sys_workspace:9", "sys_workspace_member:6", "workspace_domain:9", "workspace_invitation:14" },
            await QueryStringsAsync(context, "SELECT CONCAT(table_name, ':', COUNT(*)) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name <> '__EFMigrationsHistory' GROUP BY table_name ORDER BY table_name"));
        Assert.Equal(
            new[]
            {
                "link_access_log:fk_log_workspace_link:workspace_id,link_id:short_link:workspace_id,id:RESTRICT",
                "risk_rule:fk_risk_rule_creator:created_by:sys_user:id:SET NULL",
                "short_link:fk_link_banner:banned_by:sys_user:id:SET NULL",
                "short_link:fk_link_creator:created_by:sys_user:id:RESTRICT",
                "short_link:fk_link_deleter:deleted_by:sys_user:id:SET NULL",
                "short_link:fk_link_workspace_domain:workspace_id,domain_id:workspace_domain:workspace_id,domain_id:RESTRICT",
                "sys_api_key:fk_api_key_creator:created_by:sys_user:id:RESTRICT",
                "sys_api_key:fk_api_key_workspace:workspace_id:sys_workspace:id:CASCADE",
                "sys_workspace:fk_workspace_creator:created_by:sys_user:id:RESTRICT",
                "sys_workspace_member:fk_member_user:user_id:sys_user:id:CASCADE",
                "sys_workspace_member:fk_member_workspace:workspace_id:sys_workspace:id:CASCADE",
                "workspace_domain:fk_binding_domain_type:domain_id,is_system:link_domain:id,is_system:RESTRICT",
                "workspace_domain:fk_binding_workspace:workspace_id:sys_workspace:id:RESTRICT",
                "workspace_invitation:fk_invitation_acceptor:accepted_by:sys_user:id:SET NULL",
                "workspace_invitation:fk_invitation_inviter:invited_by:sys_user:id:RESTRICT",
                "workspace_invitation:fk_invitation_workspace:workspace_id:sys_workspace:id:CASCADE"
            },
            await QueryStringsAsync(context, "SELECT CONCAT(k.table_name, ':', k.constraint_name, ':', GROUP_CONCAT(k.column_name ORDER BY k.ordinal_position), ':', k.referenced_table_name, ':', GROUP_CONCAT(k.referenced_column_name ORDER BY k.ordinal_position), ':', r.delete_rule) FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r ON r.constraint_schema = k.constraint_schema AND r.constraint_name = k.constraint_name WHERE k.constraint_schema = DATABASE() GROUP BY k.table_name, k.constraint_name, k.referenced_table_name, r.delete_rule ORDER BY k.table_name, k.constraint_name"));
        Assert.Equal(2, await context.Users.CountAsync());
        Assert.All(await context.Users.AsNoTracking().ToListAsync(), user => Assert.Equal(DateTimeKind.Utc, user.CreatedAt.Kind));
        Assert.Equal(2, await context.Workspaces.CountAsync());
        Assert.Equal(3, await context.ShortLinks.IgnoreQueryFilters().CountAsync());
        Assert.Equal(33, await context.RiskRules.CountAsync());
        Assert.All(await context.Users.ToListAsync(), user => Assert.True(BCrypt.Net.BCrypt.Verify("password123!", user.PasswordHash)));

        await context.Database.ExecuteSqlRawAsync("DELETE FROM risk_rule WHERE id = 33");
        await context.Database.ExecuteSqlRawAsync("DELETE FROM sys_workspace_member WHERE id = 3");
        context.ChangeTracker.Clear();
        await initializer.InitializeAsync(applyMigrations: true, seedDemoData: true, CancellationToken.None);
        Assert.Equal(33, await context.RiskRules.CountAsync());
        Assert.Equal(3, await ScalarAsync<int>(context, "SELECT COUNT(*) FROM sys_workspace_member"));

        await Assert.ThrowsAnyAsync<Exception>(() => context.Database.ExecuteSqlRawAsync(
            "INSERT INTO short_link (id, workspace_id, domain_id, slug, original_url, created_by) VALUES (99, 2, 1, 'github-repo', 'https://example.com/conflict', 1)"));
        context.ChangeTracker.Clear();

        await context.Database.ExecuteSqlRawAsync(
            "INSERT INTO short_link (id, workspace_id, domain_id, slug, original_url, created_by) VALUES (100, 1, 2, 'github-repo', 'https://example.com/other-domain', 1)");
        await context.Database.ExecuteSqlRawAsync(
            "INSERT INTO short_link (id, workspace_id, domain_id, slug, original_url, created_by) VALUES (101, 2, 1, 'GitHub-repo', 'https://example.com/case-sensitive', 1)");
        await context.Database.ExecuteSqlRawAsync("UPDATE short_link SET deleted_at = UTC_TIMESTAMP(6), deleted_by = 1 WHERE id = 1");
        await context.Database.ExecuteSqlRawAsync(
            "INSERT INTO short_link (id, workspace_id, domain_id, slug, original_url, created_by) VALUES (102, 2, 1, 'github-repo', 'https://example.com/reused', 1)");
        await context.Database.ExecuteSqlRawAsync("INSERT INTO workspace_invitation (id, workspace_id, email, token_hash, expires_at, invited_by) VALUES (1, 1, 'one@example.test', REPEAT('a',64), UTC_TIMESTAMP(6), 1), (2, 2, 'two@example.test', REPEAT('b',64), UTC_TIMESTAMP(6), 1)");
        await context.Database.ExecuteSqlRawAsync("INSERT INTO sys_api_key (id, workspace_id, name, key_prefix, key_hash, created_by) VALUES (1, 1, 'one', 'art_one', REPEAT('c',64), 1), (2, 2, 'two', 'art_two', REPEAT('d',64), 1)");
        await context.Database.ExecuteSqlRawAsync("INSERT INTO link_access_log (id, link_id, workspace_id, visitor_hash) VALUES (1, 2, 1, REPEAT('e',64)), (2, 101, 2, REPEAT('f',64))");

        await using var denied = new AppDbContext(options, new TestWorkspaceContext(null));
        await using var workspaceOne = new AppDbContext(options, new TestWorkspaceContext(1));
        await using var workspaceTwo = new AppDbContext(options, new TestWorkspaceContext(2));
        Assert.Empty(await denied.ShortLinks.ToListAsync());
        Assert.Empty(await denied.WorkspaceMembers.ToListAsync());
        Assert.Empty(await denied.WorkspaceInvitations.ToListAsync());
        Assert.Empty(await denied.WorkspaceDomains.ToListAsync());
        Assert.Empty(await denied.LinkAccessLogs.ToListAsync());
        Assert.Empty(await denied.ApiKeys.ToListAsync());
        Assert.Equal(3, await workspaceOne.ShortLinks.CountAsync());
        Assert.Equal(2, await workspaceTwo.ShortLinks.CountAsync());
        Assert.Single(await workspaceOne.WorkspaceInvitations.ToListAsync());
        Assert.Single(await workspaceTwo.WorkspaceInvitations.ToListAsync());
        Assert.Single(await workspaceOne.ApiKeys.ToListAsync());
        Assert.Single(await workspaceTwo.ApiKeys.ToListAsync());
        Assert.Single(await workspaceOne.LinkAccessLogs.ToListAsync());
        Assert.Single(await workspaceTwo.LinkAccessLogs.ToListAsync());
        Assert.Equal(2, await context.WorkspaceDomains.IgnoreQueryFilters().CountAsync(value => value.DomainId == 1));
    }

    private static async Task<T> ScalarAsync<T>(AppDbContext context, string sql)
    {
        await context.Database.OpenConnectionAsync();
        await using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = sql;
        return (T)Convert.ChangeType((await command.ExecuteScalarAsync())!, typeof(T));
    }

    private static async Task<string[]> QueryStringsAsync(AppDbContext context, string sql)
    {
        await context.Database.OpenConnectionAsync();
        await using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = sql;
        var result = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) result.Add(reader.GetString(0));
        return result.ToArray();
    }
}
