import React from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { MockDB } from "@/mock/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Shield } from "lucide-react";

export const TeamPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const db = MockDB.getDB();
  const members = db.teamMembers[currentWorkspace?.id || "ws-1"] || [];

  return (
    <PageContainer
      title="团队空间与成员"
      description="管理当前工作空间的协作者、分权访问角色与操作权限。"
      actions={
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span>邀请成员</span>
        </Button>
      }
    >
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.avatarUrl} alt={m.nickname} />
                  <AvatarFallback>{m.nickname[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {m.nickname}
                    </span>
                    <Badge
                      variant={
                        m.role === "owner"
                          ? "default"
                          : m.role === "admin"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {m.role}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {m.email}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1 self-end sm:self-auto">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span>加入于 {new Date(m.joinedAt).toLocaleDateString("zh-CN")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
