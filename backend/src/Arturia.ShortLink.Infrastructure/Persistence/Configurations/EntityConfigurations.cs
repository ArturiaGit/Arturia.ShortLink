using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.Infrastructure.Persistence.Configurations;

internal static class ConfigurationExtensions
{
    public static PropertyBuilder<DateTime> CreatedAt(this PropertyBuilder<DateTime> property) =>
        property.HasColumnName("created_at").HasColumnType("datetime(6)").HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

    public static PropertyBuilder<DateTime> UpdatedAt(this PropertyBuilder<DateTime> property) =>
        property.HasColumnName("updated_at").HasColumnType("datetime(6)")
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)")
            .ValueGeneratedOnAddOrUpdate();

    public static PropertyBuilder<T> Unsigned<T>(this PropertyBuilder<T> property, string name) =>
        property.HasColumnName(name).HasColumnType("bigint unsigned");

    public static PropertyBuilder<T?> NullableUnsigned<T>(this PropertyBuilder<T?> property, string name) where T : struct =>
        property.HasColumnName(name).HasColumnType("bigint unsigned");
}

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("sys_user", table => table.HasCheckConstraint("chk_user_status", "`status` IN (0, 1)"));
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.Email).HasColumnName("email").HasMaxLength(128).IsRequired();
        builder.Property(value => value.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
        builder.Property(value => value.Nickname).HasColumnName("nickname").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(512).HasDefaultValue("").IsRequired();
        builder.Property(value => value.IsActive).HasColumnName("status").HasColumnType("tinyint").HasDefaultValue(true);
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.HasIndex(value => value.Email).IsUnique().HasDatabaseName("uk_email");
    }
}

public sealed class WorkspaceConfiguration : IEntityTypeConfiguration<Workspace>
{
    public void Configure(EntityTypeBuilder<Workspace> builder)
    {
        builder.ToTable("sys_workspace", table => table.HasCheckConstraint("chk_workspace_slug", "`slug` REGEXP '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$'"));
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.Name).HasColumnName("name").HasMaxLength(64).IsRequired();
        builder.Property(value => value.Slug).HasColumnName("slug").HasMaxLength(64).IsRequired();
        builder.Property(value => value.PlanTier).HasColumnName("plan_tier").HasMaxLength(32).HasDefaultValue(PlanTier.Free).HasSentinel((PlanTier)(-1)).HasConversion(value => value.ToString().ToLowerInvariant(), value => Enum.Parse<PlanTier>(value, true));
        builder.Property(value => value.MaxLinks).HasColumnName("max_links").HasDefaultValue(1000);
        builder.Property(value => value.MaxDomains).HasColumnName("max_domains").HasDefaultValue(3);
        builder.Property(value => value.CreatedBy).Unsigned("created_by");
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.HasIndex(value => value.Slug).IsUnique().HasDatabaseName("uk_slug");
        builder.HasIndex(value => value.CreatedBy).HasDatabaseName("idx_created_by");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.CreatedBy).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_workspace_creator");
    }
}

public sealed class WorkspaceMemberConfiguration : IEntityTypeConfiguration<WorkspaceMember>
{
    public void Configure(EntityTypeBuilder<WorkspaceMember> builder)
    {
        builder.ToTable("sys_workspace_member", table => table.HasCheckConstraint("chk_member_role", "`role` IN ('owner', 'admin', 'member')"));
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.WorkspaceId).Unsigned("workspace_id");
        builder.Property(value => value.UserId).Unsigned("user_id");
        builder.Property(value => value.Role).HasColumnName("role").HasMaxLength(32).HasDefaultValue(WorkspaceRole.Member).HasSentinel((WorkspaceRole)(-1)).HasConversion(value => value.ToString().ToLowerInvariant(), value => Enum.Parse<WorkspaceRole>(value, true));
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.HasIndex(value => new { value.WorkspaceId, value.UserId }).IsUnique().HasDatabaseName("uk_ws_user");
        builder.HasIndex(value => new { value.UserId, value.WorkspaceId }).HasDatabaseName("idx_user_ws");
        builder.HasOne<Workspace>().WithMany().HasForeignKey(value => value.WorkspaceId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("fk_member_workspace");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.UserId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("fk_member_user");
    }
}

public sealed class WorkspaceInvitationConfiguration : IEntityTypeConfiguration<WorkspaceInvitation>
{
    public void Configure(EntityTypeBuilder<WorkspaceInvitation> builder)
    {
        builder.ToTable("workspace_invitation", table =>
        {
            table.HasCheckConstraint("chk_invitation_role", "`role` IN ('admin', 'member')");
            table.HasCheckConstraint("chk_invitation_status", "`status` IN ('pending', 'accepted', 'expired', 'revoked')");
        });
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.WorkspaceId).Unsigned("workspace_id");
        builder.Property(value => value.Email).HasColumnName("email").HasMaxLength(128).IsRequired();
        builder.Property(value => value.Role).HasColumnName("role").HasMaxLength(32).HasDefaultValue(InvitationRole.Member).HasSentinel((InvitationRole)(-1)).HasConversion(value => value.ToString().ToLowerInvariant(), value => Enum.Parse<InvitationRole>(value, true));
        builder.Property(value => value.TokenHash).HasColumnName("token_hash").HasColumnType("char(64)").UseCollation("ascii_bin").IsRequired();
        builder.Property(value => value.Status).HasColumnName("status").HasMaxLength(32).HasDefaultValue(InvitationStatus.Pending).HasSentinel((InvitationStatus)(-1)).HasConversion(value => value.ToString().ToLowerInvariant(), value => Enum.Parse<InvitationStatus>(value, true));
        builder.Property(value => value.ExpiresAt).HasColumnName("expires_at").HasColumnType("datetime(6)");
        builder.Property(value => value.InvitedBy).Unsigned("invited_by");
        builder.Property(value => value.AcceptedBy).NullableUnsigned("accepted_by");
        builder.Property(value => value.AcceptedAt).HasColumnName("accepted_at").HasColumnType("datetime(6)");
        builder.Property(value => value.RevokedAt).HasColumnName("revoked_at").HasColumnType("datetime(6)");
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.Property(value => value.PendingEmail).HasColumnName("pending_email").HasMaxLength(128).HasComputedColumnSql("CASE WHEN `status` = 'pending' THEN LOWER(`email`) ELSE NULL END", true);
        builder.HasIndex(value => value.TokenHash).IsUnique().HasDatabaseName("uk_invitation_token_hash");
        builder.HasIndex(value => new { value.WorkspaceId, value.PendingEmail }).IsUnique().HasDatabaseName("uk_ws_pending_email");
        builder.HasIndex(value => new { value.Email, value.Status, value.ExpiresAt }).HasDatabaseName("idx_invitation_email_status");
        builder.HasIndex(value => value.InvitedBy).HasDatabaseName("fk_invitation_inviter");
        builder.HasIndex(value => value.AcceptedBy).HasDatabaseName("fk_invitation_acceptor");
        builder.HasOne<Workspace>().WithMany().HasForeignKey(value => value.WorkspaceId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("fk_invitation_workspace");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.InvitedBy).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_invitation_inviter");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.AcceptedBy).OnDelete(DeleteBehavior.SetNull).HasConstraintName("fk_invitation_acceptor");
    }
}

public sealed class LinkDomainConfiguration : IEntityTypeConfiguration<LinkDomain>
{
    public void Configure(EntityTypeBuilder<LinkDomain> builder)
    {
        builder.ToTable("link_domain", table =>
        {
            table.HasCheckConstraint("chk_domain_normalized", "CHAR_LENGTH(`domain`) BETWEEN 1 AND 253 AND `domain` = LOWER(`domain`) AND `domain` NOT LIKE '%://%' AND `domain` NOT LIKE '%/%' AND `domain` NOT LIKE '%:%' AND RIGHT(`domain`, 1) <> '.'");
            table.HasCheckConstraint("chk_domain_ssl_status", "`ssl_status` IN ('Active', 'Pending', 'Error')");
            table.HasCheckConstraint("chk_domain_is_system", "`is_system` IN (0, 1)");
            table.HasCheckConstraint("chk_domain_is_verified", "`is_verified` IN (0, 1)");
        });
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.Domain).HasColumnName("domain").HasMaxLength(253).UseCollation("ascii_bin").IsRequired();
        builder.Property(value => value.IsSystem).HasColumnName("is_system").HasColumnType("tinyint(1)").HasDefaultValue(false);
        builder.Property(value => value.IsVerified).HasColumnName("is_verified").HasColumnType("tinyint(1)").HasDefaultValue(false);
        builder.Property(value => value.VerificationCode).HasColumnName("verification_code").HasMaxLength(64).UseCollation("ascii_bin");
        builder.Property(value => value.SslStatus).HasColumnName("ssl_status").HasMaxLength(32).HasDefaultValue(SslStatus.Pending).HasSentinel((SslStatus)(-1)).HasConversion(value => value.ToString(), value => Enum.Parse<SslStatus>(value, true));
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.HasIndex(value => value.Domain).IsUnique().HasDatabaseName("uk_domain");
        builder.HasAlternateKey(value => new { value.Id, value.IsSystem }).HasName("uk_domain_id_system");
        builder.HasIndex(value => value.VerificationCode).IsUnique().HasDatabaseName("uk_domain_verification_code");
    }
}

public sealed class WorkspaceDomainConfiguration : IEntityTypeConfiguration<WorkspaceDomain>
{
    public void Configure(EntityTypeBuilder<WorkspaceDomain> builder)
    {
        builder.ToTable("workspace_domain", table =>
        {
            table.HasCheckConstraint("chk_binding_is_system", "`is_system` IN (0, 1)");
            table.HasCheckConstraint("chk_binding_is_primary", "`is_primary` IN (0, 1)");
        });
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.WorkspaceId).Unsigned("workspace_id");
        builder.Property(value => value.DomainId).Unsigned("domain_id");
        builder.Property(value => value.IsSystem).HasColumnName("is_system").HasColumnType("tinyint(1)");
        builder.Property(value => value.IsPrimary).HasColumnName("is_primary").HasColumnType("tinyint(1)").HasDefaultValue(false);
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.Property(value => value.PrimaryWorkspaceId).NullableUnsigned("primary_workspace_id").HasComputedColumnSql("CASE WHEN `is_primary` = 1 THEN `workspace_id` ELSE NULL END", true);
        builder.Property(value => value.CustomDomainId).NullableUnsigned("custom_domain_id").HasComputedColumnSql("CASE WHEN `is_system` = 0 THEN `domain_id` ELSE NULL END", true);
        builder.HasAlternateKey(value => new { value.WorkspaceId, value.DomainId }).HasName("uk_ws_domain");
        builder.HasIndex(value => value.PrimaryWorkspaceId).IsUnique().HasDatabaseName("uk_primary_workspace");
        builder.HasIndex(value => value.CustomDomainId).IsUnique().HasDatabaseName("uk_custom_domain_owner");
        builder.HasIndex(value => value.DomainId).HasDatabaseName("idx_binding_domain");
        builder.HasIndex(value => new { value.DomainId, value.IsSystem }).HasDatabaseName("fk_binding_domain_type");
        builder.HasOne<Workspace>().WithMany().HasForeignKey(value => value.WorkspaceId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_binding_workspace");
        builder.HasOne<LinkDomain>().WithMany().HasForeignKey(value => new { value.DomainId, value.IsSystem }).HasPrincipalKey(value => new { value.Id, value.IsSystem }).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_binding_domain_type");
    }
}

public sealed class ShortLinkConfiguration : IEntityTypeConfiguration<ShortLinkEntity>
{
    public void Configure(EntityTypeBuilder<ShortLinkEntity> builder)
    {
        builder.ToTable("short_link", table =>
        {
            table.HasCheckConstraint("chk_link_slug", "`slug` REGEXP '^[0-9A-Za-z_-]{3,32}$'");
            table.HasCheckConstraint("chk_link_is_enabled", "`is_enabled` IN (0, 1)");
            table.HasCheckConstraint("chk_link_is_banned", "`is_banned` IN (0, 1)");
        });
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.WorkspaceId).Unsigned("workspace_id");
        builder.Property(value => value.DomainId).Unsigned("domain_id");
        builder.Property(value => value.Slug).HasColumnName("slug").HasColumnType("varchar(32)").UseCollation("ascii_bin").IsRequired();
        builder.Property(value => value.OriginalUrl).HasColumnName("original_url").HasMaxLength(2048).IsRequired();
        builder.Property(value => value.Title).HasColumnName("title").HasMaxLength(255).HasDefaultValue("").IsRequired();
        builder.Property(value => value.Description).HasColumnName("description").HasMaxLength(512).HasDefaultValue("").IsRequired();
        builder.Property(value => value.IsEnabled).HasColumnName("is_enabled").HasColumnType("tinyint(1)").HasDefaultValue(true);
        builder.Property(value => value.IsBanned).HasColumnName("is_banned").HasColumnType("tinyint(1)").HasDefaultValue(false);
        builder.Property(value => value.PasswordHash).HasColumnName("password_hash").HasMaxLength(255);
        builder.Property(value => value.ExpiresAt).HasColumnName("expires_at").HasColumnType("datetime(6)");
        builder.Property(value => value.UtmSource).HasColumnName("utm_source").HasMaxLength(128);
        builder.Property(value => value.UtmMedium).HasColumnName("utm_medium").HasMaxLength(128);
        builder.Property(value => value.UtmCampaign).HasColumnName("utm_campaign").HasMaxLength(128);
        builder.Property(value => value.UtmTerm).HasColumnName("utm_term").HasMaxLength(128);
        builder.Property(value => value.UtmContent).HasColumnName("utm_content").HasMaxLength(128);
        builder.Property(value => value.TotalClicks).Unsigned("total_clicks").HasDefaultValue(0ul);
        builder.Property(value => value.TotalUniqueVisitors).Unsigned("total_unique_visitors").HasDefaultValue(0ul);
        builder.Property(value => value.CreatedBy).Unsigned("created_by");
        builder.Property(value => value.BannedReason).HasColumnName("banned_reason").HasMaxLength(512);
        builder.Property(value => value.BannedBy).NullableUnsigned("banned_by");
        builder.Property(value => value.BannedAt).HasColumnName("banned_at").HasColumnType("datetime(6)");
        builder.Property(value => value.DeletedBy).NullableUnsigned("deleted_by");
        builder.Property(value => value.DeletedAt).HasColumnName("deleted_at").HasColumnType("datetime(6)");
        builder.Property(value => value.ActiveSlug).HasColumnName("active_slug").HasColumnType("varchar(32)").UseCollation("ascii_bin").HasComputedColumnSql("CASE WHEN `deleted_at` IS NULL THEN `slug` ELSE NULL END", true);
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.HasIndex(value => new { value.DomainId, value.ActiveSlug }).IsUnique().HasDatabaseName("uk_domain_active_slug");
        builder.HasAlternateKey(value => new { value.WorkspaceId, value.Id }).HasName("uk_workspace_link");
        builder.HasIndex(value => new { value.WorkspaceId, value.IsEnabled, value.CreatedAt }).HasDatabaseName("idx_ws_enabled_created");
        builder.HasIndex(value => new { value.WorkspaceId, value.IsBanned, value.CreatedAt }).HasDatabaseName("idx_ws_banned_created");
        builder.HasIndex(value => value.CreatedBy).HasDatabaseName("idx_created_by");
        builder.HasIndex(value => value.DeletedAt).HasDatabaseName("idx_deleted_at");
        builder.HasIndex(value => new { value.WorkspaceId, value.DomainId }).HasDatabaseName("fk_link_workspace_domain");
        builder.HasIndex(value => value.BannedBy).HasDatabaseName("fk_link_banner");
        builder.HasIndex(value => value.DeletedBy).HasDatabaseName("fk_link_deleter");
        builder.HasOne<WorkspaceDomain>().WithMany().HasForeignKey(value => new { value.WorkspaceId, value.DomainId }).HasPrincipalKey(value => new { value.WorkspaceId, value.DomainId }).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_link_workspace_domain");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.CreatedBy).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_link_creator");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.BannedBy).OnDelete(DeleteBehavior.SetNull).HasConstraintName("fk_link_banner");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.DeletedBy).OnDelete(DeleteBehavior.SetNull).HasConstraintName("fk_link_deleter");
    }
}

public sealed class LinkAccessLogConfiguration : IEntityTypeConfiguration<LinkAccessLog>
{
    public void Configure(EntityTypeBuilder<LinkAccessLog> builder)
    {
        builder.ToTable("link_access_log", table => table.HasCheckConstraint("chk_log_is_bot", "`is_bot` IN (0, 1)"));
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.LinkId).Unsigned("link_id");
        builder.Property(value => value.WorkspaceId).Unsigned("workspace_id");
        builder.Property(value => value.IpAddress).HasColumnName("ip_address").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.VisitorHash).HasColumnName("visitor_hash").HasColumnType("char(64)").UseCollation("ascii_bin").IsRequired();
        builder.Property(value => value.Country).HasColumnName("country").HasMaxLength(64).HasDefaultValue("未知").IsRequired();
        builder.Property(value => value.Region).HasColumnName("region").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.City).HasColumnName("city").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.DeviceType).HasColumnName("device_type").HasMaxLength(32).HasDefaultValue("桌面端").IsRequired();
        builder.Property(value => value.Os).HasColumnName("os").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.Browser).HasColumnName("browser").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.Referer).HasColumnName("referer").HasMaxLength(512).HasDefaultValue("").IsRequired();
        builder.Property(value => value.RefererDomain).HasColumnName("referer_domain").HasMaxLength(128).HasDefaultValue("").IsRequired();
        builder.Property(value => value.UserAgent).HasColumnName("user_agent").HasMaxLength(512).HasDefaultValue("").IsRequired();
        builder.Property(value => value.IsBot).HasColumnName("is_bot").HasColumnType("tinyint(1)").HasDefaultValue(false);
        builder.Property(value => value.BotName).HasColumnName("bot_name").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.UtmSource).HasColumnName("utm_source").HasMaxLength(128);
        builder.Property(value => value.UtmMedium).HasColumnName("utm_medium").HasMaxLength(128);
        builder.Property(value => value.UtmCampaign).HasColumnName("utm_campaign").HasMaxLength(128);
        builder.Property(value => value.UtmTerm).HasColumnName("utm_term").HasMaxLength(128);
        builder.Property(value => value.UtmContent).HasColumnName("utm_content").HasMaxLength(128);
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.HasIndex(value => new { value.LinkId, value.CreatedAt }).HasDatabaseName("idx_link_time");
        builder.HasIndex(value => new { value.WorkspaceId, value.CreatedAt }).HasDatabaseName("idx_ws_time");
        builder.HasIndex(value => new { value.WorkspaceId, value.IsBot, value.CreatedAt }).HasDatabaseName("idx_ws_bot_time");
        builder.HasIndex(value => new { value.LinkId, value.VisitorHash, value.CreatedAt }).HasDatabaseName("idx_link_visitor_time");
        builder.HasIndex(value => new { value.WorkspaceId, value.UtmCampaign, value.CreatedAt }).HasDatabaseName("idx_utm_campaign_time");
        builder.HasIndex(value => new { value.WorkspaceId, value.LinkId }).HasDatabaseName("fk_log_workspace_link");
        builder.HasOne<ShortLinkEntity>().WithMany().HasForeignKey(value => new { value.WorkspaceId, value.LinkId }).HasPrincipalKey(value => new { value.WorkspaceId, value.Id }).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_log_workspace_link");
    }
}

public sealed class ApiKeyConfiguration : IEntityTypeConfiguration<ApiKey>
{
    public void Configure(EntityTypeBuilder<ApiKey> builder)
    {
        builder.ToTable("sys_api_key");
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.WorkspaceId).Unsigned("workspace_id");
        builder.Property(value => value.Name).HasColumnName("name").HasMaxLength(64).IsRequired();
        builder.Property(value => value.KeyPrefix).HasColumnName("key_prefix").HasMaxLength(16).UseCollation("ascii_bin").IsRequired();
        builder.Property(value => value.KeyHash).HasColumnName("key_hash").HasColumnType("char(64)").UseCollation("ascii_bin").IsRequired();
        builder.Property(value => value.LastUsedAt).HasColumnName("last_used_at").HasColumnType("datetime(6)");
        builder.Property(value => value.ExpiresAt).HasColumnName("expires_at").HasColumnType("datetime(6)");
        builder.Property(value => value.CreatedBy).Unsigned("created_by");
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.HasIndex(value => value.KeyHash).IsUnique().HasDatabaseName("uk_key_hash");
        builder.HasIndex(value => new { value.WorkspaceId, value.CreatedAt }).HasDatabaseName("idx_ws_created");
        builder.HasIndex(value => value.CreatedBy).HasDatabaseName("fk_api_key_creator");
        builder.HasOne<Workspace>().WithMany().HasForeignKey(value => value.WorkspaceId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("fk_api_key_workspace");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.CreatedBy).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_api_key_creator");
    }
}

public sealed class RiskRuleConfiguration : IEntityTypeConfiguration<RiskRule>
{
    public void Configure(EntityTypeBuilder<RiskRule> builder)
    {
        builder.ToTable("risk_rule", table =>
        {
            table.HasCheckConstraint("chk_risk_rule_type", "`rule_type` IN ('blocked_protocol', 'blocked_domain', 'blocked_keyword', 'reserved_slug', 'bot_user_agent')");
            table.HasCheckConstraint("chk_risk_match_type", "`match_type` IN ('exact', 'suffix', 'contains', 'regex')");
            table.HasCheckConstraint("chk_risk_is_active", "`is_active` IN (0, 1)");
        });
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).Unsigned("id").ValueGeneratedOnAdd();
        builder.Property(value => value.RuleType).HasColumnName("rule_type").HasMaxLength(32).HasConversion(value => ToSnakeCase(value.ToString()), value => Enum.Parse<RiskRuleType>(value.Replace("_", "", StringComparison.Ordinal), true));
        builder.Property(value => value.Pattern).HasColumnName("pattern").HasMaxLength(512).IsRequired();
        builder.Property(value => value.MatchType).HasColumnName("match_type").HasMaxLength(32).HasDefaultValue(RiskMatchType.Contains).HasSentinel((RiskMatchType)(-1)).HasConversion(value => value.ToString().ToLowerInvariant(), value => Enum.Parse<RiskMatchType>(value, true));
        builder.Property(value => value.DisplayName).HasColumnName("display_name").HasMaxLength(64).HasDefaultValue("").IsRequired();
        builder.Property(value => value.Reason).HasColumnName("reason").HasMaxLength(512).HasDefaultValue("").IsRequired();
        builder.Property(value => value.Source).HasColumnName("source").HasMaxLength(64).HasDefaultValue("system").IsRequired();
        builder.Property(value => value.IsActive).HasColumnName("is_active").HasColumnType("tinyint(1)").HasDefaultValue(true);
        builder.Property(value => value.CreatedBy).NullableUnsigned("created_by");
        builder.Property(value => value.CreatedAt).CreatedAt();
        builder.Property(value => value.UpdatedAt).UpdatedAt();
        builder.HasIndex(value => new { value.RuleType, value.Pattern }).IsUnique().HasDatabaseName("uk_rule_type_pattern");
        builder.HasIndex(value => new { value.IsActive, value.RuleType }).HasDatabaseName("idx_rule_active_type");
        builder.HasIndex(value => value.CreatedBy).HasDatabaseName("fk_risk_rule_creator");
        builder.HasOne<User>().WithMany().HasForeignKey(value => value.CreatedBy).OnDelete(DeleteBehavior.SetNull).HasConstraintName("fk_risk_rule_creator");
    }

    private static string ToSnakeCase(string value) => string.Concat(value.Select((character, index) =>
        index > 0 && char.IsUpper(character) ? $"_{char.ToLowerInvariant(character)}" : char.ToLowerInvariant(character).ToString()));
}
