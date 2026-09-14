import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/shared/copy-button";
import { DomainDto } from "@/types/api";
import { apiClient } from "@/services/api";
import { extractHostRecord } from "./domain-dns-sheet";
import { toast } from "sonner";
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";

interface AddDomainWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDomainAdded: (newDomain: DomainDto) => void;
}

export const AddDomainWizardDialog: React.FC<AddDomainWizardDialogProps> = ({
  open,
  onOpenChange,
  onDomainAdded,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [domainInput, setDomainInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdDomain, setCreatedDomain] = useState<DomainDto | null>(null);
  const [verifying, setVerifying] = useState(false);

  // 重置对话框状态
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setStep(1);
        setDomainInput("");
        setErrorMsg("");
        setCreatedDomain(null);
      }, 200);
    }
    onOpenChange(newOpen);
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    let clean = domainInput.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

    if (!clean) {
      setErrorMsg("请输入要绑定的二级域名");
      return;
    }

    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!domainRegex.test(clean)) {
      setErrorMsg("请输入合法的域名格式（如 go.mybrand.com 或 link.company.cn）");
      return;
    }

    try {
      setSubmitting(true);
      const res = (await apiClient.post("/domains", { domain: clean })) as unknown as DomainDto;
      setCreatedDomain(res);
      onDomainAdded(res);
      setStep(2);
      toast.success(`域名 "${res.domain}" 已成功添加！`, {
        description: "请为该域名添加 CNAME 解析记录以完成激活。",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "添加域名失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImmediateVerify = async () => {
    if (!createdDomain) return;
    try {
      setVerifying(true);
      const verifyPromise = apiClient.post(`/domains/${createdDomain.id}/verify`) as Promise<DomainDto>;

      toast.promise(verifyPromise, {
        loading: "正在检测全球根 DNS 节点的 CNAME 解析状态...",
        success: (updated) => {
          setCreatedDomain(updated);
          onDomainAdded(updated);
          return "恭喜！DNS 解析验证通过，独立短链服务已立即激活！";
        },
        error: (err: any) => {
          return err.message || "DNS 探测超时：解析尚未完全扩散生效，您可以稍后在列表中重试";
        },
      });

      await verifyPromise;
    } catch {
      // 错误已由 toast.promise 统一处理
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <DialogHeader className="text-left space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">绑定自定义独立域名</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  使用您自己的品牌二级域名分发短链，构建更具信任感的访问体验。
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="domain-input" className="text-xs font-semibold">
                  域名地址 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="domain-input"
                    placeholder="如：go.mybrand.com 或 link.company.cn"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    className="font-mono text-sm pr-9"
                    autoFocus
                  />
                  <div className="absolute right-3 top-2.5 text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                {errorMsg && (
                  <p className="text-xs text-destructive font-medium mt-1">{errorMsg}</p>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>配置建议</span>
                </div>
                <p>建议使用独立二级域名（如 <code>go.brand.com</code> 或 <code>s.brand.com</code>），无需迁移您的根域名或企业官网。</p>
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting || !domainInput.trim()} className="gap-1.5">
                {submitting ? "正在添加..." : "下一步：配置 DNS"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader className="text-left space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  为 {createdDomain?.domain} 配置 DNS
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  请前往您的域名服务商（如阿里云、腾讯云、Cloudflare 等），添加以下 CNAME 记录。
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* DNS CNAME 参数表 */}
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 bg-muted/60 p-2.5 text-[11px] font-medium text-muted-foreground border-b border-border">
                <div className="col-span-3">类型 (Type)</div>
                <div className="col-span-4">主机记录 (Host)</div>
                <div className="col-span-5">记录值 / 目标 (Value)</div>
              </div>

              <div className="grid grid-cols-12 p-3 items-center text-xs font-mono gap-1">
                <div className="col-span-3 font-semibold text-foreground flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <span>CNAME</span>
                </div>
                <div className="col-span-4 flex items-center justify-between pr-2 font-semibold text-foreground">
                  <span className="truncate">{extractHostRecord(createdDomain?.domain || "")}</span>
                  <CopyButton
                    text={extractHostRecord(createdDomain?.domain || "")}
                    label=""
                    size="sm"
                  />
                </div>
                <div className="col-span-5 flex items-center justify-between font-semibold text-foreground">
                  <span className="truncate">{createdDomain?.cnameTarget || "cname.art.link"}</span>
                  <CopyButton
                    text={createdDomain?.cnameTarget || "cname.art.link"}
                    label=""
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {createdDomain?.isVerified ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>DNS 解析与 SSL 证书均已验证就绪，域名已可正式用于生成短链！</span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ⏱️ 配置完成后，DNS 变更通常在 5~30 分钟内全球生效。您可以立即点击“检测验证”，或关闭本弹窗稍后在域名列表中验证。
              </p>
            )}

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {createdDomain?.isVerified ? "完成" : "稍后在列表中验证"}
              </Button>
              {!createdDomain?.isVerified && (
                <Button
                  type="button"
                  onClick={handleImmediateVerify}
                  disabled={verifying}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${verifying ? "animate-spin" : ""}`} />
                  <span>{verifying ? "正在检测全球解析..." : "立即检测验证"}</span>
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
