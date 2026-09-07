import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/services/api";
import { ShortLinkDto } from "@/types/api";
import { Link2, Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface QuickShortenBarProps {
  defaultDomain?: string;
  onLinkCreated: (link: ShortLinkDto) => void;
}

export const QuickShortenBar: React.FC<QuickShortenBarProps> = ({
  defaultDomain = "art.link",
  onLinkCreated,
}) => {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState<ShortLinkDto | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetUrl = url.trim();
    if (!targetUrl) return;

    // 自动补齐协议或进行标准校验
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      setSubmitting(true);
      const res = (await apiClient.post("/links", {
        domain: defaultDomain,
        originalUrl: targetUrl,
      })) as ShortLinkDto;

      setUrl("");
      setJustCreated(res);
      onLinkCreated(res);
      toast.success("短链已极速生成！", {
        description: `短链地址：${res.fullShortUrl}`,
      });

      // 3秒后重置刚刚生成的提示条
      setTimeout(() => {
        setJustCreated((prev) => (prev?.id === res.id ? null : prev));
      }, 5000);
    } catch (err: any) {
      toast.error("生成短链失败", {
        description: err.message || "请检查网络或目标地址格式",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyRecentLink = async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.fullShortUrl);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择复制");
    }
  };

  return (
    <div className="w-full mb-6">
      <div className="relative rounded-xl border border-border bg-card p-2 sm:p-2.5 shadow-sm transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full flex items-center">
            <Link2 className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="粘贴长链接 (https://...)，按 Enter 键一键缩短..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10 pr-4 h-10 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm"
              disabled={submitting}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="hidden md:inline-flex text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
              默认域名: {defaultDomain}
            </span>
            <Button
              type="submit"
              disabled={!url.trim() || submitting}
              className="gap-1.5 h-10 px-5 text-sm font-medium w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>一键缩短</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 刚刚生成成功的快捷高亮条 */}
      {justCreated && (
        <div className="mt-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <Check className="h-3 w-3" />
            </span>
            <span className="text-muted-foreground">刚刚生成：</span>
            <span className="font-mono font-semibold text-emerald-600 truncate">
              {justCreated.fullShortUrl}
            </span>
            <span className="text-muted-foreground truncate hidden sm:inline">
              ➔ {justCreated.originalUrl}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyRecentLink}
            className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 shrink-0"
          >
            点击复制
          </Button>
        </div>
      )}
    </div>
  );
};
