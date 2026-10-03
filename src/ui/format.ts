import type { ClaimState, EvidenceLevel, RecommendationKind } from "../domain/types";

export function formatRemaining(ms: number | null): string {
  if (ms == null) return "沒有截止";
  if (ms < 0) return "已過期";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} 分鐘`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} 小時 ${minutes % 60} 分`;
  return `${Math.floor(hours / 24)} 天 ${hours % 24} 小時`;
}

export function evidenceLabel(level: EvidenceLevel): string {
  switch (level) {
    case "OFFICIAL":
      return "官方";
    case "COMMUNITY_VERIFIED":
      return "社群複核";
    case "COMMUNITY_REPORT":
      return "社群回報";
    case "INFERRED":
      return "推論";
    default:
      return "未知";
  }
}

export function claimLabel(state: ClaimState): string {
  switch (state) {
    case "AVAILABLE":
      return "可領";
    case "CLAIMED":
      return "已領";
    case "MISSED":
      return "已錯過";
    default:
      return "未確認";
  }
}

export function kindLabel(kind: RecommendationKind): string {
  switch (kind) {
    case "DO_NOW":
      return "現在做";
    case "DO_TODAY":
      return "今天做";
    case "CLAIM_NOW":
      return "現在領";
    case "CLAIM_LATER":
      return "晚點領";
    case "SAVE":
      return "先保留";
    case "SPEND":
      return "可以花";
    case "SKIP":
      return "先跳過";
    default:
      return "先觀察";
  }
}

export function valueLabel(value: number): string {
  if (value >= 70) return "高";
  if (value >= 40) return "中";
  return "低";
}

export const ACTIONABLE = new Set<RecommendationKind>([
  "DO_NOW",
  "DO_TODAY",
  "CLAIM_NOW",
  "CLAIM_LATER",
  "SAVE",
  "SPEND",
]);
