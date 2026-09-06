import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  BarChart3,
  Globe,
  Users,
  KeyRound,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    title: "工作台总览",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "短链管理",
    href: "/links",
    icon: Link2,
  },
  {
    title: "数据分析",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "域名管理",
    href: "/domains",
    icon: Globe,
  },
  {
    title: "团队空间",
    href: "/team",
    icon: Users,
  },
  {
    title: "API 密钥",
    href: "/settings",
    icon: KeyRound,
  },
];

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  className,
  onNavigate,
}) => {
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 select-none",
        className
      )}
    >
      {/* 品牌标识 */}
      <div className="flex h-14 items-center px-5 border-b border-border">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-foreground group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight leading-none">
              Arturia<span className="text-muted-foreground font-normal">.ShortLink</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-normal tracking-wide">
              商业短链 SaaS
            </span>
          </div>
        </NavLink>
      </div>

      {/* 核心导航菜单 */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground tracking-wider uppercase">
          平台控制台
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                end={item.href === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px] px-1.5 py-0 h-4 font-normal"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* 底部运行状态指示器 */}
      <div className="p-4 border-t border-border mt-auto">
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Mock 引擎驱动
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            脱离后端独立闭环运行。增删改查及租户数据均在本地持久化仿真。
          </p>
        </div>
      </div>
    </aside>
  );
};
