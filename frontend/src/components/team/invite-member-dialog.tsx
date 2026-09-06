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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/services/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "sonner";
import { UserPlus, Loader2, Shield, User } from "lucide-react";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { currentWorkspace } = useWorkspace();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace) return;

    try {
      setSubmitting(true);
      await apiClient.post(`/workspaces/${currentWorkspace.id}/members`, {
        email: email.trim(),
        role,
      });
      toast.success(`已成功邀请 ${email} 加入空间`);
      setEmail("");
      setRole("member");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "邀请成员失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900">
              <UserPlus className="h-4 w-4" />
            </div>
            <DialogTitle>邀请协作者加入空间</DialogTitle>
          </div>
          <DialogDescription>
            新成员将能够协同管理当前空间下的短链、自定义域名及数据看板。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="member-email">成员工作邮箱</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-role">分配访问角色</Label>
            <Select
              value={role}
              onValueChange={(val: "admin" | "member") => setRole(val)}
              disabled={submitting}
            >
              <SelectTrigger id="member-role" className="h-10">
                <SelectValue placeholder="选择角色权限" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-xs">普通成员 (Member)</span>
                      <p className="text-[11px] text-muted-foreground">
                        查看空间短链与数据报表，无成员管理权
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
                        短链增删改、域名配置、普通成员邀请与管理
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
            <Button type="submit" disabled={submitting || !email.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  发送中...
                </>
              ) : (
                "发送邀请"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
