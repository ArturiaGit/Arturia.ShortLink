import { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { MockDB } from "./db";
import { ApiResponse } from "@/types/api";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockAdapter(
  config: InternalAxiosRequestConfig
): Promise<AxiosResponse<ApiResponse<any>>> {
  await delay(120);

  const url = config.url || "";
  const method = (config.method || "get").toLowerCase();
  const headers = config.headers || {};
  const workspaceId = (headers["X-Workspace-Id"] as string) || "ws-1";

  const successResponse = (data: any, message = "操作成功"): AxiosResponse<ApiResponse<any>> => ({
    data: {
      code: 200,
      success: true,
      message,
      data,
      timestamp: Date.now(),
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  });

  // Auth
  if (url.includes("/auth/me") || url.includes("/auth/login")) {
    return successResponse({
      token: "mock-jwt-token-superadmin",
      user: MockDB.getCurrentUser(),
      workspaces: MockDB.getWorkspaces(),
    });
  }

  // Workspaces
  if (url.includes("/workspaces")) {
    if (method === "get") {
      return successResponse(MockDB.getWorkspaces());
    }
    if (method === "post") {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      const newWs = MockDB.addWorkspace(body?.name || "新工作空间", body?.slug || "new-ws");
      return successResponse(newWs, "工作空间创建成功");
    }
  }

  // Domains
  if (url.includes("/domains")) {
    return successResponse(MockDB.getDomains(workspaceId));
  }

  // Links
  if (url.includes("/links")) {
    const links = MockDB.getLinks(workspaceId);
    return successResponse({
      items: links,
      total: links.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  }

  // Analytics
  if (url.includes("/analytics/overview") || url.includes("/stats/overview")) {
    return successResponse(MockDB.getOverviewStats(workspaceId));
  }

  // Fallback for any /api/v1 endpoints
  return successResponse({}, "Mock 响应成功");
}
