import React, { createContext, useContext, useState, useEffect } from "react";
import { WorkspaceDto, UserDto } from "@/types/api";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

interface WorkspaceContextType {
  currentWorkspace: WorkspaceDto | null;
  workspaces: WorkspaceDto[];
  currentUser: UserDto | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, slug: string) => Promise<WorkspaceDto | null>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceDto | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      // 获取当前用户及工作空间
      const authData = (await apiClient.get("/auth/me")) as any;
      if (authData?.user) {
        setCurrentUser(authData.user);
      }
      if (authData?.workspaces && Array.isArray(authData.workspaces)) {
        setWorkspaces(authData.workspaces);

        const savedWsId = localStorage.getItem("arturia_workspace_id");
        const found = authData.workspaces.find((w: WorkspaceDto) => w.id === savedWsId);
        const targetWs = found || authData.workspaces[0];
        if (targetWs) {
          setCurrentWorkspace(targetWs);
          localStorage.setItem("arturia_workspace_id", targetWs.id);
        }
      }
    } catch (error) {
      console.error("加载工作空间与用户失败", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const switchWorkspace = (workspaceId: string) => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (target && target.id !== currentWorkspace?.id) {
      setCurrentWorkspace(target);
      localStorage.setItem("arturia_workspace_id", target.id);
      toast.success(`已切换至工作空间：${target.name}`);
    }
  };

  const createWorkspace = async (name: string, slug: string): Promise<WorkspaceDto | null> => {
    try {
      const newWs = (await apiClient.post("/workspaces", { name, slug })) as WorkspaceDto;
      if (newWs) {
        setWorkspaces((prev) => [...prev, newWs]);
        setCurrentWorkspace(newWs);
        localStorage.setItem("arturia_workspace_id", newWs.id);
        toast.success(`工作空间「${name}」创建成功`);
        return newWs;
      }
      return null;
    } catch (error: any) {
      toast.error(error.message || "创建工作空间失败");
      return null;
    }
  };

  const refreshWorkspaces = async () => {
    try {
      const list = (await apiClient.get("/workspaces")) as WorkspaceDto[];
      if (Array.isArray(list)) {
        setWorkspaces(list);
      }
    } catch (error) {
      console.error("刷新工作空间列表失败", error);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        currentUser,
        isLoading,
        switchWorkspace,
        createWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace 必须在 WorkspaceProvider 内使用");
  }
  return context;
};
