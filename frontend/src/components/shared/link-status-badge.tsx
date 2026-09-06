import React from "react";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

interface LinkStatusBadgeProps {
  isEnabled: boolean;
  hasPassword?: boolean;
  isExpired?: boolean;
}

export const LinkStatusBadge: React.FC<LinkStatusBadgeProps> = ({
  isEnabled,
  hasPassword,
  isExpired,
}) => {
  if (isExpired) {
    return <Badge variant="secondary">已过期</Badge>;
  }

  if (!isEnabled) {
    return <Badge variant="destructive">已暂停</Badge>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="success">运行中</Badge>
      {hasPassword && (
        <Badge variant="info" className="gap-1">
          <Lock className="h-3 w-3" />
          <span>密码</span>
        </Badge>
      )}
    </div>
  );
};
