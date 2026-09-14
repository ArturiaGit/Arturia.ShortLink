import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import { DomainDto } from "@/types/api";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import {
  Globe,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Lock,
} from "lucide-react";

interface DomainDnsSheetProps {
  domain: DomainDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerifySuccess: (updated: DomainDto) => void;
}

export function extractHostRecord(domainStr: string): string {
  if (!domainStr) return "@";
  const clean = domainStr.trim().toLowerCase();
  const parts = clean.split(".");
  if (parts.length <= 2) {
    return "@";
  }
  return parts.slice(0, parts.length - 2).join(".");
}

export const DomainDnsSheet: React.FC<DomainDnsSheetProps> = ({
  domain,
  open,
  onOpenChange,
  onVerifySuccess,
}) => {
  const [verifying, setVerifying] = useState(false);

  if (!domain) return null;

  const hostRecord = extractHostRecord(domain.domain);
  const cnameTarget = domain.cnameTarget || "cname.art.link";

  const handleVerify = async (simulateFail = false) => {
    try {
      setVerifying(true);
      const url = `/domains/${domain.id}/verify${simulateFail ? "?simulateFail=true" : ""}`;

      const verifyPromise = apiClient.post(url) as Promise<DomainDto>;

      toast.promise(verifyPromise, {
        loading: "正在向全球 DNS 根服务器查询 CNAME 记录与 SSL 证书...",
        success: (res) => {
          onVerifySuccess(res);
          return "域名 DNS 解析验证通过！已成功激活独立短链服务";
        },
        error: (err: any) => {
          return err.message || "DNS 探测超时：未能查询到有效的 CNAME 解析记录，请确认已在域名商处保存";
        },
      });

      await verifyPromise;
    } catch {
      // 错误已由 toast.promise 统一捕获展示
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col justify-between overflow-y-auto p-6">
        <div>
          <SheetHeader className="space-y-2 pb-4 border-b border-border text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-mono font-semibold text-foreground">
                  {domain.domain}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  配置 DNS CNAME 记录以激活专属独立短链分发服务
                </SheetDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {domain.isSystem ? (
                <Badge variant="secondary">平台共享基础设施</Badge>
              ) : (
                <Badge variant="outline">品牌独立自定义域名</Badge>
              )}

              {domain.isVerified ? (
                <Badge variant="success" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>已验证生效 (Active)</span>
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <Clock className="h-3 w-3" />
                  <span>等待 DNS 解析生效 (Pending)</span>
                </Badge>
              )}

              {domain.isPrimary && (
                <Badge variant="default" className="text-[11px]">
                  工作空间主域名
                </Badge>
              )}

              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span>SSL: {domain.sslStatus || "Active"}</span>
              </Badge>
            </div>
          </SheetHeader>

          {/* 解析状态 Banner */}
          <div className="mt-5">
            {domain.isVerified ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 flex items-start gap-3 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs">DNS 路由与 SSL 证书均已配置完毕</div>
                  <div className="text-xs leading-relaxed text-emerald-700/80 dark:text-emerald-400/80">
                    该域名当前正作为高可用短链网关平稳运行，所有指向该域名的短链请求均将在毫秒级完成 302 重定向。
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 flex items-start gap-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs">尚未检测到全球 DNS 解析生效</div>
                  <div className="text-xs leading-relaxed text-amber-700/80 dark:text-amber-400/80">
                    请登录您的域名注册商（如阿里云、腾讯云 DNSPod、Cloudflare、GoDaddy 等），添加下方表格所示的 CNAME 记录。
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DNS 配置表格 */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                DNS 解析记录配置参数
              </h4>
              <span className="text-[11px] text-muted-foreground font-mono">
                TTL: 自动 / 600 秒
              </span>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 bg-muted/50 p-2.5 text-[11px] font-medium text-muted-foreground border-b border-border">
                <div className="col-span-3">记录类型 (Type)</div>
                <div className="col-span-4">主机记录 (Host)</div>
                <div className="col-span-5">记录值 / 目标 (Value)</div>
              </div>

              <div className="grid grid-cols-12 p-3 items-center text-xs font-mono gap-1 hover:bg-muted/20 transition-colors">
                <div className="col-span-3 font-semibold text-foreground flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <span>CNAME</span>
                </div>
                <div className="col-span-4 flex items-center justify-between pr-2 text-foreground font-semibold">
                  <span className="truncate">{hostRecord}</span>
                  <CopyButton text={hostRecord} label="" size="sm" />
                </div>
                <div className="col-span-5 flex items-center justify-between text-muted-foreground">
                  <span className="truncate text-foreground font-semibold">{cnameTarget}</span>
                  <CopyButton text={cnameTarget} label="" size="sm" />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 space-y-1">
              <p>💡 <strong>配置贴士</strong>：若您的域名为完整二级域名（如 <code>{domain.domain}</code>），请在主机记录中填写 <code>{hostRecord}</code>，解析类型选择 <code>CNAME</code>，指向值填写 <code>{cnameTarget}</code>。</p>
              <p>⏱️ 全球根 DNS 节点传播通常需 <strong>5~30 分钟</strong>。若刚添加完毕，请稍候再试。</p>
            </div>
          </div>

          {/* 排错与常见问题帮助 */}
          <div className="mt-6 rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span>常见解析排错指南</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
              <li><strong>记录冲突</strong>：请确认该主机记录下未同时配置过 A 记录或 AAAA 记录，否则 CNAME 解析会发生冲突失效。</li>
              <li><strong>Cloudflare 用户</strong>：请将代理状态设置为 <strong>仅 DNS (DNS Only / 灰色云朵)</strong>，暂勿开启 CDN 代理加速。</li>
              <li><strong>免费 SSL 证书</strong>：DNS 解析验证通过后，系统将在 3 分钟内自动签发并配置 Let's Encrypt SSL 加密证书。</li>
            </ul>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <SheetFooter className="mt-8 border-t border-border pt-4 flex flex-col sm:flex-row gap-2.5">
          {/* 测试排错模拟开关（便于走查异常处理链路） */}
          <Button
            variant="outline"
            size="sm"
            disabled={verifying}
            onClick={() => handleVerify(true)}
            className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span>模拟未生效排错</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={verifying}
            onClick={() => handleVerify(false)}
            className="gap-1.5 flex-1"
          >
            <RefreshCw className={`h-4 w-4 ${verifying ? "animate-spin" : ""}`} />
            <span>{verifying ? "正在检测全球 DNS..." : "立即检测并验证"}</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
