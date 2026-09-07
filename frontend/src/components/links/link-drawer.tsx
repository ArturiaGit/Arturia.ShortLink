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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShortLinkDto, DomainDto, CheckSlugResultDto } from "@/types/api";
import { apiClient } from "@/services/api";
import { UtmBuilder } from "./utm-builder";
import { formatRemainingTime } from "@/lib/link-status";
import { toast } from "sonner";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Link as LinkIcon,
  Sparkles,
  ChevronDown,
  Eye,
  EyeOff,
  Clock,
  Calendar,
  Share2,
  KeyRound,
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

  // 基础表单状态
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

  // 营销增强：折叠面板展开状态
  const [utmOpen, setUtmOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [expirationOpen, setExpirationOpen] = useState(false);

  // 营销增强：密码与有效期字段
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expiresAtLocal, setExpiresAtLocal] = useState("");

  // 提交中状态
  const [submitting, setSubmitting] = useState(false);

  // 将 ISO 时间转为 datetime-local input 所需格式 YYYY-MM-DDTHH:mm
  const formatForDatetimeLocal = (isoString?: string | null): string => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

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

        // 密码
        const hasPwd = Boolean(initialLink.hasPassword);
        setEnablePassword(hasPwd);
        setPassword(initialLink.password || "");
        if (hasPwd) setPasswordOpen(true);

        // 到期时间
        const hasExp = Boolean(initialLink.expiresAt);
        setEnableExpiration(hasExp);
        setExpiresAtLocal(formatForDatetimeLocal(initialLink.expiresAt));
        if (hasExp) setExpirationOpen(true);

        // 如果原有链接中已有 UTM 参数，自动展开 UTM 面板
        if (/[?&]utm_/i.test(initialLink.originalUrl)) {
          setUtmOpen(true);
        }
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

        setEnablePassword(false);
        setPassword("");
        setShowPassword(false);
        setPasswordOpen(false);

        setEnableExpiration(false);
        setExpiresAtLocal("");
        setExpirationOpen(false);

        setUtmOpen(false);
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

  // 快捷设置有效期
  const handleQuickExpire = (hoursToAdd: number) => {
    const target = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    setExpiresAtLocal(formatForDatetimeLocal(target.toISOString()));
    setEnableExpiration(true);
    toast.success(`已设置到期时间为 ${hoursToAdd} 小时后`);
  };

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

    // 校验密码
    if (enablePassword && !password.trim()) {
      toast.error("您已勾选密码保护，请输入有效的访问密码");
      return;
    }

    // 校验到期时间
    let finalExpiresAt: string | null = null;
    if (enableExpiration) {
      if (!expiresAtLocal) {
        toast.error("您已开启到期时间控制，请选择有效的失效日期");
        return;
      }
      const expDate = new Date(expiresAtLocal);
      if (isNaN(expDate.getTime())) {
        toast.error("请选择正确的到期时间格式");
        return;
      }
      finalExpiresAt = expDate.toISOString();
    }

    try {
      setSubmitting(true);
      if (isEdit && initialLink) {
        // 编辑模式
        const res = (await apiClient.put(`/links/${initialLink.id}`, {
          originalUrl: targetUrl,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          hasPassword: enablePassword,
          password: enablePassword ? password.trim() : undefined,
          expiresAt: finalExpiresAt,
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
          password: enablePassword ? password.trim() : undefined,
          expiresAt: finalExpiresAt,
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
      <SheetContent
        side="right"
        className="sm:max-w-xl flex flex-col h-full p-0 overflow-hidden"
      >
        {/* 固定顶栏 */}
        <SheetHeader className="p-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-xl font-semibold">
            {isEdit ? "编辑短链属性" : "创建新短链"}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {isEdit
              ? "更新目标重定向地址、营销 UTM 与安全访问控制。"
              : "配置目标网址、自定义别名或使用自动生成的 Base62 短码。"}
          </SheetDescription>
        </SheetHeader>

        {/* 可滚动表单区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="link-form" onSubmit={handleSubmit} className="space-y-5">
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
                      <SelectItem
                        key={d.id}
                        value={d.domain}
                        className="font-mono text-sm"
                      >
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
                className="resize-none h-16 text-sm"
              />
            </div>

            {/* 分割线：营销增强工具箱 */}
            <div className="pt-2">
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-border/80"></div>
                <span className="flex-shrink mx-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  营销增强与安全套件
                </span>
                <div className="flex-grow border-t border-border/80"></div>
              </div>
            </div>

            {/* 折叠卡片 1：UTM 营销参数构建器 */}
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setUtmOpen(!utmOpen)}
                className="w-full flex items-center justify-between p-3.5 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  <span className="text-foreground">UTM 营销参数构建器</span>
                  {/[?&]utm_/i.test(originalUrl) && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      已注入参数
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    utmOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {utmOpen && (
                <div className="p-3.5 pt-0 border-t border-border/60">
                  <UtmBuilder
                    originalUrl={originalUrl}
                    onUrlChange={setOriginalUrl}
                  />
                </div>
              )}
            </div>

            {/* 折叠卡片 2：访问密码保护 */}
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-3.5">
                <button
                  type="button"
                  onClick={() => setPasswordOpen(!passwordOpen)}
                  className="flex items-center gap-2 text-left text-sm font-medium text-foreground flex-1"
                >
                  <KeyRound className="h-4 w-4 text-amber-500" />
                  <span>访问密码保护</span>
                  {enablePassword && (
                    <Badge
                      variant="info"
                      className="px-1.5 py-0 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      已开启
                    </Badge>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={enablePassword}
                    onCheckedChange={(checked) => {
                      setEnablePassword(checked);
                      if (checked) setPasswordOpen(true);
                    }}
                    aria-label="开启短链访问密码保护"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(!passwordOpen)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        passwordOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {passwordOpen && (
                <div className="p-3.5 pt-0 border-t border-border/60 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    为短链设定独立的访问密码。外部访客必须在专属解锁卡片中输入正确密码后方可跳转。
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">
                      访问解锁密码
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        disabled={!enablePassword}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="请输入 4~20 位访问密码"
                        className="pr-10 text-xs font-mono"
                      />
                      <button
                        type="button"
                        disabled={!enablePassword}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 折叠卡片 3：链接有效期配置 (TTL) */}
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-3.5">
                <button
                  type="button"
                  onClick={() => setExpirationOpen(!expirationOpen)}
                  className="flex items-center gap-2 text-left text-sm font-medium text-foreground flex-1"
                >
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>链接有效期控制 (TTL)</span>
                  {enableExpiration && (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      已开启
                    </Badge>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={enableExpiration}
                    onCheckedChange={(checked) => {
                      setEnableExpiration(checked);
                      if (checked) setExpirationOpen(true);
                    }}
                    aria-label="开启短链到期时间控制"
                  />
                  <button
                    type="button"
                    onClick={() => setExpirationOpen(!expirationOpen)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        expirationOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {expirationOpen && (
                <div className="p-3.5 pt-0 border-t border-border/60 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    设定精确到分钟的到期时间。到达指定时刻后短链自动失效，访客将看到已过期提示。
                  </p>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>指定到期时刻 (精确到分)</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      disabled={!enableExpiration}
                      value={expiresAtLocal}
                      onChange={(e) => setExpiresAtLocal(e.target.value)}
                      className="text-xs font-mono"
                    />

                    {/* 快捷设置预设 */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground/70">
                        快捷时长:
                      </span>
                      <button
                        type="button"
                        disabled={!enableExpiration}
                        onClick={() => handleQuickExpire(24)}
                        className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        +24 小时
                      </button>
                      <button
                        type="button"
                        disabled={!enableExpiration}
                        onClick={() => handleQuickExpire(7 * 24)}
                        className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        +7 天
                      </button>
                      <button
                        type="button"
                        disabled={!enableExpiration}
                        onClick={() => handleQuickExpire(30 * 24)}
                        className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        +30 天
                      </button>
                    </div>

                    {enableExpiration && expiresAtLocal && (
                      <div className="rounded border border-border/60 bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        状态预估:{" "}
                        <span className="font-medium text-foreground">
                          {formatRemainingTime(
                            new Date(expiresAtLocal).toISOString()
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* 固定底栏 */}
        <SheetFooter className="p-6 pt-4 border-t border-border shrink-0 bg-background flex flex-row items-center justify-end gap-3">
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
