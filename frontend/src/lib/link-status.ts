import { ShortLinkDto } from "@/types/api";

export type LinkComputedStatus = "active" | "expiring" | "expired" | "paused";

/** 24 小时临期预警毫秒数 */
export const EXPIRING_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * 计算短链的综合运行状态
 */
export function getLinkComputedStatus(link: Pick<ShortLinkDto, "isEnabled" | "expiresAt">): LinkComputedStatus {
  if (link.expiresAt) {
    const expireTime = new Date(link.expiresAt).getTime();
    const now = Date.now();
    if (expireTime <= now) {
      return "expired";
    }
    if (expireTime - now <= EXPIRING_THRESHOLD_MS) {
      return "expiring";
    }
  }

  return link.isEnabled ? "active" : "paused";
}

/**
 * 格式化到期剩余时间提示文本
 */
export function formatRemainingTime(expiresAt?: string | null): string {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "已于 " + formatDateTimeShort(expiresAt) + " 过期失效";

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return `${days} 天 ${remHours > 0 ? `${remHours} 小时` : ""}后失效`;
  }
  if (hours > 0) {
    return `${hours} 小时 ${minutes > 0 ? `${minutes} 分钟` : ""}后失效`;
  }
  return `${Math.max(1, minutes)} 分钟后失效`;
}

/**
 * 简短日期时间格式化 (YYYY-MM-DD HH:mm)
 */
export function formatDateTimeShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoString;
  }
}
