-- ============================================================================
-- Arturia.ShortLink 商业化多租户短链系统 - MySQL 8.0.46 数据库表结构设计
-- 适用于 .NET 10 + C# WebAPI + MySQL 架构
-- 字符集：utf8mb4 / 排序规则：utf8mb4_unicode_ci / 时间口径：UTC
-- ============================================================================
-- 修订记录 (Revision History)
-- v1.0.0 | 2026-09-06 | 数据库架构团队 | 初始化 MySQL 8.x DDL
-- v1.1.0 | 2026-09-14 | 后端 Agent (Codex) | 冻结全局域名与租户绑定模型，补齐邀请、风险规则、软删除短码释放、封禁、机器人及 UTM 快照字段
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `arturia_shortlink`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `arturia_shortlink`;

-- DDL/种子会话固定 UTC；应用连接与数据库容器同样必须显式使用 +00:00
SET time_zone = '+00:00';

-- ------------------------------------------------------------------------------
-- 1. 用户账号表
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `email` VARCHAR(128) NOT NULL COMMENT '登录邮箱（唯一凭据）',
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'BCrypt不可逆哈希',
    `nickname` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '用户昵称',
    `avatar_url` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '头像图片URL',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态：1-正常，0-停用',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_email` (`email`),
    CONSTRAINT `chk_user_status` CHECK (`status` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账号表';

-- ------------------------------------------------------------------------------
-- 2. 工作空间表
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_workspace` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '工作空间主键ID',
    `name` VARCHAR(64) NOT NULL COMMENT '工作空间展示名称',
    `slug` VARCHAR(64) NOT NULL COMMENT '空间唯一路径别名',
    `plan_tier` VARCHAR(32) NOT NULL DEFAULT 'free' COMMENT 'free/pro/enterprise',
    `max_links` INT NOT NULL DEFAULT 1000 COMMENT '最大短链配额',
    `max_domains` INT NOT NULL DEFAULT 3 COMMENT '最大自定义域名配额',
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT '创建人用户ID',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_slug` (`slug`),
    KEY `idx_created_by` (`created_by`),
    CONSTRAINT `fk_workspace_creator` FOREIGN KEY (`created_by`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_workspace_slug` CHECK (`slug` REGEXP '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='多租户工作空间表';

-- ------------------------------------------------------------------------------
-- 3. 工作空间成员关系表
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_workspace_member` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '所属工作空间ID',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联用户ID',
    `role` VARCHAR(32) NOT NULL DEFAULT 'member' COMMENT 'owner/admin/member',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC加入时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC角色更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ws_user` (`workspace_id`, `user_id`),
    KEY `idx_user_ws` (`user_id`, `workspace_id`),
    CONSTRAINT `fk_member_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `sys_workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_member_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_member_role` CHECK (`role` IN ('owner', 'admin', 'member'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作空间成员与RBAC权限表';

-- ------------------------------------------------------------------------------
-- 4. 工作空间邀请表
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workspace_invitation` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '邀请主键ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '目标工作空间ID',
    `email` VARCHAR(128) NOT NULL COMMENT '受邀邮箱',
    `role` VARCHAR(32) NOT NULL DEFAULT 'member' COMMENT 'admin/member',
    `token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '一次性邀请Token的SHA256哈希',
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending/accepted/expired/revoked',
    `expires_at` DATETIME(6) NOT NULL COMMENT 'UTC过期时间',
    `invited_by` BIGINT UNSIGNED NOT NULL COMMENT '邀请人用户ID',
    `accepted_by` BIGINT UNSIGNED NULL COMMENT '接受邀请的用户ID',
    `accepted_at` DATETIME(6) NULL COMMENT 'UTC接受时间',
    `revoked_at` DATETIME(6) NULL COMMENT 'UTC撤销时间',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC更新时间',
    `pending_email` VARCHAR(128) GENERATED ALWAYS AS (
        CASE WHEN `status` = 'pending' THEN LOWER(`email`) ELSE NULL END
    ) STORED COMMENT '仅待处理邀请参与唯一约束',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_invitation_token_hash` (`token_hash`),
    UNIQUE KEY `uk_ws_pending_email` (`workspace_id`, `pending_email`),
    KEY `idx_invitation_email_status` (`email`, `status`, `expires_at`),
    CONSTRAINT `fk_invitation_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `sys_workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_invitation_inviter` FOREIGN KEY (`invited_by`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_invitation_acceptor` FOREIGN KEY (`accepted_by`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_invitation_role` CHECK (`role` IN ('admin', 'member')),
    CONSTRAINT `chk_invitation_status` CHECK (`status` IN ('pending', 'accepted', 'expired', 'revoked'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作空间待注册与一次性邀请表';

-- ------------------------------------------------------------------------------
-- 5. 全局域名注册表：同一真实Host只保存一条
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `link_domain` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '域名主键ID',
    `domain` VARCHAR(253) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '规范化小写ASCII/Punycode Host，不含协议、端口、路径或尾点',
    `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否平台共享系统域名',
    `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'DNS是否验证通过',
    `verification_code` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'DNS TXT校验码；系统域名可为空',
    `ssl_status` VARCHAR(32) NOT NULL DEFAULT 'Pending' COMMENT 'Active/Pending/Error',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_domain` (`domain`),
    UNIQUE KEY `uk_domain_id_system` (`id`, `is_system`),
    UNIQUE KEY `uk_domain_verification_code` (`verification_code`),
    CONSTRAINT `chk_domain_normalized` CHECK (
        CHAR_LENGTH(`domain`) BETWEEN 1 AND 253
        AND `domain` = LOWER(`domain`)
        AND `domain` NOT LIKE '%://%'
        AND `domain` NOT LIKE '%/%'
        AND `domain` NOT LIKE '%:%'
        AND RIGHT(`domain`, 1) <> '.'
    ),
    CONSTRAINT `chk_domain_ssl_status` CHECK (`ssl_status` IN ('Active', 'Pending', 'Error')),
    CONSTRAINT `chk_domain_is_system` CHECK (`is_system` IN (0, 1)),
    CONSTRAINT `chk_domain_is_verified` CHECK (`is_verified` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局域名注册与DNS状态表';

-- ------------------------------------------------------------------------------
-- 6. 工作空间域名绑定表：保存租户可用域名和唯一主域名
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workspace_domain` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '绑定主键ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '工作空间ID',
    `domain_id` BIGINT UNSIGNED NOT NULL COMMENT '全局域名ID',
    `is_system` TINYINT(1) NOT NULL COMMENT '冗余域名类型，由复合外键保证与全局域名一致',
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否当前空间主域名',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC更新时间',
    `primary_workspace_id` BIGINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN `is_primary` = 1 THEN `workspace_id` ELSE NULL END
    ) STORED COMMENT '保证每空间只有一个主域名',
    `custom_domain_id` BIGINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN `is_system` = 0 THEN `domain_id` ELSE NULL END
    ) STORED COMMENT '保证自定义域名全平台只能绑定一个空间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ws_domain` (`workspace_id`, `domain_id`),
    UNIQUE KEY `uk_primary_workspace` (`primary_workspace_id`),
    UNIQUE KEY `uk_custom_domain_owner` (`custom_domain_id`),
    KEY `idx_binding_domain` (`domain_id`),
    CONSTRAINT `fk_binding_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `sys_workspace` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_binding_domain_type` FOREIGN KEY (`domain_id`, `is_system`) REFERENCES `link_domain` (`id`, `is_system`) ON DELETE RESTRICT,
    CONSTRAINT `chk_binding_is_system` CHECK (`is_system` IN (0, 1)),
    CONSTRAINT `chk_binding_is_primary` CHECK (`is_primary` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作空间域名绑定表';

-- ------------------------------------------------------------------------------
-- 7. 短链核心映射表
-- active_slug仅对未删除记录有值：唯一索引同时保证Host+Slug唯一和软删除后释放Slug
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `short_link` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '短链全局唯一ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '归属工作空间ID',
    `domain_id` BIGINT UNSIGNED NOT NULL COMMENT '全局域名ID',
    `slug` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '6位Base62或3至32位区分大小写的自定义别名',
    `original_url` VARCHAR(2048) NOT NULL COMMENT '原始目标URL',
    `title` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '短链标题',
    `description` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '用途说明',
    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '用户启停开关',
    `is_banned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '安全封禁状态',
    `password_hash` VARCHAR(255) NULL COMMENT '访问密码BCrypt哈希',
    `expires_at` DATETIME(6) NULL COMMENT 'UTC失效时间',
    `utm_source` VARCHAR(128) NULL COMMENT 'UTM来源',
    `utm_medium` VARCHAR(128) NULL COMMENT 'UTM媒介',
    `utm_campaign` VARCHAR(128) NULL COMMENT 'UTM活动',
    `utm_term` VARCHAR(128) NULL COMMENT 'UTM关键词',
    `utm_content` VARCHAR(128) NULL COMMENT 'UTM内容',
    `total_clicks` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排除机器人的累计PV',
    `total_unique_visitors` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排除机器人的累计UV',
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT '创建者用户ID',
    `banned_reason` VARCHAR(512) NULL COMMENT '封禁原因',
    `banned_by` BIGINT UNSIGNED NULL COMMENT '封禁操作者',
    `banned_at` DATETIME(6) NULL COMMENT 'UTC封禁时间',
    `deleted_by` BIGINT UNSIGNED NULL COMMENT '软删除操作者',
    `deleted_at` DATETIME(6) NULL COMMENT 'UTC软删除时间',
    `active_slug` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (
        CASE WHEN `deleted_at` IS NULL THEN `slug` ELSE NULL END
    ) STORED COMMENT '仅未删除记录参与唯一约束',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_domain_active_slug` (`domain_id`, `active_slug`),
    UNIQUE KEY `uk_workspace_link` (`workspace_id`, `id`),
    KEY `idx_ws_enabled_created` (`workspace_id`, `is_enabled`, `created_at`),
    KEY `idx_ws_banned_created` (`workspace_id`, `is_banned`, `created_at`),
    KEY `idx_created_by` (`created_by`),
    KEY `idx_deleted_at` (`deleted_at`),
    CONSTRAINT `fk_link_workspace_domain` FOREIGN KEY (`workspace_id`, `domain_id`) REFERENCES `workspace_domain` (`workspace_id`, `domain_id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_link_creator` FOREIGN KEY (`created_by`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_link_banner` FOREIGN KEY (`banned_by`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_link_deleter` FOREIGN KEY (`deleted_by`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_link_slug` CHECK (`slug` REGEXP '^[0-9A-Za-z_-]{3,32}$'),
    CONSTRAINT `chk_link_is_enabled` CHECK (`is_enabled` IN (0, 1)),
    CONSTRAINT `chk_link_is_banned` CHECK (`is_banned` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短链核心映射、封禁与软删除表';

-- ------------------------------------------------------------------------------
-- 8. 短链访问明细日志表
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `link_access_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志主键ID',
    `link_id` BIGINT UNSIGNED NOT NULL COMMENT '短链ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '工作空间ID',
    `ip_address` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '访客IP',
    `visitor_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '按UTC日期派生密钥的HMAC-SHA256访客哈希',
    `country` VARCHAR(64) NOT NULL DEFAULT '未知' COMMENT '国家或地区',
    `region` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '省份或州',
    `city` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '城市',
    `device_type` VARCHAR(32) NOT NULL DEFAULT '桌面端' COMMENT '桌面端/移动端/平板端',
    `os` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '操作系统',
    `browser` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '浏览器',
    `referer` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '完整来源URL',
    `referer_domain` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '来源主域名',
    `user_agent` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '完整User-Agent',
    `is_bot` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否机器人流量',
    `bot_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '命中的机器人规则名称',
    `utm_source` VARCHAR(128) NULL COMMENT '访问时UTM来源快照',
    `utm_medium` VARCHAR(128) NULL COMMENT '访问时UTM媒介快照',
    `utm_campaign` VARCHAR(128) NULL COMMENT '访问时UTM活动快照',
    `utm_term` VARCHAR(128) NULL COMMENT '访问时UTM关键词快照',
    `utm_content` VARCHAR(128) NULL COMMENT '访问时UTM内容快照',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC访问时间',
    PRIMARY KEY (`id`),
    KEY `idx_link_time` (`link_id`, `created_at`),
    KEY `idx_ws_time` (`workspace_id`, `created_at`),
    KEY `idx_ws_bot_time` (`workspace_id`, `is_bot`, `created_at`),
    KEY `idx_link_visitor_time` (`link_id`, `visitor_hash`, `created_at`),
    KEY `idx_utm_campaign_time` (`workspace_id`, `utm_campaign`, `created_at`),
    CONSTRAINT `fk_log_workspace_link` FOREIGN KEY (`workspace_id`, `link_id`) REFERENCES `short_link` (`workspace_id`, `id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_log_is_bot` CHECK (`is_bot` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短链访问分析明细日志表';

-- ------------------------------------------------------------------------------
-- 9. API Key凭证表
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_api_key` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '密钥主键ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '归属工作空间ID',
    `name` VARCHAR(64) NOT NULL COMMENT '密钥备注名称',
    `key_prefix` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '控制台可展示前缀',
    `key_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '完整密钥SHA256哈希',
    `last_used_at` DATETIME(6) NULL COMMENT 'UTC最后调用时间',
    `expires_at` DATETIME(6) NULL COMMENT 'UTC过期时间',
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT '创建人用户ID',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_key_hash` (`key_hash`),
    KEY `idx_ws_created` (`workspace_id`, `created_at`),
    CONSTRAINT `fk_api_key_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `sys_workspace` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_api_key_creator` FOREIGN KEY (`created_by`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作空间开放API密钥凭证表';

-- ------------------------------------------------------------------------------
-- 10. 风险规则表：支持无需发版更新协议、域名、关键词、保留Slug和机器人UA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `risk_rule` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '规则主键ID',
    `rule_type` VARCHAR(32) NOT NULL COMMENT 'blocked_protocol/blocked_domain/blocked_keyword/reserved_slug/bot_user_agent',
    `pattern` VARCHAR(512) NOT NULL COMMENT '匹配内容',
    `match_type` VARCHAR(32) NOT NULL DEFAULT 'contains' COMMENT 'exact/suffix/contains/regex',
    `display_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '规则或机器人展示名称',
    `reason` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '命中后的可审计原因',
    `source` VARCHAR(64) NOT NULL DEFAULT 'system' COMMENT '规则来源或规则集版本',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '规则是否生效',
    `created_by` BIGINT UNSIGNED NULL COMMENT '规则创建者；系统种子为空',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC创建时间',
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_rule_type_pattern` (`rule_type`, `pattern`),
    KEY `idx_rule_active_type` (`is_active`, `rule_type`),
    CONSTRAINT `fk_risk_rule_creator` FOREIGN KEY (`created_by`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_risk_rule_type` CHECK (`rule_type` IN ('blocked_protocol', 'blocked_domain', 'blocked_keyword', 'reserved_slug', 'bot_user_agent')),
    CONSTRAINT `chk_risk_match_type` CHECK (`match_type` IN ('exact', 'suffix', 'contains', 'regex')),
    CONSTRAINT `chk_risk_is_active` CHECK (`is_active` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安全风控与机器人识别规则表';

-- ============================================================================
-- Development/Testing 演示种子；生产环境由应用配置明确禁用
-- 演示账号：admin@arturia.link、member@arturia.link；密码均为 password123!
-- 下方为 cost=11 BCrypt 哈希，Phase 1 自动化测试必须调用 BCrypt.Verify 再次校验
-- ============================================================================

INSERT INTO `sys_user` (`id`, `email`, `password_hash`, `nickname`, `avatar_url`, `status`)
VALUES
(1, 'admin@arturia.link', '$2a$11$AIqnLtlR.7ZoixnF9nAqGOAItIc9A/mstSpPOLHEp.Z9gR8fN0pnu', 'Arturia 管理员', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop', 1),
(2, 'member@arturia.link', '$2a$11$AIqnLtlR.7ZoixnF9nAqGOAItIc9A/mstSpPOLHEp.Z9gR8fN0pnu', '业务协作者', '', 1)
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

INSERT INTO `sys_workspace` (`id`, `name`, `slug`, `plan_tier`, `max_links`, `max_domains`, `created_by`)
VALUES
(1, 'Arturia 官方团队', 'arturia-core', 'pro', 5000, 10, 1),
(2, '市场增长实验室', 'growth-lab', 'free', 1000, 3, 1)
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

INSERT INTO `sys_workspace_member` (`id`, `workspace_id`, `user_id`, `role`)
VALUES
(1, 1, 1, 'owner'),
(2, 2, 1, 'owner'),
(3, 1, 2, 'member')
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`), `role` = VALUES(`role`);

INSERT INTO `link_domain` (`id`, `domain`, `is_system`, `is_verified`, `verification_code`, `ssl_status`)
VALUES
(1, 'art.link', 1, 1, NULL, 'Active'),
(2, 'go.arturia.dev', 0, 1, 'cname-verify-98124', 'Active')
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

INSERT INTO `workspace_domain` (`id`, `workspace_id`, `domain_id`, `is_system`, `is_primary`)
VALUES
(1, 1, 1, 1, 1),
(2, 1, 2, 0, 0),
(3, 2, 1, 1, 1)
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`), `is_primary` = VALUES(`is_primary`);

INSERT INTO `short_link` (
    `id`, `workspace_id`, `domain_id`, `slug`, `original_url`, `title`, `description`,
    `is_enabled`, `utm_source`, `utm_medium`, `utm_campaign`,
    `total_clicks`, `total_unique_visitors`, `created_by`
)
VALUES
(1, 1, 1, 'github-repo', 'https://github.com/dotnet/aspnetcore', 'ASP.NET Core 官方主页', '微软官方开源高性能 Web 框架仓库', 1, 'newsletter', 'banner', 'dotnet10_launch', 3482, 2190, 1),
(2, 1, 1, 'summer-sale', 'https://store.steampowered.com/sale/special', '2026 夏季促销主会场', '年度游戏特惠专题活动分发入口', 1, 'twitter', 'social', 'summer26', 15200, 8940, 1),
(3, 1, 2, 'api-docs', 'https://learn.microsoft.com/aspnet/core', '开发文档与快速入门', '内部团队与外部开发者技术手册', 1, 'direct', 'docs', 'v2', 892, 610, 1)
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

INSERT INTO `risk_rule` (`id`, `rule_type`, `pattern`, `match_type`, `display_name`, `is_active`)
VALUES
(1, 'blocked_domain', 'malware.test', 'exact', '恶意域名示例', 1),
(2, 'blocked_domain', '.phishing.test', 'suffix', '钓鱼域名示例', 1),
(3, 'blocked_keyword', '钓鱼', 'contains', '钓鱼关键词', 1),
(4, 'reserved_slug', 'api', 'exact', '系统API路由', 1),
(5, 'reserved_slug', 'login', 'exact', '登录路由', 1),
(6, 'reserved_slug', 'admin', 'exact', '管理路由', 1),
(7, 'reserved_slug', 'health', 'exact', '健康检查路由', 1),
(8, 'reserved_slug', 'scalar', 'exact', 'API文档路由', 1),
(9, 'reserved_slug', 'openapi', 'exact', 'OpenAPI路由', 1),
(10, 'reserved_slug', 'unlock', 'exact', '密码解锁路由', 1),
(11, 'reserved_slug', 'suspended', 'exact', '停用提示路由', 1),
(12, 'reserved_slug', 'expired', 'exact', '过期提示路由', 1),
(13, 'reserved_slug', 'banned', 'exact', '封禁提示路由', 1),
(14, 'bot_user_agent', 'Googlebot', 'contains', 'Googlebot', 1),
(15, 'bot_user_agent', 'Baiduspider', 'contains', 'Baiduspider', 1),
(16, 'bot_user_agent', 'bingbot', 'contains', 'Bingbot', 1),
(17, 'bot_user_agent', 'facebookexternalhit', 'contains', 'Facebook Preview', 1),
(18, 'bot_user_agent', 'Twitterbot', 'contains', 'Twitter Preview', 1),
(19, 'reserved_slug', 'register', 'exact', '注册路由', 1),
(20, 'reserved_slug', 'dashboard', 'exact', '控制台首页路由', 1),
(21, 'reserved_slug', 'links', 'exact', '短链管理路由', 1),
(22, 'reserved_slug', 'analytics', 'exact', '分析路由', 1),
(23, 'reserved_slug', 'domains', 'exact', '域名路由', 1),
(24, 'reserved_slug', 'team', 'exact', '团队路由', 1),
(25, 'reserved_slug', 'settings', 'exact', '设置路由', 1),
(26, 'reserved_slug', 'assets', 'exact', '静态资源路由', 1),
(27, 'reserved_slug', '404', 'exact', '未找到状态页路由', 1),
(28, 'blocked_protocol', 'javascript', 'exact', 'JavaScript伪协议', 1),
(29, 'blocked_protocol', 'data', 'exact', 'Data伪协议', 1),
(30, 'blocked_protocol', 'file', 'exact', 'File本地协议', 1),
(31, 'blocked_protocol', 'vbscript', 'exact', 'VBScript伪协议', 1),
(32, 'blocked_domain', 'art.link', 'exact', '系统域名自环', 1),
(33, 'blocked_domain', 'go.arturia.dev', 'exact', '自定义域名自环示例', 1)
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`), `is_active` = VALUES(`is_active`);
