import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import {
  ShortLinkDto,
  AnalyticsSummaryDto,
  TimeseriesPointDto,
  DeviceStatsDto,
  ReferrerStatsDto,
  CountryStatsDto,
  TimeRange,
} from "@/types/api";
import { AnalyticsFilterBar } from "@/components/analytics/analytics-filter-bar";
import { AnalyticsSummaryCards } from "@/components/analytics/analytics-summary-cards";
import { AnalyticsTimeseriesChart } from "@/components/analytics/analytics-timeseries-chart";
import { AnalyticsReferrersCard } from "@/components/analytics/analytics-referrers-card";
import { AnalyticsDevicesCard } from "@/components/analytics/analytics-devices-card";
import { AnalyticsGeoCard } from "@/components/analytics/analytics-geo-card";
import { toast } from "sonner";

export const AnalyticsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkIdFromUrl = searchParams.get("linkId") || undefined;

  const [links, setLinks] = useState<ShortLinkDto[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [summary, setSummary] = useState<AnalyticsSummaryDto | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPointDto[]>([]);
  const [devices, setDevices] = useState<DeviceStatsDto | null>(null);
  const [referrers, setReferrers] = useState<ReferrerStatsDto[]>([]);
  const [countries, setCountries] = useState<CountryStatsDto[]>([]);

  // 加载当前空间短链列表用于下拉选择
  useEffect(() => {
    if (!currentWorkspace) return;
    apiClient
      .get("/links", { params: { pageSize: 100 } })
      .then((res: any) => {
        setLinks(res.items || []);
      })
      .catch((err) => {
        console.error("加载短链失败", err);
      });
  }, [currentWorkspace]);

  // 加载多维分析报表数据
  const fetchAnalyticsData = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      const commonParams = {
        range: timeRange,
        linkId: linkIdFromUrl,
      };

      const [summaryRes, timeseriesRes, devicesRes, referrersRes, countriesRes] =
        await Promise.all([
          apiClient.get<any, AnalyticsSummaryDto>("/analytics/summary", {
            params: { linkId: linkIdFromUrl },
          }),
          apiClient.get<any, TimeseriesPointDto[]>("/analytics/timeseries", {
            params: commonParams,
          }),
          apiClient.get<any, DeviceStatsDto>("/analytics/devices", {
            params: commonParams,
          }),
          apiClient.get<any, ReferrerStatsDto[]>("/analytics/referrers", {
            params: commonParams,
          }),
          apiClient.get<any, CountryStatsDto[]>("/analytics/countries", {
            params: commonParams,
          }),
        ]);

      setSummary(summaryRes);
      setTimeseries(timeseriesRes);
      setDevices(devicesRes);
      setReferrers(referrersRes);
      setCountries(countriesRes);
    } catch (error) {
      console.error("获取统计数据失败", error);
      toast.error("加载数据看板失败，请刷新重试");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, timeRange, linkIdFromUrl]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // 切换下钻短链
  const handleSelectLink = (linkId?: string) => {
    if (linkId) {
      setSearchParams({ linkId });
    } else {
      setSearchParams({});
    }
  };

  // 导出时序数据为 CSV
  const handleExportCsv = () => {
    if (!timeseries || timeseries.length === 0) {
      toast.error("当前无可用数据可供导出");
      return;
    }

    const headers = ["时间区间", "总点击量 (PV)", "独立访客数 (UV)"];
    const rows = timeseries.map((item) => [
      `"${item.timestamp}"`,
      item.clicks,
      item.uniqueVisitors,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const targetLink = links.find((l) => l.id === linkIdFromUrl);
    const filename = `analytics_${targetLink ? targetLink.slug : "overview"}_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("时序分析数据已成功导出为 CSV");
  };

  return (
    <PageContainer
      title="数据分析中心"
      description="实时追踪多维流量转化漏斗、Recharts 平滑时序走势、访客设备与来源渠道下钻报表。"
    >
      {/* 顶部单链下钻筛选栏 */}
      <AnalyticsFilterBar
        links={links}
        selectedLinkId={linkIdFromUrl}
        onSelectLink={handleSelectLink}
      />

      {/* 核心指标卡片 */}
      <AnalyticsSummaryCards summary={summary} isLoading={isLoading} />

      {/* Recharts 时序走势图 */}
      <AnalyticsTimeseriesChart
        data={timeseries}
        timeRange={timeRange}
        onRangeChange={setTimeRange}
        onExportCsv={handleExportCsv}
        isLoading={isLoading}
      />

      {/* 底部三栏并列看板：来源渠道、设备环境、地理分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnalyticsReferrersCard data={referrers} isLoading={isLoading} />
        <AnalyticsDevicesCard data={devices} isLoading={isLoading} />
        <AnalyticsGeoCard data={countries} isLoading={isLoading} />
      </div>
    </PageContainer>
  );
};
