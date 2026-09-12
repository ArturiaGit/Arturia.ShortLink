import React, { useState } from "react";
import { CountryStatsDto } from "@/types/api";
import { Globe2, MapPin } from "lucide-react";

interface AnalyticsGeoCardProps {
  data: CountryStatsDto[];
  isLoading?: boolean;
}

const CHINA_PROVINCES = [
  { name: "广东省", clicks: 3980, percentage: 32.0 },
  { name: "北京市", clicks: 2980, percentage: 23.9 },
  { name: "浙江省", clicks: 2010, percentage: 16.1 },
  { name: "上海市", clicks: 1870, percentage: 15.0 },
  { name: "江苏省", clicks: 1610, percentage: 13.0 },
];

export const AnalyticsGeoCard: React.FC<AnalyticsGeoCardProps> = ({
  data,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<"countries" | "provinces">("countries");

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm text-foreground">地理分布 (GeoIP)</h4>
        </div>

        {/* 切换国家/地区与中国省市 */}
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-muted-foreground border border-border/40 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("countries")}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
              viewMode === "countries"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "hover:text-foreground"
            }`}
          >
            全球国家/地区
          </button>
          <button
            type="button"
            onClick={() => setViewMode("provinces")}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
              viewMode === "provinces"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "hover:text-foreground"
            }`}
          >
            中国省市分布
          </button>
        </div>
      </div>

      <div className="pt-4 flex-1">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            正在解析地理位置分布...
          </div>
        ) : viewMode === "countries" ? (
          data.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              暂无地理分布数据
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.map((item, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 font-medium text-foreground truncate pr-2">
                      <span className="p-1 rounded bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      </span>
                      <span className="truncate">{item.country}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        ({item.countryCode})
                      </span>
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
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3.5">
            {CHINA_PROVINCES.map((prov, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-medium text-foreground truncate pr-2">
                    <span className="h-4 w-4 rounded-full bg-muted text-[10px] flex items-center justify-center font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="truncate">{prov.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular-nums font-semibold text-foreground">
                      {prov.clicks.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground tabular-nums text-[11px] w-12 text-right">
                      {prov.percentage}%
                    </span>
                  </div>
                </div>

                {/* 横向进度条 */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(prov.percentage * 2.5, 100)}%` }}
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
