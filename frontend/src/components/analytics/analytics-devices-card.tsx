import React, { useState } from "react";
import { DeviceStatsDto, DeviceItemDto } from "@/types/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Monitor } from "lucide-react";

interface AnalyticsDevicesCardProps {
  data: DeviceStatsDto | null;
  isLoading?: boolean;
}

type DeviceTab = "deviceTypes" | "os" | "browsers";

const COLORS = [
  "#18181b", // zinc-900
  "#2563eb", // blue-600
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

export const AnalyticsDevicesCard: React.FC<AnalyticsDevicesCardProps> = ({
  data,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<DeviceTab>("deviceTypes");

  const currentItems: DeviceItemDto[] = data ? data[activeTab] || [] : [];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm text-foreground">设备与客户端环境</h4>
        </div>

        {/* Tab 切换 */}
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-muted-foreground border border-border/40 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("deviceTypes")}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
              activeTab === "deviceTypes"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "hover:text-foreground"
            }`}
          >
            设备类别
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("os")}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
              activeTab === "os"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "hover:text-foreground"
            }`}
          >
            操作系统
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("browsers")}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
              activeTab === "browsers"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "hover:text-foreground"
            }`}
          >
            浏览器
          </button>
        </div>
      </div>

      <div className="pt-4 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            正在统计设备分布...
          </div>
        ) : !data || currentItems.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            暂无环境分布数据
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* 极简 Donut 环形图 */}
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, "占比"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "8px",
                      border: "1px solid #e4e4e7",
                      fontSize: "12px",
                      padding: "6px 10px",
                    }}
                  />
                  <Pie
                    data={currentItems}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {currentItems.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 图例列表 */}
            <div className="space-y-2.5">
              {currentItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground tabular-nums ml-2">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
