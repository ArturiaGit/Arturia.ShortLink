import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/services/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { TeamMemberDto } from "@/types/api";
import { toast } from "sonner";
import { ShieldAlert, Loader2, Shield, User } from "lucide-react";

interface ChangeRoleDialogProps {
  member: TeamMemberDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ChangeRoleDialog: React.FC<ChangeRoleDialogProps> = ({
  member,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { currentWorkspace } = useWorkspace();
  const [role, setRole] = useState<"admin" | "member">("member");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (member && member.role !== "owner") {
      setRole(member.role);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !currentWorkspace) return;

    try {
      setSubmitting(true);
      await apiClient.put(
        `/workspaces/${currentWorkspace.id}/members/${member.id}`,
        { role }
      );
      toast.success(`已将 ${member.nickname} 的角色变更为「${role === "admin" ? "管理员" : "普通成员"}」`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "修改角色失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <DialogTitle>调整成员权限角色</DialogTitle>
          </div>
          <DialogDescription>
            修改 <span className="font-semibold text-foreground">{member.nickname}</span> ({member.email}) 在当前空间的访问级别。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="change-role">分配新角色</Label>
            <Select
              value={role}
              onValueChange={(val: "admin" | "member") => setRole(val)}
              disabled={submitting}
            >
              <SelectTrigger id="change-role" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-xs">普通成员 (Member)</span>
                      <p className="text-[11px] text-muted-foreground">
                        仅查看空间资源与数据报表
                      </p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-amber-600" />
                    <div>
                      <span className="font-medium text-xs">管理员 (Admin)</span>
                      <p className="text-[11px] text-muted-foreground">
                        短链管理、域名维护与团队协作者管理
                      </p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting || role === member.role}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                "确认保存"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
