import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DomainDto } from "@/types/api";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { AlertTriangle, Trash2, ShieldAlert } from "lucide-react";

interface DeleteDomainDialogProps {
  domain: DomainDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (domainId: string) => void;
}

export const DeleteDomainDialog: React.FC<DeleteDomainDialogProps> = ({
  domain,
  open,
  onOpenChange,
  onDeleted,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setDeleting(false);
    }
  }, [open]);

  if (!domain) return null;

  const hasLinks = (domain.linkCount || 0) > 0;
  const isInputMatched = confirmText.trim().toLowerCase() === domain.domain.toLowerCase();
  const canDelete = hasLinks ? isInputMatched : true;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canDelete || deleting) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/domains/${domain.id}`);
      toast.success(`自定义域名 "${domain.domain}" 已成功解绑移除`);
      onDeleted(domain.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "删除域名失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-2 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            {hasLinks ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <AlertDialogTitle className="text-base font-semibold">
              解绑并删除自定义域名
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1">
              您即将从当前工作空间中解绑域名 <strong className="font-mono text-foreground">{domain.domain}</strong>。
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {hasLinks ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive space-y-1.5 leading-relaxed">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>严重警告：存在正在分发的关联短链</span>
              </div>
              <p>
                该域名下当前有 <strong className="font-bold underline">{domain.linkCount}</strong> 条短链正在使用！解绑后，所有使用该域名的短链、已印刷的二维码及外部投放链接将<strong>全部立即中断失效</strong>！
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="confirm-domain-input" className="text-xs font-semibold text-foreground">
                请输入完整的域名名称以确认删除：
              </Label>
              <Input
                id="confirm-domain-input"
                placeholder={domain.domain}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="font-mono text-xs"
                autoComplete="off"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2 leading-relaxed">
            解绑后，系统将释放该二级域名的所有路由绑定与自动 SSL 证书服务。此操作不可逆。
          </p>
        )}

        <AlertDialogFooter className="pt-2 gap-2">
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? "正在解绑..." : "确认永久删除"}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
