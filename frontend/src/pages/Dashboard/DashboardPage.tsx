import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import { OverviewStatsDto, ShortLinkDto } from "@/types/api";
import { Link2, Eye, Users, Globe, ArrowUpRight, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { LinkStatusBadge } from "@/components/shared/link-status-badge";
import { Link } from "react-router-dom";

export const DashboardPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [stats, setStats] = useState<OverviewStatsDto | null>(null);
  const [links, setLinks] = useState<ShortLinkDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentWorkspace) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, linksData] = await Promise.all([
          apiClient.get("/analytics/overview") as Promise<OverviewStatsDto>,
          apiClient.get("/links") as Promise<{ items: ShortLinkDto[] }>,
        ]);
        setStats(statsData);
        setLinks(linksData?.items || []);
      } catch (error) {
        console.error("加载控制台数据失败", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentWorkspace]);

  return (
    <PageContainer
      title="工作台总览"
      description={`当前空间「${currentWorkspace?.name || "加载中..."}」，实时聚合统计与核心短链资产状态。`}
      actions={
        <Button asChild className="gap-2 shadow-sm">
          <Link to="/links">
            <Plus className="h-4 w-4" />
            <span>进入短链管理</span>
          </Link>
        </Button>
      }
    >
      {/* 4 大核心指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              短链总数
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Link2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {loading ? "..." : stats?.totalLinks ?? 0}
            </span>
            <span className="text-xs text-muted-foreground ml-2">条活跃记录</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              累计访问量 (PV)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {loading ? "..." : (stats?.totalPv ?? 0).toLocaleString()}
            </span>
            <div className="flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+{stats?.pvGrowthRate ?? 18.4}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              独立访客数 (UV)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {loading ? "..." : (stats?.totalUv ?? 0).toLocaleString()}
            </span>
            <div className="flex items-center text-xs font-medium text-blue-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+{stats?.uvGrowthRate ?? 14.2}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              已绑定域名
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {loading ? "..." : stats?.activeDomains ?? 1}
            </span>
            <span className="text-xs text-muted-foreground ml-2">个解析正常</span>
          </div>
        </div>
      </div>

      {/* 核心短链列表卡片 */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              最近创建的短链
            </h3>
            <p className="text-xs text-muted-foreground">
              当前租户下的短链资产预览，支持快速复制与目标查看
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/links">查看全部短链</Link>
          </Button>
        </div>

        <div className="divide-y divide-border">
          {links.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              当前工作空间暂无短链，可切换至「Arturia 官方团队」查看预置演示数据。
            </div>
          ) : (
            links.slice(0, 5).map((link) => (
              <div
                key={link.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors gap-3"
              >
                <div className="flex flex-col min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
                      {link.fullShortUrl}
                    </span>
                    <CopyButton text={link.fullShortUrl} />
                    <LinkStatusBadge
                      isEnabled={link.isEnabled}
                      hasPassword={link.hasPassword}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground/80">
                      {link.title}
                    </span>
                    <span>•</span>
                    <a
                      href={link.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate max-w-xs md:max-w-md flex items-center gap-1"
                    >
                      <span>{link.originalUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 self-end sm:self-center shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">点击量 (PV)</div>
                    <div className="text-sm font-bold tabular-nums text-foreground">
                      {link.pvCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">访客 (UV)</div>
                    <div className="text-sm font-bold tabular-nums text-foreground">
                      {link.uvCount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
};
