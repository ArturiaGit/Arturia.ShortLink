import { UserDto, WorkspaceDto, DomainDto, ShortLinkDto, TeamMemberDto, ApiKeyDto, OverviewStatsDto } from "@/types/api";

export interface MockDatabase {
  currentUser: UserDto;
  workspaces: WorkspaceDto[];
  domains: Record<string, DomainDto[]>; // workspaceId -> domains
  links: Record<string, ShortLinkDto[]>; // workspaceId -> links
  teamMembers: Record<string, TeamMemberDto[]>; // workspaceId -> members
  apiKeys: Record<string, ApiKeyDto[]>; // workspaceId -> keys
}

const STORAGE_KEY = "arturia_shortlink_mock_db";

const DEFAULT_DB: MockDatabase = {
  currentUser: {
    id: "usr-admin-1",
    email: "admin@arturia.com",
    nickname: "Arturia Admin",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  workspaces: [
    {
      id: "ws-1",
      name: "Arturia 官方团队",
      slug: "arturia-core",
      role: "owner",
      plan: "Enterprise",
      createdAt: "2026-01-01T08:00:00Z",
    },
    {
      id: "ws-2",
      name: "海外增长团队",
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
        tags: ["开源", "主仓库"],
      },
      {
        id: "link-2",
        domain: "go.arturia.io",
        slug: "spring26",
        originalUrl: "https://arturia.io/events/2026-spring-sale?utm_source=twitter&utm_medium=social",
        fullShortUrl: "https://go.arturia.io/spring26",
        title: "2026 春季促销活动专属着陆页",
        description: "面向 Twitter 与社群渠道的春季大促推广落地页",
        isEnabled: true,
        hasPassword: false,
        pvCount: 4520,
        uvCount: 3180,
        createdAt: "2026-02-01T15:30:00Z",
        workspaceId: "ws-1",
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
        isEnabled: false,
        hasPassword: true,
        pvCount: 210,
        uvCount: 95,
        createdAt: "2026-03-01T09:15:00Z",
        workspaceId: "ws-1",
        tags: ["内部", "机密"],
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
        tags: ["海外", "公测"],
      },
    ],
  },
  teamMembers: {
    "ws-1": [
      {
        id: "tm-1",
        userId: "usr-admin-1",
        email: "admin@arturia.com",
        nickname: "Arturia Admin",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        role: "owner",
        joinedAt: "2026-01-01T08:00:00Z",
      },
      {
        id: "tm-2",
        userId: "usr-2",
        email: "sarah.chen@arturia.com",
        nickname: "Sarah Chen",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        role: "admin",
        joinedAt: "2026-01-15T09:30:00Z",
      },
      {
        id: "tm-3",
        userId: "usr-3",
        email: "alex.wang@arturia.com",
        nickname: "Alex Wang",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        role: "member",
        joinedAt: "2026-02-01T14:00:00Z",
      },
    ],
    "ws-2": [
      {
        id: "tm-4",
        userId: "usr-admin-1",
        email: "admin@arturia.com",
        nickname: "Arturia Admin",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        role: "admin",
        joinedAt: "2026-02-15T10:30:00Z",
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
        return JSON.parse(data);
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

  static getWorkspaces(): WorkspaceDto[] {
    return this.getDB().workspaces;
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

  static addWorkspace(name: string, slug: string): WorkspaceDto {
    const db = this.getDB();
    const newWs: WorkspaceDto = {
      id: `ws-${Date.now()}`,
      name,
      slug,
      role: "owner",
      plan: "Free",
      createdAt: new Date().toISOString(),
    };
    db.workspaces.push(newWs);
    db.domains[newWs.id] = [
      {
        id: `dom-${Date.now()}`,
        domain: "art.link",
        isSystem: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
    ];
    db.links[newWs.id] = [];
    db.teamMembers[newWs.id] = [
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
    db.apiKeys[newWs.id] = [];
    this.saveDB(db);
    return newWs;
  }
}
