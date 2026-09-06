import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { mockAdapter } from "@/mock/adapter";
import { ApiResponse } from "@/types/api";

const useMock = import.meta.env.VITE_USE_MOCK !== "false";

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
  adapter: useMock ? (mockAdapter as any) : undefined,
});

// 请求拦截器：注入租户上下文与 Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("arturia_token");
    const workspaceId = localStorage.getItem("arturia_workspace_id");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (workspaceId) {
      config.headers["X-Workspace-Id"] = workspaceId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一解包与错误提示
apiClient.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse<any>;
    if (res && typeof res.code === "number") {
      if (res.code !== 200) {
        toast.error(res.message || "请求失败");
        return Promise.reject(new Error(res.message || "Error"));
      }
      return res.data;
    }
    return response.data;
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || "网络请求异常";
    toast.error(msg);
    return Promise.reject(error);
  }
);

export default apiClient;
