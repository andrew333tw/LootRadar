import type { ClaimState, DecisionPolicy, RecommendationKind } from "./types";

export interface ClassifyInput {
  claimState: ClaimState;
  policy: DecisionPolicy;
  hoursToDeadline: number | null;
  cost: number;
  currentValue: number;
  laterValue: number;
  goalRelevance: number;
}

export function classifyAction(input: ClassifyInput): RecommendationKind {
  if (input.claimState === "CLAIMED") return "SKIP";
  if (input.claimState === "MISSED" || input.claimState === "UNKNOWN") return "WATCH";
  if (input.hoursToDeadline != null && input.hoursToDeadline < 0) return "WATCH";

  if (input.policy === "spend-or-save") {
    const adjusted = input.currentValue * input.goalRelevance;
    if (adjusted >= input.laterValue && adjusted >= 40) return "SPEND";
    return "SAVE";
  }

  if (input.policy === "defer-claim") {
    const urgent = input.hoursToDeadline != null && input.hoursToDeadline >= 0 && input.hoursToDeadline <= 6;
    if (urgent) return "CLAIM_NOW";
    if (input.laterValue > input.currentValue) return "CLAIM_LATER";
    return "DO_TODAY";
  }

  if (input.hoursToDeadline != null && input.cost === 0 && input.hoursToDeadline <= 2) return "CLAIM_NOW";
  if (input.hoursToDeadline != null && input.hoursToDeadline <= 3) return "DO_NOW";
  return "DO_TODAY";
}
