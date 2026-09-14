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
    const parsedUrl = new URL(url, "http://localhost");
    const pathname = parsedUrl.pathname;

    // GET /domains/stats
    if (method === "get" && pathname.endsWith("/domains/stats")) {
      return successResponse(MockDB.getDomainStats(workspaceId));
    }

    // GET /domains
    if (method === "get" && (pathname.endsWith("/domains") || pathname.endsWith("/domains/"))) {
      return successResponse(MockDB.getDomains(workspaceId));
    }

    // POST /domains/:id/verify
    if (method === "post" && pathname.includes("/verify")) {
      const match = pathname.match(/\/domains\/([^\/]+)\/verify/);
      const domainId = match ? match[1] : "";
      const simulateFail = parsedUrl.searchParams.get("simulateFail") === "true";
      try {
        const updated = MockDB.verifyDomain(workspaceId, domainId, simulateFail);
        return successResponse(updated, "域名 DNS 解析验证通过！已成功激活独立短链服务");
      } catch (err: any) {
        return errorResponse(err.message || "DNS 验证失败");
      }
    }

    // POST /domains/:id/primary
    if (method === "post" && pathname.includes("/primary")) {
      const match = pathname.match(/\/domains\/([^\/]+)\/primary/);
      const domainId = match ? match[1] : "";
      try {
        const updated = MockDB.setPrimaryDomain(workspaceId, domainId);
        return successResponse(updated, `已成功将 "${updated.domain}" 设为当前空间默认主域名`);
      } catch (err: any) {
        return errorResponse(err.message || "设置主域名失败");
      }
    }

    // POST /domains (添加新域名)
    if (method === "post") {
      const body = typeof config.data === "string" ? JSON.parse(config.data || "{}") : config.data;
      try {
        const newDom = MockDB.addDomain(workspaceId, body?.domain || "");
        return successResponse(newDom, "自定义域名添加成功，请前往 DNS 服务商配置解析记录");
      } catch (err: any) {
        return errorResponse(err.message || "添加域名失败");
      }
    }

    // DELETE /domains/:id
    if (method === "delete") {
      const match = pathname.match(/\/domains\/([^\/]+)/);
      const domainId = match ? match[1] : "";
      try {
        const res = MockDB.deleteDomain(workspaceId, domainId);
        return successResponse(res, res.message);
      } catch (err: any) {
        return errorResponse(err.message || "删除域名失败");
      }
    }
  }

  // Links
  if (url.includes("/links")) {
    if (url.includes("/links/check-slug")) {
      const parsedUrl = new URL(url, "http://localhost");
      const domain = parsedUrl.searchParams.get("domain") || "art.link";
      const slug = parsedUrl.searchParams.get("slug") || "";
      const excludeId = parsedUrl.searchParams.get("excludeId") || undefined;
      if (!slug) {
        return successResponse({ available: true, message: "请输入别名" });
      }
      const isTaken = MockDB.isLinkSlugTaken(domain, slug, excludeId);
      return successResponse({
        available: !isTaken,
        message: isTaken ? `别名 "${slug}" 在域名 ${domain} 下已被占用` : "该别名可用",
      });
    }

    if (url.includes("/status") && (method === "patch" || method === "put")) {
      const match = url.match(/\/links\/([^/]+)\/status/);
      const linkId = match ? match[1] : "";
      try {
        const updated = MockDB.toggleLinkStatus(workspaceId, linkId);
        return successResponse(updated, updated.isEnabled ? "短链已启用" : "短链已暂停访问");
      } catch (err: any) {
        return errorResponse(err.message || "切换状态失败");
      }
    }

    if (method === "post") {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      try {
        const created = MockDB.createShortLink(workspaceId, {
          domain: body?.domain || "art.link",
          slug: body?.slug,
          originalUrl: body?.originalUrl || "",
          title: body?.title,
          description: body?.description,
        });
        return successResponse(created, "短链创建成功");
      } catch (err: any) {
        return errorResponse(err.message || "创建短链失败");
      }
    }

    if (method === "put") {
      const match = url.match(/\/links\/([^/?]+)/);
      const linkId = match ? match[1] : "";
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      try {
        const updated = MockDB.updateShortLink(workspaceId, linkId, body);
        return successResponse(updated, "短链已更新成功");
      } catch (err: any) {
        return errorResponse(err.message || "更新短链失败");
      }
    }

    if (method === "delete") {
      const match = url.match(/\/links\/([^/?]+)/);
      const linkId = match ? match[1] : "";
      try {
        MockDB.deleteShortLink(workspaceId, linkId);
        return successResponse(null, "短链已成功删除");
      } catch (err: any) {
        return errorResponse(err.message || "删除短链失败");
      }
    }

    const links = MockDB.getLinks(workspaceId);
    return successResponse({
      items: links,
      total: links.length,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
  }

  // Analytics
  const queryParams = config.params || {};
  const urlSearchParams = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
  const range = (queryParams.range || urlSearchParams.get("range") || "30d") as any;
  const linkId = queryParams.linkId || urlSearchParams.get("linkId") || undefined;

  if (url.includes("/analytics/summary")) {
    return successResponse(MockDB.getAnalyticsSummary(workspaceId, linkId));
  }

  if (url.includes("/analytics/timeseries")) {
    return successResponse(MockDB.getAnalyticsTimeseries(workspaceId, range, linkId));
  }

  if (url.includes("/analytics/devices")) {
    return successResponse(MockDB.getAnalyticsDevices(workspaceId, range, linkId));
  }

  if (url.includes("/analytics/referrers")) {
    return successResponse(MockDB.getAnalyticsReferrers(workspaceId, range, linkId));
  }

  if (url.includes("/analytics/countries")) {
    return successResponse(MockDB.getAnalyticsCountries(workspaceId, range, linkId));
  }

  if (url.includes("/analytics/overview") || url.includes("/stats/overview")) {
    return successResponse(MockDB.getOverviewStats(workspaceId));
  }

  // Fallback for any /api/v1 endpoints
  return successResponse({}, "Mock 响应成功");
}
