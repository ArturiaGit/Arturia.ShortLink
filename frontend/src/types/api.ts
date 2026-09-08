export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  message: string;
  data: T;
  timestamp?: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserDto {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
  plan?: string;
  createdAt?: string;
}

export interface DomainDto {
  id: string;
  domain: string;
  isSystem: boolean;
  isVerified: boolean;
  cnameTarget?: string;
  createdAt: string;
}

export interface ShortLinkDto {
  id: string;
  domain: string;
  slug: string;
  originalUrl: string;
  fullShortUrl: string;
  title: string;
  description?: string;
  isEnabled: boolean;
  hasPassword?: boolean;
  password?: string;
  pvCount: number;
  uvCount: number;
  expiresAt?: string | null;
  createdAt: string;
  workspaceId: string;
  createdById?: string;
  creatorName?: string;
  creatorAvatar?: string;
  tags?: string[];
}

export interface CreateShortLinkDto {
  domain: string;
  slug?: string;
  originalUrl: string;
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: string | null;
}

export interface UpdateShortLinkDto {
  originalUrl?: string;
  title?: string;
  description?: string;
  password?: string;
  hasPassword?: boolean;
  expiresAt?: string | null;
}

export interface CheckSlugResultDto {
  available: boolean;
  message?: string;
}

export interface OverviewStatsDto {
  totalLinks: number;
  totalPv: number;
  totalUv: number;
  activeDomains: number;
  pvGrowthRate: number;
  uvGrowthRate: number;
}

export interface TeamMemberDto {
  id: string;
  userId: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  maskedKey: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}
