import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShortLinkDto, DomainDto, CheckSlugResultDto } from "@/types/api";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";

interface LinkDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialLink?: ShortLinkDto | null;
  domains: DomainDto[];
  onSuccess: (link: ShortLinkDto) => void;
}

export const LinkDrawer: React.FC<LinkDrawerProps> = ({
  open,
  onOpenChange,
  mode,
  initialLink,
  domains,
  onSuccess,
}) => {
  const isEdit = mode === "edit";

  // 表单状态
  const [domain, setDomain] = useState("art.link");
  const [originalUrl, setOriginalUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // 别名查重状态
  const [slugCheckStatus, setSlugCheckStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [slugCheckMsg, setSlugCheckMsg] = useState("");

  // 提交中状态
  const [submitting, setSubmitting] = useState(false);

  // 初始化填充数据
  useEffect(() => {
    if (open) {
      if (isEdit && initialLink) {
        setDomain(initialLink.domain);
        setOriginalUrl(initialLink.originalUrl);
        setSlug(initialLink.slug);
        setTitle(initialLink.title);
        setDescription(initialLink.description || "");
        setSlugCheckStatus("idle");
        setSlugCheckMsg("");
      } else {
        // 新建模式重置
        const defaultDom = domains.length > 0 ? domains[0].domain : "art.link";
        setDomain(defaultDom);
        setOriginalUrl("");
        setSlug("");
        setTitle("");
        setDescription("");
        setSlugCheckStatus("idle");
        setSlugCheckMsg("");
      }
    }
  }, [open, isEdit, initialLink, domains]);

  // 自定义别名 300ms 防抖查重
  useEffect(() => {
    if (isEdit) return; // 编辑模式别名只读，无需查重

    const trimmedSlug = slug.trim();
    if (!trimmedSlug) {
      setSlugCheckStatus("idle");
      setSlugCheckMsg("");
      return;
    }

    // 格式前端粗检
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(trimmedSlug)) {
      setSlugCheckStatus("taken");
      setSlugCheckMsg("短码需为 3~32 位字母、数字、短横线或下划线");
      return;
    }

    setSlugCheckStatus("checking");
    setSlugCheckMsg("正在检测唯一性...");

    const timer = setTimeout(async () => {
      try {
        const res = (await apiClient.get(
          `/links/check-slug?domain=${encodeURIComponent(
            domain
          )}&slug=${encodeURIComponent(trimmedSlug)}`
        )) as CheckSlugResultDto;

        if (res.available) {
          setSlugCheckStatus("available");
          setSlugCheckMsg("该别名可用");
        } else {
          setSlugCheckStatus("taken");
          setSlugCheckMsg(res.message || "该别名已被占用");
        }
      } catch {
        setSlugCheckStatus("idle");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [slug, domain, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetUrl = originalUrl.trim();
    if (!targetUrl) {
      toast.error("请输入目标长链接");
      return;
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    if (!isEdit && slugCheckStatus === "taken") {
      toast.error("当前别名不可用，请更换后再试");
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && initialLink) {
        // 编辑模式：Slug与域名不可更改，仅更新长链接与说明
        const res = (await apiClient.put(`/links/${initialLink.id}`, {
          originalUrl: targetUrl,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        })) as ShortLinkDto;

        toast.success("短链已更新成功");
        onSuccess(res);
        onOpenChange(false);
      } else {
        // 新建模式
        const res = (await apiClient.post("/links", {
          domain,
          slug: slug.trim() || undefined,
          originalUrl: targetUrl,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        })) as ShortLinkDto;

        toast.success("短链创建成功", {
          description: `短链地址：${res.fullShortUrl}`,
        });
        onSuccess(res);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(isEdit ? "更新短链失败" : "创建短链失败", {
        description: err.message || "请稍后重试",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl flex flex-col justify-between p-6">
        <div>
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-xl font-semibold">
              {isEdit ? "编辑短链属性" : "创建新短链"}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {isEdit
                ? "更新目标重定向地址与展示信息。为保障投放稳定性，短码与归属域名已锁定不可变。"
                : "配置目标网址、自定义别名或使用自动生成的 Base62 短码。"}
            </SheetDescription>
          </SheetHeader>

          <form id="link-form" onSubmit={handleSubmit} className="space-y-5 py-6">
            {/* 归属域名 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>归属域名</span>
                </span>
                {isEdit && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    域名已永久锁定
                  </span>
                )}
              </Label>
              {isEdit ? (
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-mono">
                  <span>{domain}</span>
                  <Lock className="h-4 w-4 text-muted-foreground/60" />
                </div>
              ) : (
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger className="w-full font-mono text-sm">
                    <SelectValue placeholder="选择域名" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => (
                      <SelectItem key={d.id} value={d.domain} className="font-mono text-sm">
                        {d.domain} {d.isSystem && "(默认系统域名)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 目标长链接 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span>目标长链接 (Destination URL)</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                placeholder="https://yourbrand.com/landing-page-2026"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                访客访问短链后将通过 302 临时重定向立即跳转至该目标长地址。
              </p>
            </div>

            {/* 短码 Slug */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span>短码别名 (Slug)</span>
                </span>
                {isEdit && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    别名不可修改
                  </span>
                )}
              </Label>

              {isEdit ? (
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-mono">
                  <span>/{slug}</span>
                  <Lock className="h-4 w-4 text-muted-foreground/60" />
                </div>
              ) : (
                <div className="relative">
                  <div className="flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs font-mono">
                      {domain}/
                    </span>
                    <Input
                      type="text"
                      placeholder="留空自动生成 6 位短码"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="rounded-l-none font-mono text-sm pr-9"
                    />
                  </div>

                  {/* 查重指示图标 */}
                  <div className="absolute right-3 top-2.5 flex items-center pointer-events-none">
                    {slugCheckStatus === "checking" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {slugCheckStatus === "available" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    {slugCheckStatus === "taken" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              )}

              {!isEdit && slugCheckMsg && (
                <div
                  className={`text-xs flex items-center gap-1 mt-1 ${
                    slugCheckStatus === "available"
                      ? "text-emerald-600 font-medium"
                      : slugCheckStatus === "taken"
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {slugCheckMsg}
                </div>
              )}
            </div>

            {/* 短链标题 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">短链标题 (Title)</Label>
              <Input
                type="text"
                placeholder="例如：春季线上大促活动推广专页"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* 备注说明 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">备注说明 (Description)</Label>
              <Textarea
                placeholder="记录营销投放渠道、受众或内部备注信息..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none h-20 text-sm"
              />
            </div>
          </form>
        </div>

        <SheetFooter className="pt-4 border-t border-border mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            type="submit"
            form="link-form"
            disabled={submitting || (!isEdit && slugCheckStatus === "taken")}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isEdit ? "保存更改" : "立即创建短链"}</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
