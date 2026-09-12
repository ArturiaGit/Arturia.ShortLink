import React from "react";
import { ReferrerStatsDto } from "@/types/api";
import {
  Compass,
  Github,
  Twitter,
  MessageCircle,
  Search,
  Share2,
} from "lucide-react";

interface AnalyticsReferrersCardProps {
  data: ReferrerStatsDto[];
  isLoading?: boolean;
}

function getReferrerIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("github")) return <Github className="h-4 w-4 text-zinc-800" />;
  if (lower.includes("twitter") || lower.includes("x")) return <Twitter className="h-4 w-4 text-sky-500" />;
  if (lower.includes("微信") || lower.includes("wechat")) return <MessageCircle className="h-4 w-4 text-emerald-600" />;
  if (lower.includes("google") || lower.includes("搜索")) return <Search className="h-4 w-4 text-amber-600" />;
  if (lower.includes("直接") || lower.includes("direct")) return <Compass className="h-4 w-4 text-indigo-500" />;
  return <Share2 className="h-4 w-4 text-muted-foreground" />;
}

export const AnalyticsReferrersCard: React.FC<AnalyticsReferrersCardProps> = ({
  data,
  isLoading = false,
}) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm text-foreground">来源渠道分析 (Referrers)</h4>
        </div>
        <span className="text-[11px] text-muted-foreground">TOP 引流网站</span>
      </div>

      <div className="pt-4 flex-1">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            正在统计引流渠道...
          </div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            暂无来源渠道数据
          </div>
        ) : (
          <div className="space-y-3.5">
            {data.map((item, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-medium text-foreground truncate pr-2">
                    <span className="p-1 rounded bg-muted flex items-center justify-center shrink-0">
                      {getReferrerIcon(item.name)}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular-nums font-semibold text-foreground">
                      {item.clicks.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground tabular-nums text-[11px] w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* 横向进度条 */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
