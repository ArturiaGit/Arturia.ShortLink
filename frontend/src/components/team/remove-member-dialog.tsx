import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/services/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { TeamMemberDto } from "@/types/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RemoveMemberDialogProps {
  member: TeamMemberDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const RemoveMemberDialog: React.FC<RemoveMemberDialogProps> = ({
  member,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { currentWorkspace } = useWorkspace();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!member || !currentWorkspace) return;

    try {
      setSubmitting(true);
      await apiClient.delete(
        `/workspaces/${currentWorkspace.id}/members/${member.id}`
      );
      toast.success(`已成功将 ${member.nickname} 移出工作空间`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "移除成员失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (!member) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认移除成员？</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              您确定要将{" "}
              <strong className="text-foreground">{member.nickname}</strong> (
              {member.email}) 从当前工作空间中移除吗？
            </span>
            <span className="block text-destructive text-xs mt-1">
              该成员将立即失去对该工作空间内所有短链、域名及数据看板的访问权限。
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                移除中...
              </>
            ) : (
              "确认移除"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
