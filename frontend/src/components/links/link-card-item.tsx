import React from "react";
import { ShortLinkDto } from "@/types/api";
import { CopyButton } from "@/components/shared/copy-button";
import { LinkStatusBadge } from "@/components/shared/link-status-badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MousePointerClick,
  Users,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Globe,
  QrCode,
  Clock,
} from "lucide-react";
import { formatRemainingTime } from "@/lib/link-status";

interface LinkCardItemProps {
  link: ShortLinkDto;
  onEdit: (link: ShortLinkDto) => void;
  onDelete: (link: ShortLinkDto) => void;
  onToggleStatus: (link: ShortLinkDto) => void;
  onOpenQrCode: (link: ShortLinkDto) => void;
}

export const LinkCardItem: React.FC<LinkCardItemProps> = ({
  link,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenQrCode,
}) => {
  // 提取目标 URL 的主域名用于展示 favicon 占位
  let hostname = "";
  try {
    hostname = new URL(link.originalUrl).hostname;
  } catch {
    hostname = link.domain;
  }

  const formattedDate = link.createdAt
    ? new Date(link.createdAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs hover:border-border/80 hover:shadow-sm transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* 左侧主要信息区 */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* 站点图标占位/Logo */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground"
            title={`目标站点: ${hostname}`}
          >
            <Globe className="h-5 w-5 text-muted-foreground/70" />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* 短链地址 + 复制 + 状态胶囊 */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <a
                href={link.fullShortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-base font-semibold text-foreground tracking-tight hover:underline flex items-center gap-1 group"
              >
                <span>{link.fullShortUrl}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-70 transition-opacity" />
              </a>

              <CopyButton text={link.fullShortUrl} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenQrCode(link)}
                className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                title="定制与下载专属动态二维码"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span className="sr-only">二维码</span>
              </Button>
              <LinkStatusBadge
                isEnabled={link.isEnabled}
                hasPassword={link.hasPassword}
                expiresAt={link.expiresAt}
              />
            </div>

            {/* 标题 */}
            {link.title && (
              <div className="text-sm font-medium text-foreground truncate max-w-xl">
                {link.title}
              </div>
            )}

            {/* 目标长链接 */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono truncate max-w-2xl">
              <span className="text-muted-foreground/60 shrink-0">目标:</span>
              <a
                href={link.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground hover:underline truncate"
                title={link.originalUrl}
              >
                {link.originalUrl}
              </a>
            </div>

            {/* 描述、有效期与创建日期 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5 flex-wrap">
              {link.description && (
                <span className="truncate max-w-md text-muted-foreground/80">
                  {link.description}
                </span>
              )}
              {link.expiresAt && (
                <span
                  className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80"
                  title={`失效时间: ${link.expiresAt}`}
                >
                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                  <span>{formatRemainingTime(link.expiresAt)}</span>
                </span>
              )}
              {formattedDate && (
                <span className="flex items-center gap-1 text-muted-foreground/60 font-mono text-[11px]">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 右侧指标数据与交互操作区 */}
        <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-5 border-t lg:border-t-0 pt-3 lg:pt-0 border-border/60 shrink-0">
          {/* 数据指标胶囊 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PV 点击量 */}
            <div
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground"
              title="页面访问总量 (PV)"
            >
              <MousePointerClick className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {link.pvCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">点击</span>
            </div>

            {/* UV 独立访客 */}
            <div
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground"
              title="独立访客总数 (UV，IP+UA去重)"
            >
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {link.uvCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">访客</span>
            </div>
          </div>

          {/* 启停 Switch 开关 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {link.isEnabled ? "已启用" : "已暂停"}
            </span>
            <Switch
              checked={link.isEnabled}
              onCheckedChange={() => onToggleStatus(link)}
              aria-label="切换短链启用状态"
            />
          </div>

          {/* 更多操作菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">更多操作</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(link)} className="gap-2 text-xs">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                <span>编辑短链属性</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenQrCode(link)} className="gap-2 text-xs">
                <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                <span>定制专属二维码</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(link.originalUrl, "_blank")}
                className="gap-2 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <span>访问目标长链接</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(link)}
                className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>删除此短链</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
