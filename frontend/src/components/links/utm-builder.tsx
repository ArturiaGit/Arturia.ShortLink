import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

interface UtmParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

interface UtmBuilderProps {
  originalUrl: string;
  onUrlChange: (newUrl: string) => void;
}

const SOURCE_PRESETS = [
  { label: "微信", value: "wechat" },
  { label: "Google", value: "google" },
  { label: "Twitter", value: "twitter" },
  { label: "小红书", value: "xiaohongshu" },
  { label: "邮件推送", value: "newsletter" },
  { label: "知乎", value: "zhihu" },
];

const MEDIUM_PRESETS = [
  { label: "信息流广告", value: "cpc" },
  { label: "社交分享", value: "social" },
  { label: "邮件", value: "email" },
  { label: "物料Banner", value: "banner" },
  { label: "文章内链", value: "referral" },
];

/**
 * 从 URL 中解析 UTM 参数与纯净的基础 URL
 */
function parseUrlUtm(urlStr: string): { base: string; params: UtmParams } {
  const defaultParams: UtmParams = {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  };

  if (!urlStr) return { base: "", params: defaultParams };

  try {
    const hasProtocol = /^https?:\/\//i.test(urlStr);
    const parsed = new URL(hasProtocol ? urlStr : `https://${urlStr}`);
    const source = parsed.searchParams.get("utm_source") || "";
    const medium = parsed.searchParams.get("utm_medium") || "";
    const campaign = parsed.searchParams.get("utm_campaign") || "";
    const term = parsed.searchParams.get("utm_term") || "";
    const content = parsed.searchParams.get("utm_content") || "";

    return {
      base: `${parsed.origin}${parsed.pathname}`,
      params: {
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_term: term,
        utm_content: content,
      },
    };
  } catch {
    return { base: urlStr, params: defaultParams };
  }
}

/**
 * 将 UTM 参数拼接回目标 URL 中（保留非 UTM 的已有参数与 hash）
 */
function assembleUrl(currentUrl: string, params: UtmParams): string {
  if (!currentUrl.trim()) return "";
  try {
    const hasProtocol = /^https?:\/\//i.test(currentUrl);
    const parsed = new URL(hasProtocol ? currentUrl : `https://${currentUrl}`);

    // 更新或删除对应的 UTM 参数
    const keys: (keyof UtmParams)[] = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ];

    keys.forEach((key) => {
      const val = params[key].trim();
      if (val) {
        parsed.searchParams.set(key, val);
      } else {
        parsed.searchParams.delete(key);
      }
    });

    const result = parsed.toString();
    // 若原输入没有协议头，返回时也尽量保持友好
    return hasProtocol ? result : result.replace(/^https?:\/\//i, "");
  } catch {
    return currentUrl;
  }
}

export const UtmBuilder: React.FC<UtmBuilderProps> = ({
  originalUrl,
  onUrlChange,
}) => {
  const [params, setParams] = useState<UtmParams>({
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  });

  const [copied, setCopied] = useState(false);

  // 当外部 originalUrl 变化时，逆向同步解析 UTM
  useEffect(() => {
    const { params: extracted } = parseUrlUtm(originalUrl);
    setParams((prev) => {
      // 深度浅对比，防止输入循环
      if (
        prev.utm_source === extracted.utm_source &&
        prev.utm_medium === extracted.utm_medium &&
        prev.utm_campaign === extracted.utm_campaign &&
        prev.utm_term === extracted.utm_term &&
        prev.utm_content === extracted.utm_content
      ) {
        return prev;
      }
      return extracted;
    });
  }, [originalUrl]);

  // 修改单个参数并向上同步
  const handleParamChange = useCallback(
    (field: keyof UtmParams, value: string) => {
      const nextParams = { ...params, [field]: value };
      setParams(nextParams);
      const newUrl = assembleUrl(originalUrl, nextParams);
      if (newUrl !== originalUrl) {
        onUrlChange(newUrl);
      }
    },
    [params, originalUrl, onUrlChange]
  );

  // 清空所有 UTM 参数
  const handleClearAll = () => {
    const cleared: UtmParams = {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
    };
    setParams(cleared);
    const newUrl = assembleUrl(originalUrl, cleared);
    onUrlChange(newUrl);
    toast.success("已清除所有 UTM 营销参数");
  };

  // 复制组装后的预览长链
  const handleCopyPreview = () => {
    if (!originalUrl) return;
    navigator.clipboard.writeText(originalUrl);
    setCopied(true);
    toast.success("完整营销链接已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  // 统计已填写的有效参数数量
  const filledCount = useMemo(() => {
    return Object.values(params).filter((v) => v.trim().length > 0).length;
  }, [params]);

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-card/60 p-4 text-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            UTM 营销参数构建器
          </span>
          {filledCount > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              已配置 {filledCount} 项
            </Badge>
          )}
        </div>
        {filledCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            清空参数
          </Button>
        )}
      </div>

      {/* 参数表单输入矩阵 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* utm_source */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
              <span>广告来源 (utm_source)</span>
              <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">如: google, wechat, newsletter</span>
          </div>
          <Input
            value={params.utm_source}
            onChange={(e) => handleParamChange("utm_source", e.target.value)}
            placeholder="例如: google 或 twitter"
            className="h-8 text-xs font-mono"
          />
          {/* 快捷来源标签 */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-muted-foreground/70">快速填入:</span>
            {SOURCE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleParamChange("utm_source", p.value)}
                className={`rounded border px-1.5 py-0.5 text-[10px] transition-colors ${
                  params.utm_source === p.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* utm_medium */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
              <span>营销媒介 (utm_medium)</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">如: cpc, email</span>
          </div>
          <Input
            value={params.utm_medium}
            onChange={(e) => handleParamChange("utm_medium", e.target.value)}
            placeholder="例如: cpc 或 social"
            className="h-8 text-xs font-mono"
          />
          {/* 快捷媒介标签 */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {MEDIUM_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleParamChange("utm_medium", p.value)}
                className={`rounded border px-1.5 py-0.5 text-[10px] transition-colors ${
                  params.utm_medium === p.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* utm_campaign */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground">
              活动名称 (utm_campaign)
            </Label>
            <span className="text-[11px] text-muted-foreground">如: spring_sale</span>
          </div>
          <Input
            value={params.utm_campaign}
            onChange={(e) => handleParamChange("utm_campaign", e.target.value)}
            placeholder="例如: 2026_spring_launch"
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* utm_term */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground">
              关键词 (utm_term)
            </Label>
            <span className="text-[11px] text-muted-foreground">如: saas_tools</span>
          </div>
          <Input
            value={params.utm_term}
            onChange={(e) => handleParamChange("utm_term", e.target.value)}
            placeholder="搜索竞价广告关键词 (可选)"
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* utm_content */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground">
              物料标识 (utm_content)
            </Label>
            <span className="text-[11px] text-muted-foreground">如: top_banner</span>
          </div>
          <Input
            value={params.utm_content}
            onChange={(e) => handleParamChange("utm_content", e.target.value)}
            placeholder="A/B 测试物料或按键标识 (可选)"
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      {/* 底部实时动态拼接预览区 */}
      <div className="space-y-1.5 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            拼接后完整目标链接预览
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyPreview}
              className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>复制长链</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="relative rounded-md border border-border bg-muted/60 p-2.5 font-mono text-[11px] text-foreground/90 break-all leading-relaxed select-all max-h-24 overflow-y-auto">
          {originalUrl || (
            <span className="text-muted-foreground/60 italic">
              请先在上方输入目标长链接，在此实时预览拼接效果
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
