import React from "react";
import { Badge } from "@/components/ui/badge";
import { Lock, Clock } from "lucide-react";
import { getLinkComputedStatus, formatRemainingTime } from "@/lib/link-status";

interface LinkStatusBadgeProps {
  isEnabled: boolean;
  hasPassword?: boolean;
  expiresAt?: string | null;
  isExpired?: boolean;
}

export const LinkStatusBadge: React.FC<LinkStatusBadgeProps> = ({
  isEnabled,
  hasPassword,
  expiresAt,
  isExpired,
}) => {
  const computedStatus = isExpired
    ? "expired"
    : getLinkComputedStatus({ isEnabled, expiresAt });

  const remainingText = expiresAt ? formatRemainingTime(expiresAt) : "";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {computedStatus === "expired" && (
        <Badge
          variant="secondary"
          className="bg-muted text-muted-foreground border-border"
          title={remainingText || "该短链已超过有效访问期"}
        >
          已过期
        </Badge>
      )}

      {computedStatus === "expiring" && (
        <Badge
          variant="warning"
          className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
          title={remainingText}
        >
          <Clock className="h-3 w-3 animate-pulse" />
          <span>即将到期</span>
        </Badge>
      )}

      {computedStatus === "paused" && (
        <Badge variant="destructive">已暂停</Badge>
      )}

      {computedStatus === "active" && (
        <Badge variant="success">生效中</Badge>
      )}

      {hasPassword && (
        <Badge
          variant="info"
          className="gap-1 border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          title="此短链已启用访问密码保护"
        >
          <Lock className="h-3 w-3" />
          <span>密保</span>
        </Badge>
      )}
    </div>
  );
};

