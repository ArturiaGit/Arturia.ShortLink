import React from "react";
import { ShortLinkDto } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, X, ExternalLink, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsFilterBarProps {
  links: ShortLinkDto[];
  selectedLinkId?: string;
  onSelectLink: (linkId?: string) => void;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  links,
  selectedLinkId,
  onSelectLink,
}) => {
  const selectedLink = links.find((l) => l.id === selectedLinkId);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Globe className="h-4 w-4 text-foreground" />
          <span>分析统计维度：</span>
        </div>

        {selectedLink ? (
          <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5 text-xs">
            <span className="font-semibold text-foreground font-mono">
              {selectedLink.domain}/{selectedLink.slug}
            </span>
            <span className="text-muted-foreground max-w-[200px] truncate hidden md:inline" title={selectedLink.originalUrl}>
              → {selectedLink.originalUrl}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-background">
              单链下钻
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-muted-foreground/20 rounded-full ml-1"
              onClick={() => onSelectLink(undefined)}
              title="返回全局总览"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">清空筛选</span>
            </Button>
          </div>
        ) : (
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-normal">
            当前：全空间所有短链综合看板
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Select
          value={selectedLinkId || "all"}
          onValueChange={(val) => onSelectLink(val === "all" ? undefined : val)}
        >
          <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs">
            <Link2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="选择短链下钻分析" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              📊 全部短链 (全局总览)
            </SelectItem>
            {links.map((link) => (
              <SelectItem key={link.id} value={link.id} className="text-xs">
                <span className="font-mono">{link.domain}/{link.slug}</span>
                {link.title ? ` - ${link.title}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedLink && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1 shrink-0"
            onClick={() => window.open(selectedLink.fullShortUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">访问短链</span>
          </Button>
        )}
      </div>
    </div>
  );
};
