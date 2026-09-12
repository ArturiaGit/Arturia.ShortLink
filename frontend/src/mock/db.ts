import {
  UserDto,
  WorkspaceDto,
  DomainDto,
  ShortLinkDto,
  TeamMemberDto,
  ApiKeyDto,
  OverviewStatsDto,
  AnalyticsSummaryDto,
  TimeseriesPointDto,
  DeviceStatsDto,
  ReferrerStatsDto,
  CountryStatsDto,
  TimeRange,
} from "@/types/api";

export interface MockUserAccount extends UserDto {
  password?: string;
  workspaces: {
    workspaceId: string;
    role: "owner" | "admin" | "member";
  }[];
}

export interface MockDatabase {
  currentUser: UserDto;
  users: MockUserAccount[];
  workspaces: WorkspaceDto[];
  domains: Record<string, DomainDto[]>; // workspaceId -> domains
  links: Record<string, ShortLinkDto[]>; // workspaceId -> links
  teamMembers: Record<string, TeamMemberDto[]>; // workspaceId -> members
  apiKeys: Record<string, ApiKeyDto[]>; // workspaceId -> keys
}

const STORAGE_KEY = "arturia_shortlink_mock_db";

const DEFAULT_USERS: MockUserAccount[] = [
  {
    id: "usr-admin-1",
    email: "admin@arturia.link",
    nickname: "Arturia 管理员",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    password: "password123!",
    workspaces: [
      { workspaceId: "ws-1", role: "owner" },
      { workspaceId: "ws-2", role: "admin" },
    ],
  },
  {
    id: "usr-member-1",
    email: "member@arturia.link",
    nickname: "普通协作者 (Alex)",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    password: "password123!",
    workspaces: [
      { workspaceId: "ws-1", role: "member" },
    ],
  },
];

const DEFAULT_DB: MockDatabase = {
  currentUser: DEFAULT_USERS[0],
  users: DEFAULT_USERS,
  workspaces: [
    {
      id: "ws-1",
      name: "Arturia 核心主空间",
      slug: "arturia-core",
      role: "owner",
      plan: "Enterprise",
      createdAt: "2026-01-01T08:00:00Z",
    },
    {
      id: "ws-2",
      name: "海外营销增长团队",
      slug: "global-growth",
      role: "admin",
      plan: "Pro",
      createdAt: "2026-02-15T10:30:00Z",
    },
  ],
  domains: {
    "ws-1": [
      {
        id: "dom-1",
        domain: "art.link",
        isSystem: true,
        isVerified: true,
        createdAt: "2026-01-01T08:00:00Z",
      },
      {
        id: "dom-2",
        domain: "go.arturia.io",
        isSystem: false,
        isVerified: true,
        cnameTarget: "cname.art.link",
        createdAt: "2026-01-10T14:20:00Z",
      },
    ],
    "ws-2": [
      {
        id: "dom-1",
        domain: "art.link",
        isSystem: true,
        isVerified: true,
        createdAt: "2026-01-01T08:00:00Z",
      },
      {
        id: "dom-3",
        domain: "growth.arturia.com",
        isSystem: false,
        isVerified: false,
        cnameTarget: "cname.art.link",
        createdAt: "2026-02-20T09:00:00Z",
      },
    ],
  },
  links: {
    "ws-1": [
      {
        id: "link-1",
        domain: "art.link",
        slug: "github",
        originalUrl: "https://github.com/ArturiaGit/Arturia.ShortLink",
        fullShortUrl: "https://art.link/github",
        title: "GitHub 官方开源仓库",
        description: "高并发分布式短链 SaaS 系统主源码仓库",
        isEnabled: true,
        hasPassword: false,
        pvCount: 14280,
        uvCount: 9860,
        createdAt: "2026-01-05T12:00:00Z",
        workspaceId: "ws-1",
        createdById: "usr-admin-1",
        creatorName: "Arturia 管理员",
        creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        tags: ["开源", "主仓库"],
      },
      {
        id: "link-2",
        domain: "go.arturia.io",
        slug: "spring26",
        originalUrl: "https://arturia.io/events/2026-spring-sale?utm_source=twitter&utm_medium=social&utm_campaign=spring_sale&utm_term=saas&utm_content=hero_banner",
        fullShortUrl: "https://go.arturia.io/spring26",
        title: "2026 春季促销活动专属着陆页",
        description: "面向 Twitter 与社群渠道的春季大促推广落地页",
        isEnabled: true,
        hasPassword: false,
        pvCount: 4520,
        uvCount: 3180,
        expiresAt: new Date(Date.now() + 16 * 3600 * 1000).toISOString(),
        createdAt: "2026-02-01T15:30:00Z",
        workspaceId: "ws-1",
        createdById: "usr-admin-1",
        creatorName: "Arturia 管理员",
        creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        tags: ["活动", "营销"],
      },
      {
        id: "link-3",
        domain: "art.link",
        slug: "docs",
        originalUrl: "https://arturia.io/docs/quickstart-guide",
        fullShortUrl: "https://art.link/docs",
        title: "SaaS 快速上手与开发者集成文档",
        description: "REST API 与 SDK 快速入门开发指南",
        isEnabled: true,
        hasPassword: false,
        pvCount: 1840,
        uvCount: 1220,
        createdAt: "2026-02-10T11:20:00Z",
        workspaceId: "ws-1",
        createdById: "usr-admin-1",
        creatorName: "Arturia 管理员",
        creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        tags: ["文档"],
      },
      {
        id: "link-4",
        domain: "art.link",
        slug: "v2confidential",
        originalUrl: "https://internal.arturia.io/preview-v2",
        fullShortUrl: "https://art.link/v2confidential",
        title: "内部架构演进机密白皮书 (密码保护)",
        description: "仅限内部核心成员访问的架构评估文档",
        isEnabled: true,
        hasPassword: true,
        password: "arturia2026",
        pvCount: 210,
        uvCount: 95,
        createdAt: "2026-03-01T09:15:00Z",
        workspaceId: "ws-1",
        createdById: "usr-admin-1",
        creatorName: "Arturia 管理员",
        creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        tags: ["内部", "机密"],
      },
      {
        id: "link-6",
        domain: "art.link",
        slug: "blackfriday25",
        originalUrl: "https://arturia.io/promotions/bf2025?utm_source=newsletter&utm_medium=email",
        fullShortUrl: "https://art.link/blackfriday25",
        title: "2025 黑五年度狂欢返场特惠 (已过期)",
        description: "2025 年末黑五大促限时闪购着陆页",
        isEnabled: false,
        hasPassword: false,
        pvCount: 8920,
        uvCount: 6410,
        expiresAt: "2025-12-01T00:00:00Z",
        createdAt: "2025-11-20T10:00:00Z",
        workspaceId: "ws-1",
        createdById: "usr-member-2",
        creatorName: "张三 (市场专员)",
        creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=zhangsan",
        tags: ["已过期", "促销"],
      },
    ],
    "ws-2": [
      {
        id: "link-5",
        domain: "art.link",
        slug: "global-launch",
        originalUrl: "https://arturia.io/global-launch?channel=reddit",
        fullShortUrl: "https://art.link/global-launch",
        title: "全球公测宣传 Reddit 渠道入口",
        description: "海外论坛流量测试与增长归因分析",
        isEnabled: true,
        hasPassword: false,
        pvCount: 890,
        uvCount: 640,
        createdAt: "2026-02-22T16:00:00Z",
        workspaceId: "ws-2",
        createdById: "usr-admin-1",
        creatorName: "Arturia 管理员",
        creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        tags: ["海外", "公测"],
      },
    ],
  },
  teamMembers: {
    "ws-1": [
      {
        id: "tm-1",
        userId: "usr-admin-1",
        email: "admin@arturia.link",
        nickname: "Arturia 管理员",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        role: "owner",
        joinedAt: "2026-01-01T08:00:00Z",
      },
      {
        id: "tm-2",
        userId: "usr-2",
        email: "sarah.chen@arturia.link",
        nickname: "Sarah Chen",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        role: "admin",
        joinedAt: "2026-01-15T09:30:00Z",
      },
      {
        id: "tm-3",
        userId: "usr-member-1",
        email: "member@arturia.link",
        nickname: "普通协作者 (Alex)",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        role: "member",
        joinedAt: "2026-02-01T14:00:00Z",
      },
    ],
    "ws-2": [
      {
        id: "tm-4",
        userId: "usr-admin-1",
        email: "admin@arturia.link",
        nickname: "Arturia 管理员",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        role: "admin",
        joinedAt: "2026-02-15T10:30:00Z",
      },
      {
        id: "tm-5",
        userId: "usr-4",
        email: "david.lee@arturia.link",
        nickname: "David Lee",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        role: "owner",
        joinedAt: "2026-02-10T08:00:00Z",
      },
    ],
  },
  apiKeys: {
    "ws-1": [
      {
        id: "key-1",
        name: "生产环境重定向服务集成",
        maskedKey: "art_live_••••••••••••••••••••••••39ab",
        prefix: "art_live_",
        createdAt: "2026-01-02T10:00:00Z",
        lastUsedAt: "2026-09-06T11:45:00Z",
      },
      {
        id: "key-2",
        name: "CI/CD 自动化链接构建 Key",
        maskedKey: "art_live_••••••••••••••••••••••••881c",
        prefix: "art_live_",
        createdAt: "2026-02-18T16:20:00Z",
        lastUsedAt: "2026-09-05T08:30:00Z",
      },
    ],
    "ws-2": [
      {
        id: "key-3",
        name: "海外营销自动化脚本",
        maskedKey: "art_live_••••••••••••••••••••••••77fa",
        prefix: "art_live_",
        createdAt: "2026-02-25T11:10:00Z",
      },
    ],
  },
};

export class MockDB {
  private static loadDB(): MockDatabase {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.workspaces && parsed.users) {
          // 自动为已有历史本地缓存数据打补丁补齐创建人字段
          let migrated = false;
          if (parsed.links) {
            for (const wsId of Object.keys(parsed.links)) {
              for (const link of parsed.links[wsId]) {
                if (!link.creatorName) {
                  link.createdById = link.createdById || "usr-admin-1";
                  link.creatorName =
                    link.createdById === "usr-member-2"
                      ? "张三 (市场专员)"
                      : "Arturia 管理员";
                  migrated = true;
                }
              }
            }
          }
          if (migrated) {
            this.saveDB(parsed);
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    this.saveDB(DEFAULT_DB);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  private static saveDB(db: MockDatabase): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // ignore
    }
  }

  static getDB(): MockDatabase {
    return this.loadDB();
  }

  static resetDB(): void {
    this.saveDB(DEFAULT_DB);
  }

  static getCurrentUser(): UserDto {
    return this.getDB().currentUser;
  }

  static setCurrentUser(user: UserDto): void {
    const db = this.getDB();
    db.currentUser = user;
    this.saveDB(db);
  }

  static getUserWorkspaces(userId: string): WorkspaceDto[] {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return db.workspaces.map((w) => ({ ...w, role: "owner" as const }));
    }
    return user.workspaces.map((userWs) => {
      const ws = db.workspaces.find((w) => w.id === userWs.workspaceId);
      if (ws) {
        return { ...ws, role: userWs.role };
      }
      return {
        id: userWs.workspaceId,
        name: "默认空间",
        slug: "default-space",
        role: userWs.role,
      };
    });
  }

  static login(email: string): { user: UserDto; token: string; workspaces: WorkspaceDto[] } {
    const db = this.getDB();
    let found = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      // 若无该账号，自动初始化为新用户
      const newUserId = `usr-${Date.now()}`;
      found = {
        id: newUserId,
        email,
        nickname: email.split("@")[0] || "新用户",
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
        workspaces: [
          { workspaceId: "ws-1", role: "member" },
        ],
      };
      db.users.push(found);
    }
    db.currentUser = {
      id: found.id,
      email: found.email,
      nickname: found.nickname,
      avatarUrl: found.avatarUrl,
    };
    this.saveDB(db);

    const workspaces = this.getUserWorkspaces(found.id);
    return {
      user: db.currentUser,
      token: `mock-jwt-token-${found.id}`,
      workspaces,
    };
  }

  static register(nickname: string, email: string): { user: UserDto; token: string; workspaces: WorkspaceDto[] } {
    const db = this.getDB();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error("该邮箱已被注册，请直接登录");
    }

    const newUserId = `usr-${Date.now()}`;
    const newWsId = `ws-${Date.now()}`;
    const slug = nickname.toLowerCase().replace(/[^a-z0-9]/g, "") || `team-${Date.now().toString().slice(-4)}`;

    const newWs: WorkspaceDto = {
      id: newWsId,
      name: `${nickname} 的空间`,
      slug: slug,
      role: "owner",
      plan: "Free",
      createdAt: new Date().toISOString(),
    };
    db.workspaces.push(newWs);
    db.domains[newWsId] = [
      {
        id: `dom-${Date.now()}`,
        domain: "art.link",
        isSystem: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
    ];
    db.links[newWsId] = [];
    db.apiKeys[newWsId] = [];

    const newUser: MockUserAccount = {
      id: newUserId,
      email,
      nickname,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nickname)}`,
      workspaces: [{ workspaceId: newWsId, role: "owner" }],
    };
    db.users.push(newUser);
    db.currentUser = {
      id: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
      avatarUrl: newUser.avatarUrl,
    };

    db.teamMembers[newWsId] = [
      {
        id: `tm-${Date.now()}`,
        userId: newUser.id,
        email: newUser.email,
        nickname: newUser.nickname,
        avatarUrl: newUser.avatarUrl,
        role: "owner",
        joinedAt: new Date().toISOString(),
      },
    ];

    this.saveDB(db);

    return {
      user: db.currentUser,
      token: `mock-jwt-token-${newUser.id}`,
      workspaces: [newWs],
    };
  }

  static getWorkspaces(): WorkspaceDto[] {
    const db = this.getDB();
    return this.getUserWorkspaces(db.currentUser.id);
  }

  static isSlugTaken(slug: string): boolean {
    const db = this.getDB();
    return db.workspaces.some((w) => w.slug.toLowerCase() === slug.toLowerCase());
  }

  static addWorkspace(name: string, slug: string): WorkspaceDto {
    const db = this.getDB();
    const newWsId = `ws-${Date.now()}`;
    const newWs: WorkspaceDto = {
      id: newWsId,
      name,
      slug,
      role: "owner",
      plan: "Free",
      createdAt: new Date().toISOString(),
    };
    db.workspaces.push(newWs);

    // 将新工作空间关联到当前用户
    const userInDb = db.users.find((u) => u.id === db.currentUser.id);
    if (userInDb) {
      userInDb.workspaces.push({ workspaceId: newWsId, role: "owner" });
    }

    db.domains[newWsId] = [
      {
        id: `dom-${Date.now()}`,
        domain: "art.link",
        isSystem: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
    ];
    db.links[newWsId] = [];
    db.teamMembers[newWsId] = [
      {
        id: `tm-${Date.now()}`,
        userId: db.currentUser.id,
        email: db.currentUser.email,
        nickname: db.currentUser.nickname,
        avatarUrl: db.currentUser.avatarUrl,
        role: "owner",
        joinedAt: new Date().toISOString(),
      },
    ];
    db.apiKeys[newWsId] = [];
    this.saveDB(db);
    return newWs;
  }

  static getDomains(workspaceId: string): DomainDto[] {
    const db = this.getDB();
    return db.domains[workspaceId] || [
      {
        id: "dom-1",
        domain: "art.link",
        isSystem: true,
        isVerified: true,
        createdAt: "2026-01-01T08:00:00Z",
      },
    ];
  }

  static getLinks(workspaceId: string): ShortLinkDto[] {
    const db = this.getDB();
    return db.links[workspaceId] || [];
  }

  static generateBase62Slug(length = 6): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static isLinkSlugTaken(domain: string, slug: string, excludeLinkId?: string): boolean {
    const db = this.getDB();
    const cleanDomain = domain.trim().toLowerCase();
    const cleanSlug = slug.trim().toLowerCase();

    for (const wsId of Object.keys(db.links)) {
      const list = db.links[wsId] || [];
      const match = list.find(
        (l) =>
          l.id !== excludeLinkId &&
          l.domain.toLowerCase() === cleanDomain &&
          l.slug.toLowerCase() === cleanSlug
      );
      if (match) return true;
    }
    return false;
  }

  static createShortLink(
    workspaceId: string,
    params: {
      domain: string;
      slug?: string;
      originalUrl: string;
      title?: string;
      description?: string;
      password?: string;
      expiresAt?: string | null;
    }
  ): ShortLinkDto {
    const db = this.getDB();
    if (!db.links[workspaceId]) {
      db.links[workspaceId] = [];
    }

    const url = params.originalUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("链接必须以 http:// 或 https:// 开头");
    }

    const domain = params.domain.trim();
    let slug = params.slug?.trim() || "";

    if (slug) {
      if (!/^[a-zA-Z0-9_-]{3,32}$/.test(slug)) {
        throw new Error("短码仅支持 3~32 位字母、数字、短横线及下划线");
      }
      if (this.isLinkSlugTaken(domain, slug)) {
        throw new Error(`别名 "${slug}" 在域名 ${domain} 下已被占用`);
      }
    } else {
      let attempts = 0;
      do {
        slug = this.generateBase62Slug(6);
        attempts++;
      } while (this.isLinkSlugTaken(domain, slug) && attempts < 10);
    }

    let title = params.title?.trim();
    if (!title) {
      try {
        const u = new URL(url);
        title = `${u.hostname}${u.pathname.length > 1 && u.pathname !== "/" ? u.pathname : ""}`;
      } catch {
        title = `链接 /${slug}`;
      }
    }

    const hasPassword = Boolean(params.password && params.password.trim().length > 0);
    const currentUser = db.currentUser;
    const newLink: ShortLinkDto = {
      id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      domain,
      slug,
      originalUrl: url,
      fullShortUrl: `https://${domain}/${slug}`,
      title,
      description: params.description?.trim() || "",
      isEnabled: true,
      hasPassword,
      password: hasPassword ? params.password?.trim() : undefined,
      expiresAt: params.expiresAt || null,
      pvCount: 0,
      uvCount: 0,
      createdAt: new Date().toISOString(),
      workspaceId,
      createdById: currentUser?.id || "usr-admin-1",
      creatorName: currentUser?.nickname || "Arturia 管理员",
      creatorAvatar: currentUser?.avatarUrl,
      tags: [],
    };

    db.links[workspaceId].unshift(newLink);
    this.saveDB(db);
    return newLink;
  }

  static updateShortLink(
    workspaceId: string,
    linkId: string,
    params: {
      originalUrl?: string;
      title?: string;
      description?: string;
      password?: string;
      hasPassword?: boolean;
      expiresAt?: string | null;
    }
  ): ShortLinkDto {
    const db = this.getDB();
    const list = db.links[workspaceId] || [];
    const target = list.find((l) => l.id === linkId);
    if (!target) {
      throw new Error("短链不存在或已被删除");
    }

    if (params.originalUrl !== undefined) {
      const url = params.originalUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new Error("链接必须以 http:// 或 https:// 开头");
      }
      target.originalUrl = url;
    }

    if (params.title !== undefined) {
      target.title = params.title.trim() || target.title;
    }

    if (params.description !== undefined) {
      target.description = params.description.trim();
    }

    if (params.hasPassword !== undefined) {
      target.hasPassword = params.hasPassword;
      if (!params.hasPassword) {
        target.password = undefined;
      }
    }

    if (params.password !== undefined) {
      if (params.password.trim().length > 0) {
        target.hasPassword = true;
        target.password = params.password.trim();
      } else if (params.hasPassword === false) {
        target.hasPassword = false;
        target.password = undefined;
      }
    }

    if (params.expiresAt !== undefined) {
      target.expiresAt = params.expiresAt;
    }

    this.saveDB(db);
    return target;
  }

  static toggleLinkStatus(workspaceId: string, linkId: string): ShortLinkDto {
    const db = this.getDB();
    const list = db.links[workspaceId] || [];
    const target = list.find((l) => l.id === linkId);
    if (!target) {
      throw new Error("短链不存在或已被删除");
    }

    target.isEnabled = !target.isEnabled;
    this.saveDB(db);
    return target;
  }

  static deleteShortLink(workspaceId: string, linkId: string): void {
    const db = this.getDB();
    const list = db.links[workspaceId] || [];
    const index = list.findIndex((l) => l.id === linkId);
    if (index === -1) {
      throw new Error("短链不存在或已被删除");
    }

    list.splice(index, 1);
    this.saveDB(db);
  }

  static getOverviewStats(workspaceId: string): OverviewStatsDto {
    const links = this.getLinks(workspaceId);
    const domains = this.getDomains(workspaceId);
    const totalPv = links.reduce((sum, link) => sum + link.pvCount, 0);
    const totalUv = links.reduce((sum, link) => sum + link.uvCount, 0);

    return {
      totalLinks: links.length,
      totalPv,
      totalUv,
      activeDomains: domains.length,
      pvGrowthRate: 18.4,
      uvGrowthRate: 14.2,
    };
  }

  // Team Member Management
  static getTeamMembers(workspaceId: string): TeamMemberDto[] {
    const db = this.getDB();
    return db.teamMembers[workspaceId] || [];
  }

  static addTeamMember(
    workspaceId: string,
    email: string,
    role: "admin" | "member"
  ): TeamMemberDto {
    const db = this.getDB();
    if (!db.teamMembers[workspaceId]) {
      db.teamMembers[workspaceId] = [];
    }

    // 检查是否已在该空间
    const existing = db.teamMembers[workspaceId].find(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      throw new Error("该成员已存在于当前工作空间");
    }

    const nickname = email.split("@")[0];
    const newMember: TeamMemberDto = {
      id: `tm-${Date.now()}`,
      userId: `usr-${Date.now()}`,
      email,
      nickname,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nickname)}`,
      role,
      joinedAt: new Date().toISOString(),
    };

    db.teamMembers[workspaceId].push(newMember);
    this.saveDB(db);
    return newMember;
  }

  static updateTeamMemberRole(
    workspaceId: string,
    memberId: string,
    newRole: "admin" | "member"
  ): TeamMemberDto {
    const db = this.getDB();
    const members = db.teamMembers[workspaceId] || [];
    const target = members.find((m) => m.id === memberId);
    if (!target) {
      throw new Error("目标成员未找到");
    }
    if (target.role === "owner") {
      throw new Error("所有者（Owner）角色不可被降级");
    }

    target.role = newRole;
    this.saveDB(db);
    return target;
  }

  static removeTeamMember(workspaceId: string, memberId: string): void {
    const db = this.getDB();
    const members = db.teamMembers[workspaceId] || [];
    const target = members.find((m) => m.id === memberId);
    if (!target) {
      throw new Error("目标成员未找到");
    }
    if (target.role === "owner") {
      throw new Error("无法从工作空间中移除空间所有者（Owner）");
    }

    db.teamMembers[workspaceId] = members.filter((m) => m.id !== memberId);
    this.saveDB(db);
  }

  // ==========================================
  // 阶段五：深度数据分析中心 (Analytics Engine)
  // ==========================================

  static getAnalyticsSummary(workspaceId: string, linkId?: string): AnalyticsSummaryDto {
    const links = this.getLinks(workspaceId);
    if (linkId) {
      const target = links.find((l) => l.id === linkId);
      const totalClicks = target?.pvCount ?? 0;
      const totalUniqueVisitors = target?.uvCount ?? 0;
      return {
        totalClicks,
        totalUniqueVisitors,
        activeLinksCount: target?.isEnabled ? 1 : 0,
        todayClicks: Math.round(totalClicks * 0.082),
        clicksGrowthRate: 19.4,
      };
    }

    const totalClicks = links.reduce((sum, l) => sum + l.pvCount, 0);
    const totalUniqueVisitors = links.reduce((sum, l) => sum + l.uvCount, 0);
    const activeLinksCount = links.filter((l) => l.isEnabled).length;

    return {
      totalClicks,
      totalUniqueVisitors,
      activeLinksCount,
      todayClicks: Math.round(totalClicks * 0.076),
      clicksGrowthRate: 15.8,
    };
  }

  static getAnalyticsTimeseries(
    workspaceId: string,
    range: TimeRange = "30d",
    linkId?: string
  ): TimeseriesPointDto[] {
    const summary = this.getAnalyticsSummary(workspaceId, linkId);
    const baseTotalPv = Math.max(summary.totalClicks, 120);

    const now = new Date("2026-09-12T08:00:00Z");

    if (range === "24h") {
      const points: TimeseriesPointDto[] = [];
      const hourlyWeights = [
        0.18, 0.12, 0.08, 0.05, 0.04, 0.06, 0.15, 0.45,
        0.85, 1.25, 1.42, 1.38, 1.15, 1.20, 1.35, 1.48,
        1.55, 1.40, 1.22, 1.36, 1.58, 1.45, 1.05, 0.52
      ];
      const sumWeights = hourlyWeights.reduce((a, b) => a + b, 0);
      const dayClicks = Math.max(summary.todayClicks, 48);

      for (let h = 0; h < 24; h++) {
        const hourTime = new Date(now.getTime() - (23 - h) * 3600 * 1000);
        const timeLabel = `${String(hourTime.getHours()).padStart(2, "0")}:00`;
        const weight = hourlyWeights[hourTime.getHours()];
        const clicks = Math.max(1, Math.round((dayClicks / sumWeights) * weight * (0.95 + (h % 3) * 0.05)));
        const uniqueVisitors = Math.max(1, Math.round(clicks * (0.65 + ((h % 5) * 0.02))));

        points.push({
          timestamp: timeLabel,
          clicks,
          uniqueVisitors,
        });
      }
      return points;
    }

    const daysCount = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const points: TimeseriesPointDto[] = [];
    const averageDailyPv = Math.max(10, Math.round(baseTotalPv / (daysCount * 1.3)));

    for (let i = daysCount - 1; i >= 0; i--) {
      const dayTime = new Date(now.getTime() - i * 86400 * 1000);
      const month = String(dayTime.getMonth() + 1).padStart(2, "0");
      const day = String(dayTime.getDate()).padStart(2, "0");
      const timeLabel = `${month}-${day}`;

      // 周期正弦波形与周末轻微回落自然拟真
      const dayOfWeek = dayTime.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendFactor = isWeekend ? 0.78 : 1.08;
      const wave = Math.sin((i / daysCount) * Math.PI * 4) * 0.22;
      const growthFactor = 0.85 + ((daysCount - i) / daysCount) * 0.35;

      const clicks = Math.max(2, Math.round(averageDailyPv * (1 + wave) * weekendFactor * growthFactor));
      const uvRatio = 0.62 + (i % 7) * 0.018;
      const uniqueVisitors = Math.max(1, Math.round(clicks * uvRatio));

      points.push({
        timestamp: timeLabel,
        clicks,
        uniqueVisitors,
      });
    }

    return points;
  }

  static getAnalyticsDevices(
    _workspaceId: string,
    _range: TimeRange = "30d",
    _linkId?: string
  ): DeviceStatsDto {
    return {
      deviceTypes: [
        { name: "桌面端", value: 62.5 },
        { name: "移动端", value: 34.0 },
        { name: "平板端", value: 3.5 },
      ],
      os: [
        { name: "Windows", value: 45.2 },
        { name: "macOS", value: 26.8 },
        { name: "iOS", value: 15.3 },
        { name: "Android", value: 12.7 },
      ],
      browsers: [
        { name: "Chrome", value: 68.4 },
        { name: "Safari", value: 18.2 },
        { name: "Edge", value: 9.1 },
        { name: "Firefox", value: 4.3 },
      ],
    };
  }

  static getAnalyticsReferrers(
    workspaceId: string,
    _range: TimeRange = "30d",
    linkId?: string
  ): ReferrerStatsDto[] {
    const summary = this.getAnalyticsSummary(workspaceId, linkId);
    const total = Math.max(summary.totalClicks, 100);

    return [
      { name: "直接访问 (Direct)", clicks: Math.round(total * 0.419), percentage: 41.9 },
      { name: "GitHub", clicks: Math.round(total * 0.231), percentage: 23.1 },
      { name: "Twitter / X", clicks: Math.round(total * 0.159), percentage: 15.9 },
      { name: "微信公众号/群聊", clicks: Math.round(total * 0.124), percentage: 12.4 },
      { name: "Google 搜索", clicks: Math.round(total * 0.067), percentage: 6.7 },
    ];
  }

  static getAnalyticsCountries(
    workspaceId: string,
    _range: TimeRange = "30d",
    linkId?: string
  ): CountryStatsDto[] {
    const summary = this.getAnalyticsSummary(workspaceId, linkId);
    const total = Math.max(summary.totalClicks, 100);

    return [
      { country: "中国", countryCode: "CN", clicks: Math.round(total * 0.636), percentage: 63.6 },
      { country: "美国", countryCode: "US", clicks: Math.round(total * 0.195), percentage: 19.5 },
      { country: "日本", countryCode: "JP", clicks: Math.round(total * 0.072), percentage: 7.2 },
      { country: "新加坡", countryCode: "SG", clicks: Math.round(total * 0.050), percentage: 5.0 },
      { country: "其他地区", countryCode: "OTHER", clicks: Math.round(total * 0.047), percentage: 4.7 },
    ];
  }
}
