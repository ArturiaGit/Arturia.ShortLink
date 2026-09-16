using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Infrastructure;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class ModelMetadataTests
{
    [Fact]
    public void ModelContainsAllFrozenTablesAndGeneratedColumns()
    {
        using var context = CreateContext(new TestWorkspaceContext(1));
        var model = context.Model;

        var tables = model.GetEntityTypes().Select(entity => entity.GetTableName()).ToHashSet();
        Assert.Equal(10, tables.Count);
        Assert.Contains("sys_user", tables);
        Assert.Contains("sys_workspace", tables);
        Assert.Contains("sys_workspace_member", tables);
        Assert.Contains("workspace_invitation", tables);
        Assert.Contains("link_domain", tables);
        Assert.Contains("workspace_domain", tables);
        Assert.Contains("short_link", tables);
        Assert.Contains("link_access_log", tables);
        Assert.Contains("sys_api_key", tables);
        Assert.Contains("risk_rule", tables);

        AssertGenerated(model.FindEntityType(typeof(WorkspaceInvitation))!, nameof(WorkspaceInvitation.PendingEmail));
        AssertGenerated(model.FindEntityType(typeof(WorkspaceDomain))!, nameof(WorkspaceDomain.PrimaryWorkspaceId));
        AssertGenerated(model.FindEntityType(typeof(WorkspaceDomain))!, nameof(WorkspaceDomain.CustomDomainId));
        AssertGenerated(model.FindEntityType(typeof(ShortLinkEntity))!, nameof(ShortLinkEntity.ActiveSlug));
    }

    [Fact]
    public void ShortLinkHasFrozenUniqueIndexAndAsciiSlug()
    {
        using var context = CreateContext(new TestWorkspaceContext(1));
        var entity = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(ShortLinkEntity))!;
        var table = StoreObjectIdentifier.Table("short_link", null);
        var index = Assert.Single(entity.GetIndexes(), value => value.GetDatabaseName() == "uk_domain_active_slug");

        Assert.True(index.IsUnique);
        Assert.Equal([nameof(ShortLinkEntity.DomainId), nameof(ShortLinkEntity.ActiveSlug)], index.Properties.Select(value => value.Name));
        Assert.Equal("ascii_bin", entity.FindProperty(nameof(ShortLinkEntity.Slug))!.GetCollation());
        Assert.Equal("varchar(32)", entity.FindProperty(nameof(ShortLinkEntity.Slug))!.GetColumnType());
        Assert.Equal("slug", entity.FindProperty(nameof(ShortLinkEntity.Slug))!.GetColumnName(table));
    }

    private static AppDbContext CreateContext(IWorkspaceContext workspaceContext)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql("Server=localhost;Database=model;User=root;Password=unused", ServerVersion.Parse("8.0.46-mysql"))
            .Options;
        return new AppDbContext(options, workspaceContext);
    }

    private static void AssertGenerated(Microsoft.EntityFrameworkCore.Metadata.IEntityType entity, string propertyName)
    {
        var property = entity.FindProperty(propertyName)!;
        Assert.NotNull(property.GetComputedColumnSql());
        Assert.True(property.GetIsStored());
    }
}

internal sealed class TestWorkspaceContext(ulong? workspaceId) : IWorkspaceContext
{
    public ulong? CurrentWorkspaceId { get; set; } = workspaceId;
    public string? CurrentRole { get; private set; }
    public void SetContext(ulong workspaceId, string role)
    {
        CurrentWorkspaceId = workspaceId;
        CurrentRole = role;
    }
}
