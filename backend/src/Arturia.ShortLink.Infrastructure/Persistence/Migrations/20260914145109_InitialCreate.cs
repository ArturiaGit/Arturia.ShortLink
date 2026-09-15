using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Arturia.ShortLink.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "link_domain",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    domain = table.Column<string>(type: "varchar(253)", maxLength: 253, nullable: false, collation: "ascii_bin"),
                    is_system = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    is_verified = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    verification_code = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true, collation: "ascii_bin"),
                    ssl_status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "Pending", collation: "utf8mb4_unicode_ci"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_link_domain", x => x.id);
                    table.UniqueConstraint("uk_domain_id_system", x => new { x.id, x.is_system });
                    table.CheckConstraint("chk_domain_is_system", "`is_system` IN (0, 1)");
                    table.CheckConstraint("chk_domain_is_verified", "`is_verified` IN (0, 1)");
                    table.CheckConstraint("chk_domain_normalized", "CHAR_LENGTH(`domain`) BETWEEN 1 AND 253 AND `domain` = LOWER(`domain`) AND `domain` NOT LIKE '%://%' AND `domain` NOT LIKE '%/%' AND `domain` NOT LIKE '%:%' AND RIGHT(`domain`, 1) <> '.'");
                    table.CheckConstraint("chk_domain_ssl_status", "`ssl_status` IN ('Active', 'Pending', 'Error')");
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "sys_user",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    email = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false, collation: "utf8mb4_unicode_ci"),
                    password_hash = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_unicode_ci"),
                    nickname = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    avatar_url = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    status = table.Column<sbyte>(type: "tinyint", nullable: false, defaultValue: (sbyte)1),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sys_user", x => x.id);
                    table.CheckConstraint("chk_user_status", "`status` IN (0, 1)");
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "risk_rule",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    rule_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, collation: "utf8mb4_unicode_ci"),
                    pattern = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false, collation: "utf8mb4_unicode_ci"),
                    match_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "contains", collation: "utf8mb4_unicode_ci"),
                    display_name = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    reason = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    source = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "system", collation: "utf8mb4_unicode_ci"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    created_by = table.Column<ulong>(type: "bigint unsigned", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_risk_rule", x => x.id);
                    table.CheckConstraint("chk_risk_is_active", "`is_active` IN (0, 1)");
                    table.CheckConstraint("chk_risk_match_type", "`match_type` IN ('exact', 'suffix', 'contains', 'regex')");
                    table.CheckConstraint("chk_risk_rule_type", "`rule_type` IN ('blocked_protocol', 'blocked_domain', 'blocked_keyword', 'reserved_slug', 'bot_user_agent')");
                    table.ForeignKey(
                        name: "fk_risk_rule_creator",
                        column: x => x.created_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "sys_workspace",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_unicode_ci"),
                    slug = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_unicode_ci"),
                    plan_tier = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "free", collation: "utf8mb4_unicode_ci"),
                    max_links = table.Column<int>(type: "int", nullable: false, defaultValue: 1000),
                    max_domains = table.Column<int>(type: "int", nullable: false, defaultValue: 3),
                    created_by = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sys_workspace", x => x.id);
                    table.CheckConstraint("chk_workspace_slug", "`slug` REGEXP '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$'");
                    table.ForeignKey(
                        name: "fk_workspace_creator",
                        column: x => x.created_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "sys_api_key",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    workspace_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    name = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_unicode_ci"),
                    key_prefix = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false, collation: "ascii_bin"),
                    key_hash = table.Column<string>(type: "char(64)", nullable: false, collation: "ascii_bin"),
                    last_used_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    expires_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_by = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sys_api_key", x => x.id);
                    table.ForeignKey(
                        name: "fk_api_key_creator",
                        column: x => x.created_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_api_key_workspace",
                        column: x => x.workspace_id,
                        principalTable: "sys_workspace",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "sys_workspace_member",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    workspace_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    user_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    role = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "member", collation: "utf8mb4_unicode_ci"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sys_workspace_member", x => x.id);
                    table.CheckConstraint("chk_member_role", "`role` IN ('owner', 'admin', 'member')");
                    table.ForeignKey(
                        name: "fk_member_user",
                        column: x => x.user_id,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_member_workspace",
                        column: x => x.workspace_id,
                        principalTable: "sys_workspace",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "workspace_domain",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    workspace_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    domain_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    is_system = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    is_primary = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    primary_workspace_id = table.Column<ulong>(type: "bigint unsigned", nullable: true, computedColumnSql: "CASE WHEN `is_primary` = 1 THEN `workspace_id` ELSE NULL END", stored: true),
                    custom_domain_id = table.Column<ulong>(type: "bigint unsigned", nullable: true, computedColumnSql: "CASE WHEN `is_system` = 0 THEN `domain_id` ELSE NULL END", stored: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspace_domain", x => x.id);
                    table.UniqueConstraint("uk_ws_domain", x => new { x.workspace_id, x.domain_id });
                    table.CheckConstraint("chk_binding_is_primary", "`is_primary` IN (0, 1)");
                    table.CheckConstraint("chk_binding_is_system", "`is_system` IN (0, 1)");
                    table.ForeignKey(
                        name: "fk_binding_domain_type",
                        columns: x => new { x.domain_id, x.is_system },
                        principalTable: "link_domain",
                        principalColumns: new[] { "id", "is_system" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_binding_workspace",
                        column: x => x.workspace_id,
                        principalTable: "sys_workspace",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "workspace_invitation",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    workspace_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    email = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false, collation: "utf8mb4_unicode_ci"),
                    role = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "member", collation: "utf8mb4_unicode_ci"),
                    token_hash = table.Column<string>(type: "char(64)", nullable: false, collation: "ascii_bin"),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "pending", collation: "utf8mb4_unicode_ci"),
                    expires_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    invited_by = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    accepted_by = table.Column<ulong>(type: "bigint unsigned", nullable: true),
                    accepted_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    revoked_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    pending_email = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, computedColumnSql: "CASE WHEN `status` = 'pending' THEN LOWER(`email`) ELSE NULL END", stored: true, collation: "utf8mb4_unicode_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspace_invitation", x => x.id);
                    table.CheckConstraint("chk_invitation_role", "`role` IN ('admin', 'member')");
                    table.CheckConstraint("chk_invitation_status", "`status` IN ('pending', 'accepted', 'expired', 'revoked')");
                    table.ForeignKey(
                        name: "fk_invitation_acceptor",
                        column: x => x.accepted_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_invitation_inviter",
                        column: x => x.invited_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_invitation_workspace",
                        column: x => x.workspace_id,
                        principalTable: "sys_workspace",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "short_link",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    workspace_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    domain_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    slug = table.Column<string>(type: "varchar(32)", nullable: false, collation: "ascii_bin"),
                    original_url = table.Column<string>(type: "varchar(2048)", maxLength: 2048, nullable: false, collation: "utf8mb4_unicode_ci"),
                    title = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    description = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    is_enabled = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    is_banned = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    password_hash = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true, collation: "utf8mb4_unicode_ci"),
                    expires_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    utm_source = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_medium = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_campaign = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_term = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_content = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    total_clicks = table.Column<ulong>(type: "bigint unsigned", nullable: false, defaultValue: 0ul),
                    total_unique_visitors = table.Column<ulong>(type: "bigint unsigned", nullable: false, defaultValue: 0ul),
                    created_by = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    banned_reason = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true, collation: "utf8mb4_unicode_ci"),
                    banned_by = table.Column<ulong>(type: "bigint unsigned", nullable: true),
                    banned_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    deleted_by = table.Column<ulong>(type: "bigint unsigned", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    active_slug = table.Column<string>(type: "varchar(32)", nullable: true, computedColumnSql: "CASE WHEN `deleted_at` IS NULL THEN `slug` ELSE NULL END", stored: true, collation: "ascii_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_short_link", x => x.id);
                    table.UniqueConstraint("uk_workspace_link", x => new { x.workspace_id, x.id });
                    table.CheckConstraint("chk_link_is_banned", "`is_banned` IN (0, 1)");
                    table.CheckConstraint("chk_link_is_enabled", "`is_enabled` IN (0, 1)");
                    table.CheckConstraint("chk_link_slug", "`slug` REGEXP '^[0-9A-Za-z_-]{3,32}$'");
                    table.ForeignKey(
                        name: "fk_link_banner",
                        column: x => x.banned_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_link_creator",
                        column: x => x.created_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_link_deleter",
                        column: x => x.deleted_by,
                        principalTable: "sys_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_link_workspace_domain",
                        columns: x => new { x.workspace_id, x.domain_id },
                        principalTable: "workspace_domain",
                        principalColumns: new[] { "workspace_id", "domain_id" },
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "link_access_log",
                columns: table => new
                {
                    id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    link_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    workspace_id = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    ip_address = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    visitor_hash = table.Column<string>(type: "char(64)", nullable: false, collation: "ascii_bin"),
                    country = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "未知", collation: "utf8mb4_unicode_ci"),
                    region = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    city = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    device_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "桌面端", collation: "utf8mb4_unicode_ci"),
                    os = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    browser = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    referer = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    referer_domain = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    user_agent = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    is_bot = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    bot_name = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, defaultValue: "", collation: "utf8mb4_unicode_ci"),
                    utm_source = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_medium = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_campaign = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_term = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    utm_content = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true, collation: "utf8mb4_unicode_ci"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_link_access_log", x => x.id);
                    table.CheckConstraint("chk_log_is_bot", "`is_bot` IN (0, 1)");
                    table.ForeignKey(
                        name: "fk_log_workspace_link",
                        columns: x => new { x.workspace_id, x.link_id },
                        principalTable: "short_link",
                        principalColumns: new[] { "workspace_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateIndex(
                name: "fk_log_workspace_link",
                table: "link_access_log",
                columns: new[] { "workspace_id", "link_id" });

            migrationBuilder.CreateIndex(
                name: "idx_link_time",
                table: "link_access_log",
                columns: new[] { "link_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "idx_link_visitor_time",
                table: "link_access_log",
                columns: new[] { "link_id", "visitor_hash", "created_at" });

            migrationBuilder.CreateIndex(
                name: "idx_utm_campaign_time",
                table: "link_access_log",
                columns: new[] { "workspace_id", "utm_campaign", "created_at" });

            migrationBuilder.CreateIndex(
                name: "idx_ws_bot_time",
                table: "link_access_log",
                columns: new[] { "workspace_id", "is_bot", "created_at" });

            migrationBuilder.CreateIndex(
                name: "idx_ws_time",
                table: "link_access_log",
                columns: new[] { "workspace_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "uk_domain",
                table: "link_domain",
                column: "domain",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_domain_verification_code",
                table: "link_domain",
                column: "verification_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "fk_risk_rule_creator",
                table: "risk_rule",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "idx_rule_active_type",
                table: "risk_rule",
                columns: new[] { "is_active", "rule_type" });

            migrationBuilder.CreateIndex(
                name: "uk_rule_type_pattern",
                table: "risk_rule",
                columns: new[] { "rule_type", "pattern" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "fk_link_banner",
                table: "short_link",
                column: "banned_by");

            migrationBuilder.CreateIndex(
                name: "fk_link_deleter",
                table: "short_link",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "fk_link_workspace_domain",
                table: "short_link",
                columns: new[] { "workspace_id", "domain_id" });

            migrationBuilder.CreateIndex(
                name: "idx_created_by",
                table: "short_link",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "idx_deleted_at",
                table: "short_link",
                column: "deleted_at");

            migrationBuilder.CreateIndex(
                name: "idx_ws_banned_created",
                table: "short_link",
                columns: new[] { "workspace_id", "is_banned", "created_at" });

            migrationBuilder.CreateIndex(
                name: "idx_ws_enabled_created",
                table: "short_link",
                columns: new[] { "workspace_id", "is_enabled", "created_at" });

            migrationBuilder.CreateIndex(
                name: "uk_domain_active_slug",
                table: "short_link",
                columns: new[] { "domain_id", "active_slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "fk_api_key_creator",
                table: "sys_api_key",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "idx_ws_created",
                table: "sys_api_key",
                columns: new[] { "workspace_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "uk_key_hash",
                table: "sys_api_key",
                column: "key_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_email",
                table: "sys_user",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_created_by",
                table: "sys_workspace",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "uk_slug",
                table: "sys_workspace",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_user_ws",
                table: "sys_workspace_member",
                columns: new[] { "user_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "uk_ws_user",
                table: "sys_workspace_member",
                columns: new[] { "workspace_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "fk_binding_domain_type",
                table: "workspace_domain",
                columns: new[] { "domain_id", "is_system" });

            migrationBuilder.CreateIndex(
                name: "idx_binding_domain",
                table: "workspace_domain",
                column: "domain_id");

            migrationBuilder.CreateIndex(
                name: "uk_custom_domain_owner",
                table: "workspace_domain",
                column: "custom_domain_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_primary_workspace",
                table: "workspace_domain",
                column: "primary_workspace_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "fk_invitation_acceptor",
                table: "workspace_invitation",
                column: "accepted_by");

            migrationBuilder.CreateIndex(
                name: "fk_invitation_inviter",
                table: "workspace_invitation",
                column: "invited_by");

            migrationBuilder.CreateIndex(
                name: "idx_invitation_email_status",
                table: "workspace_invitation",
                columns: new[] { "email", "status", "expires_at" });

            migrationBuilder.CreateIndex(
                name: "uk_invitation_token_hash",
                table: "workspace_invitation",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_ws_pending_email",
                table: "workspace_invitation",
                columns: new[] { "workspace_id", "pending_email" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "link_access_log");

            migrationBuilder.DropTable(
                name: "risk_rule");

            migrationBuilder.DropTable(
                name: "sys_api_key");

            migrationBuilder.DropTable(
                name: "sys_workspace_member");

            migrationBuilder.DropTable(
                name: "workspace_invitation");

            migrationBuilder.DropTable(
                name: "short_link");

            migrationBuilder.DropTable(
                name: "workspace_domain");

            migrationBuilder.DropTable(
                name: "link_domain");

            migrationBuilder.DropTable(
                name: "sys_workspace");

            migrationBuilder.DropTable(
                name: "sys_user");
        }
    }
}
