using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class TenantFilterTests
{
    [Fact]
    public void MissingWorkspaceContextDeniesTenantRows()
    {
        using var context = CreateContext(null);
        var query = context.ShortLinks.Where(link => link.Title == "测试").ToQueryString();

        Assert.Contains("workspace_id", query, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("deleted_at", query, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("FALSE", query, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void WorkspaceContextScopesTenantRows()
    {
        using var context = CreateContext(42);
        var query = context.ApiKeys.ToQueryString();

        Assert.Contains("workspace_id", query, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("42", query, StringComparison.Ordinal);
    }

    private static AppDbContext CreateContext(ulong? workspaceId)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql("Server=localhost;Database=filters;User=root;Password=unused", ServerVersion.Parse("8.0.46-mysql"))
            .EnableSensitiveDataLogging()
            .Options;
        return new AppDbContext(options, new TestWorkspaceContext(workspaceId));
    }
}
