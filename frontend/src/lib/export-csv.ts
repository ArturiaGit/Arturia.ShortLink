import { ShortLinkDto } from "@/types/api";

/**
 * 将短链数据集导出为带有 UTF-8 BOM 的 CSV 文件并触发浏览器下载
 */
export function exportLinksToCsv(
  links: ShortLinkDto[],
  workspaceName: string = "workspace"
): void {
  const headers = [
    "短码 (Slug)",
    "完整短链 (Short URL)",
    "目标长链接 (Original URL)",
    "归属域名 (Domain)",
    "标题 (Title)",
    "备注描述 (Description)",
    "访问量 (PV)",
    "访客数 (UV)",
    "运行状态 (Status)",
    "创建时间 (Created At)",
  ];

  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const rows = links.map((item) => [
    escapeCell(item.slug),
    escapeCell(item.fullShortUrl),
    escapeCell(item.originalUrl),
    escapeCell(item.domain),
    escapeCell(item.title),
    escapeCell(item.description || ""),
    escapeCell(item.pvCount),
    escapeCell(item.uvCount),
    escapeCell(item.isEnabled ? "已启用" : "已暂停"),
    escapeCell(item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : ""),
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");

  // 添加 UTF-8 BOM (\uFEFF) 防止 Excel 打开中文乱码
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const cleanWsName = workspaceName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_");
  const filename = `links_${cleanWsName}_${timestamp}.csv`;

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
