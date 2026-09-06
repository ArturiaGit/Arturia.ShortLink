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

  const errorResponse = (message: string, code = 400): AxiosResponse<ApiResponse<any>> => ({
    data: {
      code,
      success: false,
      message,
      data: null,
      timestamp: Date.now(),
    },
    status: 200, // 业务错误统一在 body 中通过 success: false 返回
    statusText: "OK",
    headers: {},
    config,
  });

  // Auth: Login
  if (url.includes("/auth/login") && method === "post") {
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    const result = MockDB.login(body?.email || "admin@arturia.link");
    return successResponse(result, "登录成功");
  }

  // Auth: Register
  if (url.includes("/auth/register") && method === "post") {
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    try {
      const result = MockDB.register(body?.nickname || "新用户", body?.email || "user@arturia.link");
      return successResponse(result, "注册成功");
    } catch (err: any) {
      return errorResponse(err.message || "注册失败");
    }
  }

  // Auth: Me
  if (url.includes("/auth/me")) {
    const currentUser = MockDB.getCurrentUser();
    const workspaces = MockDB.getUserWorkspaces(currentUser.id);
    return successResponse({
      user: currentUser,
      workspaces,
    });
  }

  // Workspaces: Slug check
  if (url.includes("/workspaces/check-slug")) {
    const parsedUrl = new URL(url, "http://localhost");
    const slug = parsedUrl.searchParams.get("slug") || "";
    const isTaken = MockDB.isSlugTaken(slug);
    return successResponse({ available: !isTaken });
  }

  // Team Members: /workspaces/:id/members
  if (url.includes("/members")) {
    const match = url.match(/\/workspaces\/([^/]+)\/members(\/([^/?]+))?/);
    const targetWsId = match ? match[1] : workspaceId;
    const memberId = match ? match[3] : undefined;

    if (method === "get") {
      const members = MockDB.getTeamMembers(targetWsId);
      return successResponse(members);
    }

    if (method === "post") {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      try {
        const newMember = MockDB.addTeamMember(
          targetWsId,
          body?.email,
          body?.role || "member"
        );
        return successResponse(newMember, "已成功添加新成员");
      } catch (err: any) {
        return errorResponse(err.message || "添加成员失败");
      }
    }

    if (method === "put" && memberId) {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      try {
        const updated = MockDB.updateTeamMemberRole(
          targetWsId,
          memberId,
          body?.role
        );
        return successResponse(updated, "成员角色修改成功");
      } catch (err: any) {
        return errorResponse(err.message || "修改角色失败");
      }
    }

    if (method === "delete" && memberId) {
      try {
        MockDB.removeTeamMember(targetWsId, memberId);
        return successResponse(null, "成员已成功移出工作空间");
      } catch (err: any) {
        return errorResponse(err.message || "移除成员失败");
      }
    }
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
