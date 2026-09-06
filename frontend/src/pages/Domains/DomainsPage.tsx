import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import { DomainDto } from "@/types/api";
import { Globe, Plus, ShieldCheck, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const DomainsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [domains, setDomains] = useState<DomainDto[]>([]);

  useEffect(() => {
    if (!currentWorkspace) return;
    apiClient.get("/domains").then((res: any) => setDomains(res || []));
  }, [currentWorkspace]);

  return (
    <PageContainer
      title="域名管理"
      description="配置与管理自定义独立短链域名，提升品牌认知度与点击信任感。"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>添加自定义域名</span>
        </Button>
      }
    >
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {domains.map((dom) => (
            <div
              key={dom.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-semibold text-foreground">
                      {dom.domain}
                    </span>
                    {dom.isSystem ? (
                      <Badge variant="secondary" className="text-[10px]">
                        平台共享域名
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        独立专属域名
                      </Badge>
                    )}
                    {dom.isVerified ? (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        <span>已验证生效</span>
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <Clock className="h-3 w-3" />
                        <span>等待 CNAME 解析</span>
                      </Badge>
                    )}
                  </div>
                  {dom.cnameTarget && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      CNAME 目标: {dom.cnameTarget}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={`https://${dom.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>访问测试</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
