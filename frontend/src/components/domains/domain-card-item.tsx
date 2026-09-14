import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DomainDto } from "@/types/api";
import {
  Globe,
  ShieldCheck,
  Clock,
  ExternalLink,
  MoreVertical,
  Star,
  Trash2,
  Settings2,
  Lock,
  Link2,
  RefreshCw,
} from "lucide-react";

interface DomainCardItemProps {
  domain: DomainDto;
  onOpenDnsSheet: (domain: DomainDto) => void;
  onVerify: (domain: DomainDto) => void;
  onSetPrimary: (domain: DomainDto) => void;
  onOpenDeleteDialog: (domain: DomainDto) => void;
  isVerifying?: boolean;
}

export const DomainCardItem: React.FC<DomainCardItemProps> = ({
  domain,
  onOpenDnsSheet,
  onVerify,
  onSetPrimary,
  onOpenDeleteDialog,
  isVerifying = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-4 border-b border-border/80 last:border-b-0">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5">
          <Globe className="h-5 w-5" />
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-semibold text-foreground tracking-tight">
              {domain.domain}
            </span>

            {domain.isSystem ? (
              <Badge variant="secondary" className="text-[10px]">
                平台共享域名
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                独立品牌域名
              </Badge>
            )}

            {domain.isPrimary && (
              <Badge variant="default" className="text-[10px] gap-1 bg-primary text-primary-foreground">
                <Star className="h-3 w-3 fill-current" />
                <span>空间主域名</span>
              </Badge>
            )}

            {domain.isVerified ? (
              <Badge variant="success" className="text-[10px] gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>已生效 (Active)</span>
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px] gap-1">
                <Clock className="h-3 w-3" />
                <span>等待 CNAME 解析</span>
              </Badge>
            )}

            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
              <Lock className="h-3 w-3 text-emerald-600" />
              <span>SSL: {domain.sslStatus || "Active"}</span>
            </Badge>

            {domain.linkCount !== undefined && domain.linkCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground font-mono">
                <Link2 className="h-3 w-3" />
                <span>{domain.linkCount} 条短链</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>CNAME 目标:</span>
            <span className="text-foreground font-medium select-all">
              {domain.cnameTarget || "cname.art.link"}
            </span>
            <CopyButton
              text={domain.cnameTarget || "cname.art.link"}
              label=""
              size="sm"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {/* 未生效时突出的立即验证主操作 */}
        {!domain.isVerified && (
          <Button
            variant="default"
            size="sm"
            disabled={isVerifying}
            onClick={() => onVerify(domain)}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "正在检测..." : "立即验证"}</span>
          </Button>
        )}

        {/* 配置指引抽屉触发器 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenDnsSheet(domain)}
          className="gap-1.5 h-8 text-xs"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>配置指引</span>
        </Button>

        {/* 设为主域名快捷按钮（对已验证且非主域名的域名开放） */}
        {domain.isVerified && !domain.isPrimary && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetPrimary(domain)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground hidden md:flex items-center gap-1"
          >
            <Star className="h-3.5 w-3.5" />
            <span>设为主域名</span>
          </Button>
        )}

        {/* 更多菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {domain.isVerified && !domain.isPrimary && (
              <DropdownMenuItem
                onClick={() => onSetPrimary(domain)}
                className="gap-2 text-xs md:hidden cursor-pointer"
              >
                <Star className="h-3.5 w-3.5" />
                <span>设为工作空间主域名</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
              <a
                href={`https://${domain.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>新标签页访问测试</span>
              </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={domain.isSystem}
              onClick={() => onOpenDeleteDialog(domain)}
              className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{domain.isSystem ? "系统域名不可删除" : "解绑此域名"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
