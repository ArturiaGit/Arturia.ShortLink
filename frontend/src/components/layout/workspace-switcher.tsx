import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/context/WorkspaceContext";

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace } =
    useWorkspace();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setIsSubmitting(true);
    const created = await createWorkspace(name.trim(), slug.trim());
    setIsSubmitting(false);
    if (created) {
      setName("");
      setSlug("");
      setOpenCreateDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-2.5 h-9 rounded-lg border border-border/80 hover:bg-accent/60 transition-all text-left"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
              {currentWorkspace?.name?.[0] || "A"}
            </div>
            <span className="font-semibold text-sm max-w-[130px] truncate">
              {currentWorkspace?.name || "选择工作空间"}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase font-medium">
              {currentWorkspace?.role || "owner"}
            </Badge>
            <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            当前用户工作空间
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className="flex items-center justify-between cursor-pointer py-2"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-medium leading-none truncate">
                    {ws.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {ws.slug}
                  </span>
                </div>
              </div>
              {currentWorkspace?.id === ws.id && (
                <Check className="h-4 w-4 text-primary ml-2 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setOpenCreateDialog(true)}
            className="cursor-pointer py-2 text-primary font-medium flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>创建新工作空间</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 创建工作空间弹窗 */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>创建工作空间</DialogTitle>
            <DialogDescription>
              工作空间用于团队协作隔离短链资产、独立自定义域名及数据统计分析。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">工作空间名称</label>
              <Input
                placeholder="例如：营销运营组"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">唯一标识 (Slug)</label>
              <Input
                placeholder="例如：marketing-team"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                用于 URL 标识与租户隔离，仅限英文小写字母与连字符。
              </p>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCreateDialog(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "创建中..." : "确认创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
