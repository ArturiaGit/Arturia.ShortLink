import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TimeseriesPointDto, TimeRange } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Calendar } from "lucide-react";

interface AnalyticsTimeseriesChartProps {
  data: TimeseriesPointDto[];
  timeRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onExportCsv: () => void;
  isLoading?: boolean;
}

const RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "近 24 小时", value: "24h" },
  { label: "近 7 天", value: "7d" },
  { label: "近 30 天", value: "30d" },
  { label: "近 90 天", value: "90d" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const pv = payload.find((p) => p.dataKey === "clicks")?.value ?? 0;
    const uv = payload.find((p) => p.dataKey === "uniqueVisitors")?.value ?? 0;

    return (
      <div className="rounded-lg border border-border bg-popover/95 p-3 shadow-md backdrop-blur-sm text-xs min-w-[150px]">
        <div className="font-semibold text-foreground border-b border-border pb-1.5 mb-2 flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              总点击 (PV):
            </span>
            <span className="font-bold tabular-nums text-foreground">{pv.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              独立访客 (UV):
            </span>
            <span className="font-bold tabular-nums text-emerald-600">{uv.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const AnalyticsTimeseriesChart: React.FC<AnalyticsTimeseriesChartProps> = ({
  data,
  timeRange,
  onRangeChange,
  onExportCsv,
  isLoading = false,
}) => {
  const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);
  const totalVisitors = data.reduce((sum, item) => sum + item.uniqueVisitors, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base text-foreground">访问时序走势</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            区间内累计点击 <span className="font-semibold text-foreground tabular-nums">{totalClicks.toLocaleString()}</span> 次，独立访客 <span className="font-semibold text-emerald-600 tabular-nums">{totalVisitors.toLocaleString()}</span> 人
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 分段式药丸时间范围切换器 */}
          <div className="inline-flex rounded-lg bg-muted p-1 text-muted-foreground border border-border/50">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRangeChange(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeRange === opt.value
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 导出报表 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-8 text-xs gap-1.5"
            title="导出当前时序明细为 CSV"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>导出 CSV</span>
          </Button>
        </div>
      </div>

      <div className="pt-6">
        {isLoading ? (
          <div className="h-[320px] w-full flex items-center justify-center text-xs text-muted-foreground">
            正在聚合时序数据...
          </div>
        ) : data.length === 0 ? (
          <div className="h-[320px] w-full flex items-center justify-center text-xs text-muted-foreground">
            暂无当前时间范围内的时序访问记录
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  name="总点击 (PV)"
                  stroke="#18181b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorClicks)"
                  activeDot={{ r: 4, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="uniqueVisitors"
                  name="独立访客 (UV)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUv)"
                  activeDot={{ r: 4, strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 底部图例说明 */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-900 inline-block" />
            <span>总点击量 (PV)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>独立访客 (UV)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
