-- ==============================================================================
-- Arturia.ShortLink 商业化多租户短链系统 - MySQL 8.x 数据库表结构设计
-- 适用于 .NET 10 + C# WebAPI + MySQL 架构
-- 字符集：utf8mb4 / 排序规则：utf8mb4_unicode_ci
-- ==============================================================================
-- 
-- ------------------------------------------------------------------------------
-- 修订记录 (Revision History)
-- v1.0.0 | 2026-09-06 | 数据库架构团队 | 初始化 MySQL 8.x DDL（用户、空间、空间成员、短链、域名、访问日志、统计表）
-- ------------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `arturia_shortlink` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `arturia_shortlink`;

-- ------------------------------------------------------------------------------
-- 1. 用户账号表 (sys_user)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `email` VARCHAR(128) NOT NULL COMMENT '登录邮箱（唯一凭据）',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希 (BCrypt/Argon2 安全散列)',
    `nickname` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '用户昵称',
    `avatar_url` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '头像图片URL',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态：1-正常，0-停用',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账号表';

-- ------------------------------------------------------------------------------
-- 2. 工作空间/租户表 (sys_workspace)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_workspace` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '工作空间主键ID',
    `name` VARCHAR(64) NOT NULL COMMENT '工作空间展示名称',
    `slug` VARCHAR(64) NOT NULL COMMENT '空间唯一路径别名标识',
    `plan_tier` VARCHAR(32) NOT NULL DEFAULT 'free' COMMENT '套餐版本：free-免费版, pro-专业版, enterprise-企业版',
    `max_links` INT NOT NULL DEFAULT 1000 COMMENT '当前空间最大短链配额上限',
    `max_domains` INT NOT NULL DEFAULT 3 COMMENT '最大自定义域名绑定数限制',
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT '创建人用户ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '空间创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_slug` (`slug`),
    KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='多租户工作空间表';

-- ------------------------------------------------------------------------------
-- 3. 工作空间成员关系表 (sys_workspace_member)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_workspace_member` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '所属工作空间ID',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联用户ID',
    `role` VARCHAR(32) NOT NULL DEFAULT 'member' COMMENT '成员空间角色：owner-所有者, admin-管理员, member-协作者',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '角色更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ws_user` (`workspace_id`, `user_id`),
    KEY `idx_user_ws` (`user_id`, `workspace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作空间成员关联与RBAC权限表';

-- ------------------------------------------------------------------------------
-- 4. 自定义独立域名表 (link_domain)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `link_domain` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '域名主键ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '归属工作空间ID',
    `domain` VARCHAR(128) NOT NULL COMMENT '域名字符串（如 go.mybrand.com 或系统共享域名 art.link）',
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为空间默认首选域名：1-是，0-否',
    `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为平台全局共享域名：1-是，0-否',
    `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'DNS CNAME解析是否校验通过：1-已验证，0-待验证',
    `verification_code` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'DNS TXT/CNAME 专属校验码',
    `ssl_status` VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'SSL证书安全状态：pending-申请中, active-生效中, error-异常',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '域名添加时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '状态更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_domain` (`domain`),
    KEY `idx_workspace_id` (`workspace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短链域名管理与解析状态表';

-- ------------------------------------------------------------------------------
-- 5. 短链核心映射表 (short_link)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `short_link` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '短链全局唯一ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '归属工作空间ID',
    `domain_id` BIGINT UNSIGNED NOT NULL COMMENT '关联绑定的域名ID',
    `slug` VARCHAR(64) NOT NULL COMMENT '短码别名（如 6位Base62 或自定义词 spring-sale）',
    `original_url` VARCHAR(2048) NOT NULL COMMENT '原始长链接目标URL',
    `title` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '短链标题/备注名称',
    `description` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '详细用途说明',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '启用开关：1-正常跳转，0-暂停服务',
    `password_hash` VARCHAR(255) DEFAULT NULL COMMENT '访问密码哈希，为空表示公开无密码',
    `expires_at` DATETIME DEFAULT NULL COMMENT '失效时间，为空表示永久有效',
    
    -- 预置标准 UTM 渠道追踪参数
    `utm_source` VARCHAR(128) DEFAULT NULL COMMENT 'UTM 广告来源',
    `utm_medium` VARCHAR(128) DEFAULT NULL COMMENT 'UTM 营销媒介',
    `utm_campaign` VARCHAR(128) DEFAULT NULL COMMENT 'UTM 活动名称',
    `utm_term` VARCHAR(128) DEFAULT NULL COMMENT 'UTM 关键词',
    `utm_content` VARCHAR(128) DEFAULT NULL COMMENT 'UTM 内容标识',
    
    -- 高频聚合计数指标
    `total_clicks` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计总访问点击量 (PV)',
    `total_unique_visitors` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计独立访客数 (UV)',
    
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT '创建者用户ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    PRIMARY KEY (`id`),
    -- 域名+短码复合唯一索引：不同域名下可复用相同短码（如 /app、/login），同一域名下防冲突
    UNIQUE KEY `uk_domain_slug` (`domain_id`, `slug`),
    KEY `idx_ws_active_created` (`workspace_id`, `is_active`, `created_at`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短链核心映射表';

-- ------------------------------------------------------------------------------
-- 6. 短链访问明细日志表 (link_access_log)
-- 高频写入日志表，后续海量流量可无缝对接 RabbitMQ 异步批量入库或转入 ClickHouse
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `link_access_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志明细自增ID',
    `link_id` BIGINT UNSIGNED NOT NULL COMMENT '被访问短链ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '所属工作空间ID',
    `ip_address` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '访客真实公网IP',
    `country` VARCHAR(64) NOT NULL DEFAULT '未知' COMMENT '国家/地区（GeoIP地理库解析）',
    `region` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '省份/州',
    `city` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '城市名称',
    `device_type` VARCHAR(32) NOT NULL DEFAULT '桌面端' COMMENT '设备类别：桌面端, 移动端, 平板端',
    `os` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '操作系统：Windows, macOS, iOS, Android, Linux',
    `browser` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '浏览器：Chrome, Safari, Edge, Firefox, WeChat',
    `referer` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '来源网页完整 URL',
    `referer_domain` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '来源网页主域名',
    `user_agent` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '完整 User-Agent 字符串',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问发生时间',
    PRIMARY KEY (`id`),
    KEY `idx_link_time` (`link_id`, `created_at`),
    KEY `idx_ws_time` (`workspace_id`, `created_at`),
    KEY `idx_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短链访问分析明细日志表';

-- ------------------------------------------------------------------------------
-- 7. 开放平台 API 密钥凭证表 (sys_api_key)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_api_key` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '密钥主键ID',
    `workspace_id` BIGINT UNSIGNED NOT NULL COMMENT '归属工作空间ID',
    `name` VARCHAR(64) NOT NULL COMMENT '密钥备注名称',
    `key_prefix` VARCHAR(16) NOT NULL COMMENT '安全前缀（控制台展示，如 art_live_...）',
    `key_hash` VARCHAR(255) NOT NULL COMMENT '完整密钥密文哈希 (SHA256)',
    `last_used_at` DATETIME DEFAULT NULL COMMENT '最后一次被调用时间',
    `expires_at` DATETIME DEFAULT NULL COMMENT '密钥过期时间，为空表示永久有效',
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT '创建人用户ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建生成时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_key_hash` (`key_hash`),
    KEY `idx_ws_created` (`workspace_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作空间开放API密钥凭证表';

-- ==============================================================================
-- 初始演示测试种子数据 (Seed Data)
-- ==============================================================================

-- 1. 默认超级管理员用户 (密码 demo123456 的 BCrypt 哈希)
INSERT INTO `sys_user` (`id`, `email`, `password_hash`, `nickname`, `avatar_url`, `status`)
VALUES 
(1, 'admin@arturia.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Arturia 管理员', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop', 1)
ON DUPLICATE KEY UPDATE `id`=`id`;

-- 2. 默认工作空间
INSERT INTO `sys_workspace` (`id`, `name`, `slug`, `plan_tier`, `max_links`, `max_domains`, `created_by`)
VALUES 
(1, 'Arturia 官方团队', 'arturia-core', 'pro', 5000, 10, 1),
(2, '市场增长实验室', 'growth-lab', 'free', 1000, 3, 1)
ON DUPLICATE KEY UPDATE `id`=`id`;

-- 3. 空间成员关系 (Owner)
INSERT INTO `sys_workspace_member` (`workspace_id`, `user_id`, `role`)
VALUES 
(1, 1, 'owner'),
(2, 1, 'owner')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- 4. 默认系统域名与已绑定自定义域名
INSERT INTO `link_domain` (`id`, `workspace_id`, `domain`, `is_primary`, `is_system`, `is_verified`, `verification_code`, `ssl_status`)
VALUES 
(1, 1, 'art.link', 1, 1, 1, 'art-system-verified', 'active'),
(2, 1, 'go.arturia.dev', 0, 0, 1, 'cname-verify-98124', 'active'),
(3, 2, 'art.link', 1, 1, 1, 'art-system-verified', 'active')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- 5. 初始示例短链
INSERT INTO `short_link` (`id`, `workspace_id`, `domain_id`, `slug`, `original_url`, `title`, `description`, `is_active`, `utm_source`, `utm_medium`, `utm_campaign`, `total_clicks`, `total_unique_visitors`, `created_by`)
VALUES 
(1, 1, 1, 'github-repo', 'https://github.com/dotnet/aspnetcore', 'ASP.NET Core 官方主页', '微软官方开源高性能 Web 框架仓库', 1, 'newsletter', 'banner', 'dotnet10_launch', 3482, 2190, 1),
(2, 1, 1, 'summer-sale', 'https://store.steampowered.com/sale/special', '2026 夏季促销主会场', '年度游戏特惠专题活动分发入口', 1, 'twitter', 'social', 'summer26', 15200, 8940, 1),
(3, 1, 2, 'api-docs', 'https://learn.microsoft.com/aspnet/core', '开发文档与快速入门', '内部团队与外部开发者技术手册', 1, 'direct', 'docs', 'v2', 892, 610, 1)
ON DUPLICATE KEY UPDATE `id`=`id`;
