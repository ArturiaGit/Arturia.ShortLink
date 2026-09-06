import React, { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/context/WorkspaceContext";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const q = searchQuery.toLowerCase().trim();
    return workspaces.filter(
      (ws) =>
        ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q)
    );
  }, [workspaces, searchQuery]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-2.5 h-9 rounded-lg border border-border/80 hover:bg-accent/60 transition-all text-left"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-900 text-[10px] font-bold text-white">
              {currentWorkspace?.name?.[0] || "A"}
            </div>
            <span className="font-semibold text-sm max-w-[130px] truncate">
              {currentWorkspace?.name || "选择工作空间"}
            </span>
            <Badge
              variant={
                currentWorkspace?.role === "owner"
                  ? "default"
                  : currentWorkspace?.role === "admin"
                  ? "secondary"
                  : "outline"
              }
              className="text-[10px] px-1.5 py-0 h-4 uppercase font-medium"
            >
              {currentWorkspace?.role || "owner"}
            </Badge>
            <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-1.5">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
            工作空间管理 ({workspaces.length})
          </DropdownMenuLabel>

          {workspaces.length > 2 && (
            <div className="px-1 py-1">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="搜索工作空间..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-muted/40"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <DropdownMenuSeparator className="my-1" />

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredWorkspaces.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                未找到匹配的工作空间
              </div>
            ) : (
              filteredWorkspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium leading-none truncate">
                          {ws.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-3.5 capitalize text-muted-foreground"
                        >
                          {ws.role}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                        {ws.slug}
                      </span>
                    </div>
                  </div>
                  {currentWorkspace?.id === ws.id && (
                    <Check className="h-4 w-4 text-primary ml-2 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </div>

          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => setOpenCreateDialog(true)}
            className="cursor-pointer py-2 px-2 text-primary font-medium flex items-center gap-2 rounded-md hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs">新建工作空间</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={openCreateDialog}
        onOpenChange={setOpenCreateDialog}
      />
    </>
  );
};
