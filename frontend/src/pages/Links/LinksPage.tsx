import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import { ShortLinkDto } from "@/types/api";
import { CopyButton } from "@/components/shared/copy-button";
import { LinkStatusBadge } from "@/components/shared/link-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ExternalLink, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const LinksPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [links, setLinks] = useState<ShortLinkDto[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchLinks = async () => {
      try {
        setLoading(true);
        const res = (await apiClient.get("/links")) as { items: ShortLinkDto[] };
        setLinks(res?.items || []);
      } catch (e) {
        console.error("加载短链列表失败", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLinks();
  }, [currentWorkspace]);

  const filteredLinks = links.filter(
    (l) =>
      l.title.toLowerCase().includes(keyword.toLowerCase()) ||
      l.slug.toLowerCase().includes(keyword.toLowerCase()) ||
      l.originalUrl.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <PageContainer
      title="短链管理"
      description="管理当前工作空间下的所有短链重定向规则、访问权限与分发渠道。"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>创建短链</span>
        </Button>
      }
    >
      {/* 搜索与过滤工具栏 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="按标题、短码 Slug 或长链接搜索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-xs px-2.5 py-1">
            共 {filteredLinks.length} 条记录
          </Badge>
        </div>
      </div>

      {/* 阶段提示横幅 */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 mb-6 text-sm text-blue-700 dark:text-blue-300 flex items-center justify-between">
        <div>
          <span className="font-semibold">阶段一就绪提示</span>：短链列表与 Mock 租户数据流转已联通。全生命周期编辑抽屉、Base62 自动生成、别名冲突校验及 CSV 导出将在【阶段三】完整解锁。
        </div>
      </div>

      {/* 短链主列表 */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              正在加载短链数据...
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              未找到匹配的短链记录
            </div>
          ) : (
            filteredLinks.map((link) => (
              <div
                key={link.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-4"
              >
                <div className="flex flex-col space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-base font-semibold text-foreground tracking-tight">
                      {link.fullShortUrl}
                    </span>
                    <CopyButton text={link.fullShortUrl} />
                    <LinkStatusBadge
                      isEnabled={link.isEnabled}
                      hasPassword={link.hasPassword}
                    />
                    {link.tags?.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{link.title}</span>
                    <span>•</span>
                    <a
                      href={link.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate max-w-sm md:max-w-lg flex items-center gap-1"
                    >
                      <span className="truncate">{link.originalUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                    </a>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(link.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    {link.description && (
                      <span className="truncate max-w-xs">{link.description}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8 self-end md:self-center shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">点击量 (PV)</div>
                    <div className="text-base font-bold tabular-nums text-foreground">
                      {link.pvCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">访客数 (UV)</div>
                    <div className="text-base font-bold tabular-nums text-foreground">
                      {link.uvCount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
};
