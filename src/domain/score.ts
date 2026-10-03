import type { EvidenceLevel, PlayerGoalState } from "./types";

const CONFIDENCE: Record<EvidenceLevel, number> = {
  OFFICIAL: 1,
  COMMUNITY_VERIFIED: 0.85,
  COMMUNITY_REPORT: 0.65,
  INFERRED: 0.45,
  UNKNOWN: 0.25,
};

export interface ScoreInput {
  rewardValue: number;
  urgency: number;
  goalRelevance: number;
  confidence: number;
  cost: number;
  effort: number;
}

export function evidenceConfidence(level: EvidenceLevel): number {
  return CONFIDENCE[level];
}

export function urgencyFromDeadline(hours: number | null): number {
  if (hours == null) return 0.45;
  if (hours < 0) return 2;
  if (hours <= 1) return 2;
  if (hours <= 6) return 1.6;
  if (hours <= 24) return 1.15;
  if (hours <= 72) return 0.85;
  return 0.55;
}

export function goalRelevance(goalTags: string[], goals: PlayerGoalState[]): number {
  const enabled = goals.filter((goal) => goal.enabled);
  if (enabled.length === 0) return 1;
  const matched = enabled.filter((goal) => goalTags.includes(goal.goalId));
  if (matched.length === 0) return 0.45;
  const best = Math.max(...matched.map((goal) => goal.weight));
  return Math.round((0.8 + best) * 100) / 100;
}

export function priorityScore(input: ScoreInput): number {
  const denominator = Math.max(0.25, input.cost + input.effort);
  const raw =
    (input.rewardValue * input.urgency * input.goalRelevance * input.confidence) / denominator;
  return Math.round(raw * 100) / 100;
}
