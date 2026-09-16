using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, IWorkspaceContext workspaceContext)
    : DbContext(options)
{
    public ulong? CurrentWorkspaceId => workspaceContext.CurrentWorkspaceId;

    public DbSet<User> Users => Set<User>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<WorkspaceInvitation> WorkspaceInvitations => Set<WorkspaceInvitation>();
    public DbSet<LinkDomain> LinkDomains => Set<LinkDomain>();
    public DbSet<WorkspaceDomain> WorkspaceDomains => Set<WorkspaceDomain>();
    public DbSet<ShortLinkEntity> ShortLinks => Set<ShortLinkEntity>();
    public DbSet<LinkAccessLog> LinkAccessLogs => Set<LinkAccessLog>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<RiskRule> RiskRules => Set<RiskRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.UseCollation("utf8mb4_unicode_ci");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<WorkspaceMember>().HasQueryFilter(value =>
            CurrentWorkspaceId.HasValue && value.WorkspaceId == CurrentWorkspaceId.GetValueOrDefault());
        modelBuilder.Entity<WorkspaceInvitation>().HasQueryFilter(value =>
            CurrentWorkspaceId.HasValue && value.WorkspaceId == CurrentWorkspaceId.GetValueOrDefault());
        modelBuilder.Entity<WorkspaceDomain>().HasQueryFilter(value =>
            CurrentWorkspaceId.HasValue && value.WorkspaceId == CurrentWorkspaceId.GetValueOrDefault());
        modelBuilder.Entity<ShortLinkEntity>().HasQueryFilter(value =>
            CurrentWorkspaceId.HasValue && value.WorkspaceId == CurrentWorkspaceId.GetValueOrDefault() && value.DeletedAt == null);
        modelBuilder.Entity<LinkAccessLog>().HasQueryFilter(value =>
            CurrentWorkspaceId.HasValue && value.WorkspaceId == CurrentWorkspaceId.GetValueOrDefault());
        modelBuilder.Entity<ApiKey>().HasQueryFilter(value =>
            CurrentWorkspaceId.HasValue && value.WorkspaceId == CurrentWorkspaceId.GetValueOrDefault());

        var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
            value => NormalizeUtc(value),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc));
        var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
            value => value.HasValue ? NormalizeUtc(value.Value) : value,
            value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime)) property.SetValueConverter(dateTimeConverter);
                else if (property.ClrType == typeof(DateTime?)) property.SetValueConverter(nullableDateTimeConverter);
            }
        }
    }

    private static DateTime NormalizeUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}
