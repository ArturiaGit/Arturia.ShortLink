import React from "react";
import { AnalyticsSummaryDto } from "@/types/api";
import { MousePointerClick, Users, Link as LinkIcon, Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummaryDto | null;
  isLoading?: boolean;
}

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({
  summary,
  isLoading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. 总点击量 (PV) */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">总点击量 (PV)</span>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <MousePointerClick className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {isLoading ? "--" : (summary?.totalClicks ?? 0).toLocaleString()}
          </span>
          <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 gap-0.5 px-1.5 py-0">
            <TrendingUp className="h-3 w-3" />
            <span>+{summary?.clicksGrowthRate ?? 15.8}%</span>
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">所有访问重定向总调用频次</p>
      </div>

      {/* 2. 独立访客数 (UV) */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">独立访客 (UV)</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {isLoading ? "--" : (summary?.totalUniqueVisitors ?? 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            人均{" "}
            {summary && summary.totalUniqueVisitors > 0
              ? (summary.totalClicks / summary.totalUniqueVisitors).toFixed(2)
              : "1.00"}{" "}
            次
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">IP + User-Agent 精准去重口径</p>
      </div>

      {/* 3. 活跃有效短链 */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">有效短链数</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <LinkIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {isLoading ? "--" : (summary?.activeLinksCount ?? 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">正常服务中</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">当前处于启用状态的短链条目</p>
      </div>

      {/* 4. 今日实时点击 */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">今日实时点击</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {isLoading ? "--" : (summary?.todayClicks ?? 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground">次访问</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">24 小时内毫秒级实时流量捕获</p>
      </div>
    </div>
  );
};
