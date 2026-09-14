import React, { useEffect, useState, useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import { DomainDto, DomainStatsDto } from "@/types/api";
import { DomainCardItem } from "@/components/domains/domain-card-item";
import { AddDomainWizardDialog } from "@/components/domains/add-domain-wizard-dialog";
import { DomainDnsSheet } from "@/components/domains/domain-dns-sheet";
import { DeleteDomainDialog } from "@/components/domains/delete-domain-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  Search,
  ShieldCheck,
  Clock,
  Star,
} from "lucide-react";

export const DomainsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [domains, setDomains] = useState<DomainDto[]>([]);
  const [stats, setStats] = useState<DomainStatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  // 搜索与状态过滤
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending">("all");

  // 模态弹窗与抽屉控制
  const [wizardOpen, setWizardOpen] = useState(false);
  const [dnsSheetDomain, setDnsSheetDomain] = useState<DomainDto | null>(null);
  const [dnsSheetOpen, setDnsSheetOpen] = useState(false);
  const [deleteDialogDomain, setDeleteDialogDomain] = useState<DomainDto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 正在验证中的域名 ID
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // 加载域名列表与统计数据
  const fetchDomainsAndStats = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [domList, statsData] = await Promise.all([
        apiClient.get("/domains") as Promise<DomainDto[]>,
        apiClient.get("/domains/stats") as Promise<DomainStatsDto>,
      ]);
      setDomains(domList || []);
      setStats(statsData || null);
    } catch {
      toast.error("加载域名数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainsAndStats();
  }, [currentWorkspace]);

  // 过滤后的域名列表
  const filteredDomains = useMemo(() => {
    return domains.filter((d) => {
      // 关键词过滤
      if (
        searchKeyword.trim() &&
        !d.domain.toLowerCase().includes(searchKeyword.trim().toLowerCase())
      ) {
        return false;
      }
      // 状态过滤
      if (statusFilter === "active" && !d.isVerified) return false;
      if (statusFilter === "pending" && d.isVerified) return false;
      return true;
    });
  }, [domains, searchKeyword, statusFilter]);

  // 打开 DNS 指引抽屉
  const handleOpenDnsSheet = (domain: DomainDto) => {
    setDnsSheetDomain(domain);
    setDnsSheetOpen(true);
  };

  // 打开删除确认弹窗
  const handleOpenDeleteDialog = (domain: DomainDto) => {
    setDeleteDialogDomain(domain);
    setDeleteDialogOpen(true);
  };

  // 列表内直接触发“立即验证”
  const handleVerify = async (domain: DomainDto) => {
    try {
      setVerifyingId(domain.id);
      const verifyPromise = apiClient.post(`/domains/${domain.id}/verify`) as Promise<DomainDto>;

      toast.promise(verifyPromise, {
        loading: `正在向全球根服务器查询 ${domain.domain} 的 CNAME 解析记录...`,
        success: (updated) => {
          setDomains((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          fetchDomainsAndStats();
          return `域名 "${domain.domain}" DNS 解析验证通过！已成功激活独立短链服务`;
        },
        error: (err: any) => {
          return err.message || "DNS 探测超时：未能查询到有效 CNAME 记录，请确认配置后重试";
        },
      });

      await verifyPromise;
    } catch {
      // 错误已由 toast.promise 捕获
    } finally {
      setVerifyingId(null);
    }
  };

  // 设为工作空间主域名
  const handleSetPrimary = async (domain: DomainDto) => {
    try {
      const updated = (await apiClient.post(`/domains/${domain.id}/primary`)) as unknown as DomainDto;
      setDomains((prev) =>
        prev.map((d) => ({
          ...d,
          isPrimary: d.id === updated.id,
        }))
      );
      setStats((prev) => (prev ? { ...prev, primaryDomain: domain.domain } : null));
      toast.success(`已成功将 "${domain.domain}" 设为当前工作空间主域名`, {
        description: "后续新建短链时将默认使用该域名进行分发",
      });
    } catch (err: any) {
      toast.error(err.message || "设置主域名失败");
    }
  };

  // 域名添加成功回调
  const handleDomainAdded = (newDomain: DomainDto) => {
    setDomains((prev) => {
      const exists = prev.some((d) => d.id === newDomain.id);
      if (exists) {
        return prev.map((d) => (d.id === newDomain.id ? newDomain : d));
      }
      return [...prev, newDomain];
    });
    fetchDomainsAndStats();
  };

  // 抽屉内验证成功回调
  const handleVerifySuccess = (updated: DomainDto) => {
    setDomains((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    if (dnsSheetDomain?.id === updated.id) {
      setDnsSheetDomain(updated);
    }
    fetchDomainsAndStats();
  };

  // 域名删除回调
  const handleDomainDeleted = (domainId: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
    fetchDomainsAndStats();
  };

  return (
    <PageContainer
      title="域名管理"
      description="配置与管理多租户自定义独立短链域名，提升品牌认知度与用户点击信任感。"
      actions={
        <Button onClick={() => setWizardOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>添加自定义域名</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 顶部资产概览卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-none border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">已绑定域名资产</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold tracking-tight text-foreground font-mono">
                    {stats?.total ?? domains.length}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    / {stats?.maxDomains ?? 5} (配额)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">已激活短链网关</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                    {stats?.activeCount ?? domains.filter((d) => d.isVerified).length}
                  </span>
                  <span className="text-xs text-muted-foreground">正常服务中</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">等待解析生效</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                    {stats?.pendingCount ?? domains.filter((d) => !d.isVerified).length}
                  </span>
                  <span className="text-xs text-muted-foreground">待验证 CNAME</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <Star className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">空间默认主域名</p>
                <div className="text-sm font-bold tracking-tight text-foreground font-mono truncate mt-0.5">
                  {stats?.primaryDomain || domains.find((d) => d.isPrimary)?.domain || "art.link"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 过滤与搜索工具栏 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="按域名搜索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 h-9 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto self-start sm:self-auto">
            <Button
              variant={statusFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="text-xs h-8"
            >
              全部 ({domains.length})
            </Button>
            <Button
              variant={statusFilter === "active" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className="text-xs h-8 text-emerald-600 dark:text-emerald-400"
            >
              已生效 ({domains.filter((d) => d.isVerified).length})
            </Button>
            <Button
              variant={statusFilter === "pending" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
              className="text-xs h-8 text-amber-600 dark:text-amber-400"
            >
              等待解析 ({domains.filter((d) => !d.isVerified).length})
            </Button>
          </div>
        </div>

        {/* 域名资产列表 */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>正在加载域名资产与 DNS 状态...</span>
            </div>
          ) : filteredDomains.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredDomains.map((dom) => (
                <DomainCardItem
                  key={dom.id}
                  domain={dom}
                  onOpenDnsSheet={handleOpenDnsSheet}
                  onVerify={handleVerify}
                  onSetPrimary={handleSetPrimary}
                  onOpenDeleteDialog={handleOpenDeleteDialog}
                  isVerifying={verifyingId === dom.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Globe}
              title={searchKeyword ? "未找到匹配的域名" : "暂未绑定自定义域名"}
              description={
                searchKeyword
                  ? `未找到包含 "${searchKeyword}" 的域名资产，请尝试其他关键词。`
                  : "添加您的专属企业二级域名（如 go.yourbrand.com），让每一条短链都具备高度的品牌信赖感。"
              }
              action={
                !searchKeyword && (
                  <Button onClick={() => setWizardOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span>立即绑定新域名</span>
                  </Button>
                )
              }
              className="border-0"
            />
          )}
        </div>
      </div>

      {/* 两步走添加域名向导弹窗 */}
      <AddDomainWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onDomainAdded={handleDomainAdded}
      />

      {/* DNS CNAME 配置与排错指引抽屉 */}
      <DomainDnsSheet
        domain={dnsSheetDomain}
        open={dnsSheetOpen}
        onOpenChange={setDnsSheetOpen}
        onVerifySuccess={handleVerifySuccess}
      />

      {/* 删除域名二次确认弹窗（防误触与级联短链安全保护） */}
      <DeleteDomainDialog
        domain={deleteDialogDomain}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleDomainDeleted}
      />
    </PageContainer>
  );
};
