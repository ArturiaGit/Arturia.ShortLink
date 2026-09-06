import React, { useState, useEffect } from "react";
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
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiClient } from "@/services/api";
import { Check, X, Loader2, FolderPlus } from "lucide-react";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 根据名称自动推荐 Slug
  useEffect(() => {
    if (!isSlugCustomized && name) {
      // 简单拼音或合法字符转换
      const generated = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
        .replace(/[\u4e00-\u9fa5]/g, (char) => `p-${char.charCodeAt(0).toString(36)}`)
        .slice(0, 24);
      setSlug(generated || `ws-${Date.now().toString().slice(-4)}`);
    }
  }, [name, isSlugCustomized]);

  // 校验 Slug 可用性
  useEffect(() => {
    if (!slug.trim()) {
      setIsSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingSlug(true);
        const res = (await apiClient.get(`/workspaces/check-slug?slug=${encodeURIComponent(slug.trim())}`)) as any;
        setIsSlugAvailable(res?.available ?? true);
      } catch {
        setIsSlugAvailable(true);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || isSlugAvailable === false) return;

    setSubmitting(true);
    const created = await createWorkspace(name.trim(), slug.trim());
    setSubmitting(false);

    if (created) {
      setName("");
      setSlug("");
      setIsSlugCustomized(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900">
              <FolderPlus className="h-4 w-4" />
            </div>
            <DialogTitle>新建工作空间</DialogTitle>
          </div>
          <DialogDescription>
            工作空间为多租户独立隔离单元，拥有专属域名、短链和团队成员。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ws-name">空间名称</Label>
            <Input
              id="ws-name"
              placeholder="例如：星辰产品增长组"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ws-slug">空间标识 (Slug)</Label>
              <div className="flex items-center gap-1 text-xs">
                {isCheckingSlug ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    查重中...
                  </span>
                ) : isSlugAvailable === true && slug ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-medium">
                    <Check className="h-3 w-3" />
                    标识可用
                  </span>
                ) : isSlugAvailable === false ? (
                  <span className="text-destructive flex items-center gap-1 font-medium">
                    <X className="h-3 w-3" />
                    标识已被占用
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <Input
                id="ws-slug"
                placeholder="xingchen-growth"
                value={slug}
                onChange={(e) => {
                  setIsSlugCustomized(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                required
                disabled={submitting}
                className="font-mono text-xs pr-8"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              用于工作空间唯一 URL 识别，仅支持英文字母、数字和横线。
            </p>
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
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !slug.trim() || isSlugAvailable === false}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  创建中...
                </>
              ) : (
                "立即创建"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
