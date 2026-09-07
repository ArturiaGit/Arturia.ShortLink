import React, { createContext, useContext, useState, useEffect } from "react";
import { UserDto } from "@/types/api";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

interface AuthContextType {
  currentUser: UserDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (nickname: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  fillDemoAccount: (role: "admin" | "member") => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 从 localStorage 初始化恢复登录态
    const savedToken = localStorage.getItem("arturia_token");
    const savedUser = localStorage.getItem("arturia_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("arturia_token");
        localStorage.removeItem("arturia_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = (await apiClient.post("/auth/login", { email, password })) as any;
      if (res && res.token && res.user) {
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem("arturia_token", res.token);
        localStorage.setItem("arturia_user", JSON.stringify(res.user));
        toast.success(`欢迎回来，${res.user.nickname}`);
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.message || "登录失败，请检查账号密码");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (nickname: string, email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = (await apiClient.post("/auth/register", { nickname, email, password })) as any;
      if (res && res.token && res.user) {
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem("arturia_token", res.token);
        localStorage.setItem("arturia_user", JSON.stringify(res.user));
        toast.success(`注册成功！已为您自动创建专属工作空间`);
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.message || "注册失败，请稍后重试");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("arturia_token");
    localStorage.removeItem("arturia_user");
    localStorage.removeItem("arturia_workspace_id");
    toast.info("已安全退出登录");
  };

  const fillDemoAccount = async (role: "admin" | "member"): Promise<boolean> => {
    const email = role === "admin" ? "admin@arturia.link" : "member@arturia.link";
    return login(email, "password123!");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!token && !!currentUser,
        isLoading,
        login,
        register,
        logout,
        fillDemoAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
