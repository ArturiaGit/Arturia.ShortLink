import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/services/api";
import { TeamMemberDto } from "@/types/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { ChangeRoleDialog } from "@/components/team/change-role-dialog";
import { RemoveMemberDialog } from "@/components/team/remove-member-dialog";
import {
  UserPlus,
  Shield,
  ShieldAlert,
  MoreHorizontal,
  Search,
  Users,
  ShieldCheck,
  UserCheck,
  User,
  Loader2,
  Lock,
} from "lucide-react";

export const TeamPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { currentUser } = useAuth();

  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog States
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<TeamMemberDto | null>(null);
  const [selectedMemberForDelete, setSelectedMemberForDelete] = useState<TeamMemberDto | null>(null);

  // 当前用户在当前工作空间的角色
  const currentRole = currentWorkspace?.role || "member";
  const canInvite = currentRole === "owner" || currentRole === "admin";

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const data = (await apiClient.get(
        `/workspaces/${currentWorkspace.id}/members`
      )) as TeamMemberDto[];
      if (Array.isArray(data)) {
        setMembers(data);
      }
    } catch (err) {
      console.error("加载成员列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.nickname.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // 判断是否能管理目标成员
  const getManagePermission = (targetMember: TeamMemberDto) => {
    if (targetMember.role === "owner") {
      return { allowed: false, reason: "空间所有者（Owner）角色不可调整或移除" };
    }
    if (currentRole === "member") {
      return { allowed: false, reason: "普通成员（Member）仅拥有只读权限" };
    }
    if (currentRole === "admin" && targetMember.role === "admin") {
      return { allowed: false, reason: "管理员无权管理同级管理员，需所有者操作" };
    }
    if (currentUser?.id === targetMember.userId) {
      return { allowed: false, reason: "无法在团队列表中操作您自己的账号" };
    }
    return { allowed: true, reason: "" };
  };

  return (
    <TooltipProvider>
      <PageContainer
        title="团队空间与协作者"
        description="管理当前工作空间内的协作成员、分权访问角色与细粒度 RBAC 权限。"
        actions={
          canInvite ? (
            <Button
              className="gap-2 shadow-sm font-medium"
              onClick={() => setOpenInviteDialog(true)}
            >
              <UserPlus className="h-4 w-4" />
              <span>邀请新成员</span>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    className="gap-2 font-medium opacity-60 cursor-not-allowed"
                    disabled
                  >
                    <Lock className="h-4 w-4" />
                    <span>邀请新成员</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>您当前为普通成员 (Member)，仅空间所有者或管理员可发起邀请</p>
              </TooltipContent>
            </Tooltip>
          )
        }
      >
        {/* Role & Workspace Info Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                当前空间协作者总数
              </span>
              <div className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>{members.length} 人</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                您当前的访问权限
              </span>
              <div className="flex items-center gap-2 mt-1">
                {currentRole === "owner" ? (
                  <Badge className="gap-1 px-2.5 py-1 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    空间所有者 (Owner)
                  </Badge>
                ) : currentRole === "admin" ? (
                  <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs text-amber-700 bg-amber-500/15 border-amber-500/30">
                    <Shield className="h-3.5 w-3.5" />
                    管理员 (Admin)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 px-2.5 py-1 text-xs">
                    <UserCheck className="h-3.5 w-3.5" />
                    普通协作者 (Member)
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                RBAC 权限管控策略
              </span>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                遵循严格层级管控（Owner &gt; Admin &gt; Member），保障多租户资源隔离安全。
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="按昵称或邮箱快速过滤成员..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            展示 {filteredMembers.length} 名成员
          </span>
        </div>

        {/* Members List Card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">正在同步团队成员数据...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm font-medium text-foreground">未找到相关协作者</p>
              <p className="text-xs text-muted-foreground">
                请尝试更换关键词，或点击右上角邀请新成员加入。
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMembers.map((m) => {
                const permission = getManagePermission(m);
                const isCurrentLoggedInUser = currentUser?.id === m.userId;

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={m.avatarUrl} alt={m.nickname} />
                        <AvatarFallback className="text-xs font-semibold">
                          {m.nickname?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {m.nickname}
                          </span>
                          {isCurrentLoggedInUser && (
                            <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                              当前登录账号
                            </span>
                          )}
                          <Badge
                            variant={
                              m.role === "owner"
                                ? "default"
                                : m.role === "admin"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px] capitalize px-2 py-0"
                          >
                            {m.role}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{m.email}</span>
                          <span className="text-border">•</span>
                          <span>加入于 {new Date(m.joinedAt).toLocaleDateString("zh-CN")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {permission.allowed ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-md hover:bg-accent"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              <span className="sr-only">操作菜单</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => setSelectedMemberForRole(m)}
                              className="cursor-pointer text-xs flex items-center gap-2"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>修改角色权限</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setSelectedMemberForDelete(m)}
                              className="cursor-pointer text-xs text-destructive focus:text-destructive flex items-center gap-2"
                            >
                              <User className="h-3.5 w-3.5" />
                              <span>移出工作空间</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                                disabled
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{permission.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialogs */}
        <InviteMemberDialog
          open={openInviteDialog}
          onOpenChange={setOpenInviteDialog}
          onSuccess={fetchMembers}
        />

        <ChangeRoleDialog
          member={selectedMemberForRole}
          open={!!selectedMemberForRole}
          onOpenChange={(open) => !open && setSelectedMemberForRole(null)}
          onSuccess={fetchMembers}
        />

        <RemoveMemberDialog
          member={selectedMemberForDelete}
          open={!!selectedMemberForDelete}
          onOpenChange={(open) => !open && setSelectedMemberForDelete(null)}
          onSuccess={fetchMembers}
        />
      </PageContainer>
    </TooltipProvider>
  );
};
