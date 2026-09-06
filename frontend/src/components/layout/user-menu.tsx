import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { MockDB } from "@/mock/db";
import { toast } from "sonner";
import { RotateCcw, User, LogOut } from "lucide-react";

export const UserMenu: React.FC = () => {
  const { currentUser } = useWorkspace();

  const handleResetData = () => {
    MockDB.resetDB();
    toast.success("已重置本地 Mock 演示数据库");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleLogout = () => {
    toast.info("已退出当前会话 (Mock 演示)");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full ring-offset-background hover:opacity-80 p-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={currentUser?.avatarUrl}
              alt={currentUser?.nickname || "User"}
            />
            <AvatarFallback className="text-xs font-semibold">
              {currentUser?.nickname?.[0] || "A"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">
              {currentUser?.nickname || "Arturia Admin"}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {currentUser?.email || "admin@arturia.com"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>个人资料设置</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleResetData}
          className="cursor-pointer gap-2 text-amber-600 focus:text-amber-600"
        >
          <RotateCcw className="h-4 w-4" />
          <span>重置演示 Mock 数据</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
