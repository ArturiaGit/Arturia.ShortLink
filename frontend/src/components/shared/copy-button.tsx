import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: "default" | "sm" | "icon";
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  className,
  size = "icon",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            className={cn("h-8 px-2 text-muted-foreground hover:text-foreground", className)}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {label && <span className="ml-1.5 text-xs">{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span>{copied ? "已复制！" : "点击复制"}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
