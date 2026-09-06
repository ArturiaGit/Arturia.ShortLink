import React from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { MockDB } from "@/mock/db";
import { KeyRound, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { Badge } from "@/components/ui/badge";

export const SettingsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const db = MockDB.getDB();
  const keys = db.apiKeys[currentWorkspace?.id || "ws-1"] || [];

  return (
    <PageContainer
      title="API 密钥与开发者设置"
      description="管理用于后端程序、CI/CD 自动化流水线调用的工作空间级访问密钥。"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>创建新 API Key</span>
        </Button>
      }
    >
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">API 凭据安全红线</span>：API Key 明文在创建瞬间仅展示一次，系统仅保存 SHA256 哈希值与前后缀。请妥善保存至安全环境变量中，切勿提交至公开代码仓库。
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {keys.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              当前工作空间暂无 API Key
            </div>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {k.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {k.prefix}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {k.maskedKey}
                      </span>
                      <CopyButton text={k.maskedKey} />
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-4 self-end sm:self-auto">
                  <span>创建于 {new Date(k.createdAt).toLocaleDateString("zh-CN")}</span>
                  {k.lastUsedAt && (
                    <span className="text-emerald-600">
                      最近活跃: {new Date(k.lastUsedAt).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
};
