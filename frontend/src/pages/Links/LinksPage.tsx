import React, { useEffect, useState, useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import { ShortLinkDto, DomainDto } from "@/types/api";
import { QuickShortenBar } from "@/components/links/quick-shorten-bar";
import { LinkCardItem } from "@/components/links/link-card-item";
import { LinkDrawer } from "@/components/links/link-drawer";
import { DeleteLinkDialog } from "@/components/links/delete-link-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { exportLinksToCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Download,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;

export const LinksPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  // 数据列表
  const [links, setLinks] = useState<ShortLinkDto[]>([]);
  const [domains, setDomains] = useState<DomainDto[]>([]);
  const [loading, setLoading] = useState(true);

  // 搜索与过滤条件
  const [keyword, setKeyword] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // 侧边抽屉控制
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [activeLink, setActiveLink] = useState<ShortLinkDto | null>(null);

  // 删除弹窗控制
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<ShortLinkDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取短链与域名列表
  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [linksRes, domainsRes] = await Promise.all([
          apiClient.get("/links") as Promise<{ items: ShortLinkDto[] }>,
          apiClient.get("/domains") as Promise<DomainDto[]>,
        ]);
        setLinks(linksRes?.items || []);
        setDomains(domainsRes || []);
      } catch (e) {
        console.error("加载短链或域名数据失败", e);
        toast.error("加载数据失败，请重试");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentWorkspace]);

  // 多维前端组合过滤
  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      // 关键字搜索：标题、短码 Slug、目标长链接
      const kw = keyword.toLowerCase().trim();
      const matchesKeyword =
        !kw ||
        l.title.toLowerCase().includes(kw) ||
        l.slug.toLowerCase().includes(kw) ||
        l.originalUrl.toLowerCase().includes(kw) ||
        l.fullShortUrl.toLowerCase().includes(kw);

      // 域名筛选
      const matchesDomain = domainFilter === "all" || l.domain === domainFilter;

      // 启停状态筛选
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && l.isEnabled) ||
        (statusFilter === "paused" && !l.isEnabled);

      return matchesKeyword && matchesDomain && matchesStatus;
    });
  }, [links, keyword, domainFilter, statusFilter]);

  // 当筛选条件变化时自动重置页码为第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, domainFilter, statusFilter]);

  // 分页数据切片
  const totalPages = Math.ceil(filteredLinks.length / PAGE_SIZE) || 1;
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLinks.slice(start, start + PAGE_SIZE);
  }, [filteredLinks, currentPage]);

  // 快捷生成或新建短链回调
  const handleLinkCreated = (newLink: ShortLinkDto) => {
    setLinks((prev) => [newLink, ...prev]);
  };

  // 抽屉更新回调
  const handleDrawerSuccess = (updatedLink: ShortLinkDto) => {
    if (drawerMode === "create") {
      setLinks((prev) => [updatedLink, ...prev]);
    } else {
      setLinks((prev) =>
        prev.map((l) => (l.id === updatedLink.id ? updatedLink : l))
      );
    }
  };

  // 启停状态切换
  const handleToggleStatus = async (link: ShortLinkDto) => {
    try {
      const res = (await apiClient.patch(
        `/links/${link.id}/status`
      )) as ShortLinkDto;
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? res : l))
      );
      toast.success(res.isEnabled ? "短链已恢复启用" : "短链已暂停访问");
    } catch (err: any) {
      toast.error("切换状态失败", { description: err.message });
    }
  };

  // 打开编辑抽屉
  const handleEdit = (link: ShortLinkDto) => {
    setActiveLink(link);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  // 打开删除确认框
  const handleDeleteClick = (link: ShortLinkDto) => {
    setLinkToDelete(link);
    setDeleteDialogOpen(true);
  };

  // 确认执行软删除
  const handleConfirmDelete = async () => {
    if (!linkToDelete) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/links/${linkToDelete.id}`);
      setLinks((prev) => prev.filter((l) => l.id !== linkToDelete.id));
      toast.success("短链已成功删除");
      setDeleteDialogOpen(false);
      setLinkToDelete(null);
    } catch (err: any) {
      toast.error("删除短链失败", { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // 导出 CSV
  const handleExportCsv = () => {
    if (filteredLinks.length === 0) {
      toast.info("当前没有可导出的短链数据");
      return;
    }
    exportLinksToCsv(filteredLinks, currentWorkspace?.name || "workspace");
    toast.success(`已成功导出 ${filteredLinks.length} 条短链数据 (CSV)`);
  };

  // 打开新建抽屉
  const handleOpenCreateDrawer = () => {
    setActiveLink(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  // 清空筛选
  const handleResetFilters = () => {
    setKeyword("");
    setDomainFilter("all");
    setStatusFilter("all");
  };

  return (
    <PageContainer
      title="短链管理"
      description="集中管理当前工作空间下的所有短链重定向规则、访问权限与分发渠道。"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 h-9"
            disabled={links.length === 0}
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            <span>导出 CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateDrawer}
            className="gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            <span>创建短链</span>
          </Button>
        </div>
      }
    >
      {/* 1. 顶部常驻快捷长链缩短栏 */}
      <QuickShortenBar
        defaultDomain={domains[0]?.domain || "art.link"}
        onLinkCreated={handleLinkCreated}
      />

      {/* 2. 搜索与多维过滤工具栏 */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1">
          {/* 关键字搜索 */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="按标题、短码 Slug 或目标长链搜索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* 域名筛选 */}
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs font-mono">
              <SelectValue placeholder="筛选域名" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                全部域名
              </SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.domain} className="text-xs font-mono">
                  {d.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 状态筛选 */}
          <Select
            value={statusFilter}
            onValueChange={(val: "all" | "active" | "paused") => setStatusFilter(val)}
          >
            <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                全部状态
              </SelectItem>
              <SelectItem value="active" className="text-xs">
                仅已启用
              </SelectItem>
              <SelectItem value="paused" className="text-xs">
                仅已暂停
              </SelectItem>
            </SelectContent>
          </Select>

          {/* 重置筛选快捷按钮 */}
          {(keyword || domainFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>清空筛选</span>
            </Button>
          )}
        </div>

        {/* 数量统计徽章 */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <Badge variant="outline" className="text-xs px-2.5 py-1 font-mono">
            匹配 {filteredLinks.length} / 共 {links.length} 条
          </Badge>
        </div>
      </div>

      {/* 3. 短链卡片列表主体 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-border bg-card/50 animate-pulse"
            />
          ))}
        </div>
      ) : filteredLinks.length === 0 ? (
        <EmptyState
          icon={LinkIcon}
          title={
            keyword || domainFilter !== "all" || statusFilter !== "all"
              ? "未找到匹配的短链记录"
              : "当前空间尚未创建短链"
          }
          description={
            keyword || domainFilter !== "all" || statusFilter !== "all"
              ? "尝试更换关键字或重置筛选条件。"
              : "立即在上方输入框粘贴长链接，或点击右上角创建第一条营销短链吧！"
          }
          action={
            keyword || domainFilter !== "all" || statusFilter !== "all" ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                重置所有筛选
              </Button>
            ) : (
              <Button size="sm" onClick={handleOpenCreateDrawer} className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span>立即创建短链</span>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {paginatedLinks.map((link) => (
            <LinkCardItem
              key={link.id}
              link={link}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* 4. 分页控制条 */}
      {!loading && filteredLinks.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-border/80 pt-4 mt-6">
          <div className="text-xs text-muted-foreground font-mono">
            显示第 {(currentPage - 1) * PAGE_SIZE + 1} 至{" "}
            {Math.min(currentPage * PAGE_SIZE, filteredLinks.length)} 条，共{" "}
            {filteredLinks.length} 条
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2.5 gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>上一页</span>
            </Button>

            <span className="text-xs font-mono px-2 text-muted-foreground">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2.5 gap-1 text-xs"
            >
              <span>下一页</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 5. 侧边抽屉 (创建 / 编辑) */}
      <LinkDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialLink={activeLink}
        domains={domains}
        onSuccess={handleDrawerSuccess}
      />

      {/* 6. 软删除二次确认弹窗 */}
      <DeleteLinkDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        shortUrl={linkToDelete?.fullShortUrl || ""}
        linkTitle={linkToDelete?.title || ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </PageContainer>
  );
};
