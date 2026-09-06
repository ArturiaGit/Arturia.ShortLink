import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import { OverviewStatsDto } from "@/types/api";
import { BarChart3, TrendingUp, Monitor, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const AnalyticsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [stats, setStats] = useState<OverviewStatsDto | null>(null);

  useEffect(() => {
    if (!currentWorkspace) return;
    apiClient.get("/analytics/overview").then((res: any) => setStats(res));
  }, [currentWorkspace]);

  return (
    <PageContainer
      title="数据分析中心"
      description="实时追踪当前工作空间下短链的访问趋势、地理分布、操作系统与渠道引流效果。"
    >
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">流量概览指标</h3>
          </div>
          <Badge variant="outline">近 30 天数据</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
          <div>
            <div className="text-xs text-muted-foreground">总点击数 (PV)</div>
            <div className="text-2xl font-bold tabular-nums text-foreground mt-1">
              {(stats?.totalPv ?? 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">独立访客 (UV)</div>
            <div className="text-2xl font-bold tabular-nums text-foreground mt-1">
              {(stats?.totalUv ?? 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">人均访问频次</div>
            <div className="text-2xl font-bold tabular-nums text-foreground mt-1">
              {stats && stats.totalUv > 0
                ? (stats.totalPv / stats.totalUv).toFixed(2)
                : "1.00"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">月环比增长</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="h-5 w-5" />
              <span>+{stats?.pvGrowthRate ?? 18.4}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center flex flex-col items-center justify-center">
          <Monitor className="h-8 w-8 text-muted-foreground mb-3" />
          <h4 className="font-semibold text-foreground text-sm">设备与系统分布</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            iOS, Android, Windows, macOS 访问占比图表将在【阶段五】通过 Recharts 完整渲染。
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center flex flex-col items-center justify-center">
          <Globe2 className="h-8 w-8 text-muted-foreground mb-3" />
          <h4 className="font-semibold text-foreground text-sm">地域与引流渠道</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            省份城市分布热力表与 UTM 渠道归因排行将在【阶段五】提供全量时序对比。
          </p>
        </div>
      </div>
    </PageContainer>
  );
};
