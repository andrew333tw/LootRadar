export const SCHEMA_VERSION = 1;

export type EvidenceLevel =
  | "OFFICIAL"
  | "COMMUNITY_VERIFIED"
  | "COMMUNITY_REPORT"
  | "INFERRED"
  | "UNKNOWN";

export type ClaimState = "AVAILABLE" | "CLAIMED" | "MISSED" | "UNKNOWN";

export type Freshness = "FRESH" | "STALE" | "UNVERIFIED";

export type TruthLane = "verified" | "needs-verify" | "sample";

export type RadarState =
  | "AVAILABLE"
  | "CLAIMED"
  | "MISSED"
  | "UPCOMING"
  | "EXPIRED"
  | "NEEDS_VERIFY"
  | "UNKNOWN";

export type RecommendationKind =
  | "DO_NOW"
  | "DO_TODAY"
  | "CLAIM_NOW"
  | "CLAIM_LATER"
  | "SAVE"
  | "SPEND"
  | "SKIP"
  | "WATCH";

export type DecisionPolicy = "claim" | "defer-claim" | "spend-or-save";

export interface Evidence {
  level: EvidenceLevel;
  source: string;
  retrievedAt?: string;
  note?: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  shortName: string;
  adapterVersion: string;
}

export interface ResourceDefinition {
  id: string;
  gameId: string;
  name: string;
  unit: string;
  category: string;
  evidence: Evidence;
}

export interface GoalDefinition {
  id: string;
  gameId: string;
  name: string;
  tags: string[];
}

export interface ResetRule {
  type: "daily" | "weekly" | "event" | "none";
  hour?: number;
  minute?: number;
  weekday?: number;
  eventId?: string;
}

export interface RewardDefinition {
  resourceId: string | null;
  quantity: number | null;
  approximate: boolean;
  label: string;
}

export interface OpportunityDefinition {
  id: string;
  gameId: string;
  title: string;
  category: "daily" | "weekly" | "event" | "redeem" | "manual" | "spend";
  reward: RewardDefinition;
  estimatedValue: number;
  estimatedEffort: number;
  cost: number;
  reset: ResetRule;
  eventId?: string;
  evidence: Evidence;
  policy: DecisionPolicy;
  laterValue: number;
  marginalValue?: number;
  goalTags: string[];
  action: string;
  why: string;
  active?: boolean;
  sample?: boolean;
  prerequisite?: string;
  progressFlag?: string;
  freshness?: Freshness;
  verifiedAt?: string | null;
  sourceType?: "official" | "community" | "inferred" | "player" | "unknown";
  free?: boolean;
  recurrence?: "daily" | "weekly" | "event" | "one-time" | "unknown";
  activeLocalDates?: string[];
  hiddenOnLocalDates?: string[];
}

export interface EventDefinition {
  id: string;
  gameId: string;
  title: string;
  start: string | null;
  end: string | null;
  sampleOffset?: { startHours: number; endHours: number };
  sample?: boolean;
  localStart?: string | null;
  localEnd?: string | null;
  freshness?: Freshness;
  freeRewards: { label: string; resourceId?: string; quantity: number | null }[];
  requiredResourceId?: string;
  evidence: Evidence;
  summary: string;
}

export interface RedeemCodeDefinition {
  id: string;
  gameId: string;
  code: string;
  rewardLabel: string;
  expiry: string | null;
  evidence: Evidence;
  sample?: boolean;
  freshness?: Freshness;
  verifiedAt?: string | null;
}

export interface GameBundle {
  game: GameDefinition;
  resources: ResourceDefinition[];
  goals: GoalDefinition[];
  events: EventDefinition[];
  opportunities: OpportunityDefinition[];
  codes: RedeemCodeDefinition[];
}

export interface Catalog {
  games: GameDefinition[];
  resources: ResourceDefinition[];
  goals: GoalDefinition[];
  events: EventDefinition[];
  opportunities: OpportunityDefinition[];
  codes: RedeemCodeDefinition[];
}

export interface PlayerGoalState {
  goalId: string;
  enabled: boolean;
  weight: number;
}

export interface ClaimRecord {
  opportunityId: string;
  state: ClaimState;
  windowId: string;
  updatedAt: string;
}

export interface ScreenshotMeta {
  id: string;
  gameId: string | null;
  page: string | null;
  createdAt: string;
  appliedAt: string | null;
  observationCount: number;
}

export interface PlayerState {
  schemaVersion: 1;
  mode: "sample" | "personal";
  timezone: string;
  sampleAnchor: string | null;
  createdAt: string;
  updatedAt: string;
  goals: PlayerGoalState[];
  inventory: { resourceId: string; quantity: number | null }[];
  claims: ClaimRecord[];
  eventProgress: { eventId: string; current: number; total: number }[];
  codeClaims: { codeId: string; state: ClaimState; updatedAt: string }[];
  flags: Record<string, string>;
  screenshots: ScreenshotMeta[];
  recommendationHistory: { at: string; ids: string[] }[];
  customEvents: {
    id: string;
    gameId: string;
    title: string;
    start: string | null;
    end: string | null;
    note: string;
  }[];
  customCodes: {
    id: string;
    gameId: string;
    code: string;
    rewardLabel: string;
    expiry: string | null;
    source: string;
  }[];
}

export interface Recommendation {
  id: string;
  opportunityId: string;
  gameId: string;
  kind: RecommendationKind;
  action: string;
  why: string;
  reward: string;
  cost: string;
  deadline: string;
  confidence: number;
  evidenceLevel: EvidenceLevel;
  priorityScore: number;
}

export interface ViewOpportunity {
  id: string;
  gameId: string;
  title: string;
  category: OpportunityDefinition["category"];
  rewardLabel: string;
  quantityLabel: string;
  claimState: ClaimState;
  resetAt: string | null;
  expiresAt: string | null;
  remainingMs: number | null;
  prerequisite?: string;
  evidence: Evidence;
  action: string;
  estimatedValue: number;
  estimatedEffort: number;
  cost: number;
  userProgress?: string;
  missedPrevious: boolean;
  recommendation: Recommendation;
  lane: TruthLane;
  radarState: RadarState;
  freshness: Freshness;
  urgent: boolean;
  opensAt: string | null;
}

export interface ViewEvent {
  id: string;
  gameId: string;
  title: string;
  start: string | null;
  end: string | null;
  remainingMs: number | null;
  status: "upcoming" | "active" | "expired" | "undated";
  freeRewards: { label: string; resourceId?: string; quantity: number | null }[];
  progress: { current: number; total: number } | null;
  requiredResourceId?: string;
  summary: string;
  evidence: Evidence;
  sample: boolean;
  recommendation: Recommendation | null;
}

export interface Materialized {
  opportunities: ViewOpportunity[];
  events: ViewEvent[];
  recommendations: Recommendation[];
  summary: {
    highValue: number;
    expiring: number;
    unclaimed: number;
    completion: number;
    verifiedOpen: number;
    verifiedClaimed: number;
    expiringDay: number;
    needsVerify: number;
  };
}
