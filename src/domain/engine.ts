import { loadCatalog } from "./catalog";
import { classifyAction } from "./recommend";
import { dailyWindow, eventWindow, localDateKey, resolveClaimState, shiftDate, wasMissed, weeklyWindow, zonedTimeToUtc } from "./reset";
import { evidenceConfidence, goalRelevance, priorityScore, urgencyFromDeadline } from "./score";
import type {
  Catalog,
  ClaimState,
  EventDefinition,
  Freshness,
  Materialized,
  OpportunityDefinition,
  PlayerState,
  RadarState,
  Recommendation,
  TruthLane,
  ViewEvent,
  ViewOpportunity,
} from "./types";

const SAMPLE_GOALS: Record<string, number> = {
  "tata-marbles": 1,
  "tata-character": 1,
  "tata-cards": 0.6,
  "tata-event-reward": 0.8,
  "pb-fruit": 0.5,
  "pb-decor": 0.4,
};

interface TimedWindow {
  id: string;
  start: Date | null;
  end: Date | null;
  status: "upcoming" | "active" | "expired";
}

interface ResolvedEvent {
  id: string;
  gameId: string;
  title: string;
  start: string | null;
  end: string | null;
  status: ViewEvent["status"];
  remainingMs: number | null;
  summary: string;
  evidence: EventDefinition["evidence"];
  freeRewards: EventDefinition["freeRewards"];
  requiredResourceId?: string;
  sample: boolean;
}

function blank(now: Date, mode: PlayerState["mode"], catalog: Catalog): PlayerState {
  return {
    schemaVersion: 1,
    mode,
    timezone: "Asia/Taipei",
    sampleAnchor: mode === "sample" ? now.toISOString() : null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    goals: catalog.goals.map((goal) => ({
      goalId: goal.id,
      enabled: mode === "sample" ? SAMPLE_GOALS[goal.id] != null : false,
      weight: SAMPLE_GOALS[goal.id] ?? 0.6,
    })),
    inventory: catalog.resources.map((resource) => ({ resourceId: resource.id, quantity: null })),
    claims: [],
    eventProgress: [],
    codeClaims: [],
    flags: {},
    screenshots: [],
    recommendationHistory: [],
    customEvents: [],
    customCodes: [],
  };
}

export function createPersonalState(now: Date): PlayerState {
  return blank(now, "personal", loadCatalog());
}

export function createSampleState(now: Date): PlayerState {
  const catalog = loadCatalog();
  const state = blank(now, "sample", catalog);
  const day = dailyWindow(now, 0, 0, state.timezone);
  const previous = dailyWindow(new Date(day.start.getTime() - 1), 0, 0, state.timezone);
  const stamp = now.toISOString();
  state.claims = [
    {
      opportunityId: "pb-bullhorn",
      state: "AVAILABLE",
      windowId: previous.id,
      updatedAt: stamp,
    },
  ];
  state.inventory = state.inventory.map((item) => {
    const seeded: Record<string, number> = {
      "tata-marbles": 380,
      "tata-candy": 1200,
      "tata-card-packs": 2,
      "tata-capsules": 3,
      "tata-biscuits": 6,
      "tata-event-currency": 20,
      "pb-coins": 12,
      "pb-petals": 40,
      "pb-nectar": 15,
      "pb-event-currency": 8,
      "pb-seedlings": 2,
    };
    return seeded[item.resourceId] == null ? item : { ...item, quantity: seeded[item.resourceId] };
  });
  state.flags = {
    "pb-mushroom": "1/3",
    "pb-bonus-coins": "12/60",
    "pb-detector": "未使用",
    "tata-tree": "可領",
    "tata-card-album": "7/9",
    "target-character": "尚未指定角色名",
  };
  state.eventProgress = [
    { eventId: "tata-card-album", current: 7, total: 9 },
    { eventId: "tata-sample-island", current: 2, total: 5 },
    { eventId: "pb-sample-mission", current: 1, total: 3 },
  ];
  state.codeClaims = [];
  return state;
}

const ACTIONABLE = new Set(["DO_NOW", "DO_TODAY", "CLAIM_NOW", "CLAIM_LATER", "SAVE", "SPEND"]);

export function truthLane(opp: OpportunityDefinition): TruthLane {
  if (opp.sample) return "sample";
  const freshness = opp.freshness ?? "UNVERIFIED";
  const free = opp.free !== false && opp.cost === 0;
  if (opp.evidence.level === "OFFICIAL" && freshness === "FRESH" && free) return "verified";
  return "needs-verify";
}

function radarOf(lane: TruthLane, claimState: ClaimState, windowStatus: TimedWindow["status"]): RadarState {
  if (windowStatus === "upcoming") return "UPCOMING";
  if (windowStatus === "expired") {
    if (claimState === "CLAIMED") return "CLAIMED";
    if (claimState === "MISSED") return "MISSED";
    return "EXPIRED";
  }
  if (lane === "needs-verify") return "NEEDS_VERIFY";
  if (lane === "sample") {
    if (claimState === "CLAIMED") return "CLAIMED";
    if (claimState === "MISSED") return "MISSED";
    if (claimState === "AVAILABLE") return "AVAILABLE";
    return "UNKNOWN";
  }
  if (claimState === "CLAIMED") return "CLAIMED";
  if (claimState === "MISSED") return "MISSED";
  return "AVAILABLE";
}

function wallToUtc(wall: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(wall);
  if (!match) return new Date(wall);
  return zonedTimeToUtc(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
    timeZone,
  );
}

function dateLimitedWindow(opp: OpportunityDefinition, today: string, timeZone: string, now: Date): TimedWindow | "hidden" | null {
  if (opp.hiddenOnLocalDates?.includes(today)) return "hidden";
  if (!opp.activeLocalDates?.length || opp.activeLocalDates.includes(today)) return null;
  const next = opp.activeLocalDates.find((day) => day > today);
  if (!next) return { id: `dates:${opp.id}:past`, start: null, end: null, status: "expired" };
  const [year, month, day] = next.split("-").map(Number);
  const start = zonedTimeToUtc(year, month, day, 0, 0, 0, timeZone);
  const endDate = shiftDate(year, month, day, 1);
  const end = zonedTimeToUtc(endDate.year, endDate.month, endDate.day, 0, 0, 0, timeZone);
  return {
    id: `dates:${opp.id}:${next}`,
    start,
    end,
    status: now < start ? "upcoming" : "active",
  };
}

function resolveEvent(event: EventDefinition, state: PlayerState, now: Date): ResolvedEvent | null {
  if (event.sample && state.mode !== "sample") return null;
  const timeZone = state.timezone || "Asia/Taipei";
  let start: Date | null = event.localStart ? wallToUtc(event.localStart, timeZone) : event.start ? new Date(event.start) : null;
  let end: Date | null = event.localEnd ? wallToUtc(event.localEnd, timeZone) : event.end ? new Date(event.end) : null;
  if (event.sampleOffset && state.sampleAnchor) {
    const anchor = new Date(state.sampleAnchor).getTime();
    start = new Date(anchor + event.sampleOffset.startHours * 3_600_000);
    end = new Date(anchor + event.sampleOffset.endHours * 3_600_000);
  }
  let status: ResolvedEvent["status"] = "undated";
  let remainingMs: number | null = null;
  if (start && end) {
    status = now < start ? "upcoming" : now < end ? "active" : "expired";
    remainingMs = end.getTime() - now.getTime();
  }
  return {
    id: event.id,
    gameId: event.gameId,
    title: event.title,
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    status,
    remainingMs,
    summary: event.summary,
    evidence: event.evidence,
    freeRewards: event.freeRewards,
    requiredResourceId: event.requiredResourceId,
    sample: Boolean(event.sample),
  };
}

function windowFor(opp: OpportunityDefinition, events: ResolvedEvent[], state: PlayerState, now: Date): TimedWindow {
  const tz = state.timezone || "Asia/Taipei";
  if (opp.reset.type === "daily") {
    const window = dailyWindow(now, opp.reset.hour ?? 0, opp.reset.minute ?? 0, tz);
    return { id: window.id, start: window.start, end: window.end, status: "active" };
  }
  if (opp.reset.type === "weekly") {
    const window = weeklyWindow(now, opp.reset.weekday ?? 1, opp.reset.hour ?? 0, opp.reset.minute ?? 0, tz);
    return { id: window.id, start: window.start, end: window.end, status: "active" };
  }
  if (opp.reset.type === "event") {
    const event = events.find((item) => item.id === (opp.eventId || opp.reset.eventId));
    if (!event?.start || !event.end || event.status === "undated") {
      return { id: `event:${opp.id}:none`, start: null, end: null, status: "upcoming" };
    }
    const window = eventWindow(now, event.start, event.end, event.id);
    return window;
  }
  return { id: `permanent:${opp.id}`, start: null, end: null, status: "active" };
}

function deadlineLabel(end: Date | null, now: Date): string {
  if (!end) return "沒有截止";
  const ms = end.getTime() - now.getTime();
  if (ms < 0) return "已過期";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} 分鐘`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} 小時 ${minutes % 60} 分鐘`;
  return `${Math.floor(hours / 24)} 天`;
}

function quantityLabel(opp: OpportunityDefinition): string {
  if (opp.reward.quantity == null) return "數量未驗證";
  return opp.reward.approximate ? `約 ${opp.reward.quantity}` : String(opp.reward.quantity);
}

function advise(
  opp: OpportunityDefinition,
  claimState: ClaimState,
  window: TimedWindow,
  state: PlayerState,
  now: Date,
): Recommendation {
  const hours = window.end ? (window.end.getTime() - now.getTime()) / 3_600_000 : null;
  const relevance = goalRelevance(opp.goalTags, state.goals);
  const confidence = evidenceConfidence(opp.evidence.level);
  const kind = classifyAction({
    claimState,
    policy: opp.policy,
    hoursToDeadline: hours,
    cost: opp.cost,
    currentValue: opp.marginalValue ?? opp.estimatedValue,
    laterValue: opp.laterValue,
    goalRelevance: relevance,
  });
  const score = priorityScore({
    rewardValue: opp.estimatedValue,
    urgency: urgencyFromDeadline(hours),
    goalRelevance: relevance,
    confidence,
    cost: opp.cost,
    effort: opp.estimatedEffort,
  });
  return {
    id: `rec:${opp.id}`,
    opportunityId: opp.id,
    gameId: opp.gameId,
    kind,
    action: opp.action,
    why: opp.why,
    reward: opp.reward.label,
    cost: String(opp.cost),
    deadline: deadlineLabel(window.end, now),
    confidence,
    evidenceLevel: opp.evidence.level,
    priorityScore: score,
  };
}

export function materialize(catalog: Catalog, state: PlayerState, now: Date): Materialized {
  const events = catalog.events
    .map((event) => resolveEvent(event, state, now))
    .filter((event): event is ResolvedEvent => event != null);

  const opportunities: ViewOpportunity[] = [];
  const timeZone = state.timezone || "Asia/Taipei";
  const today = localDateKey(now, timeZone);
  for (const opp of catalog.opportunities) {
    if (opp.active === false) continue;
    if (opp.sample && state.mode !== "sample") continue;
    const lane = truthLane(opp);
    const limited = dateLimitedWindow(opp, today, timeZone, now);
    if (limited === "hidden") continue;
    const window = limited ?? windowFor(opp, events, state, now);
    if (window.status === "upcoming" && lane !== "verified") continue;
    const stored = state.claims.find((claim) => claim.opportunityId === opp.id && claim.windowId === window.id) ?? null;
    const defaults: ClaimState = state.mode === "sample" && lane === "sample" ? "AVAILABLE" : "UNKNOWN";
    const claimState = resolveClaimState({
      stored,
      windowId: window.id,
      windowStatus: window.status,
      defaultState: defaults,
    });
    if (window.status === "expired" && !stored) continue;
    const radarState = radarOf(lane, claimState, window.status);
    const decisionClaim: ClaimState =
      lane === "verified" && claimState === "UNKNOWN" && window.status === "active" ? "AVAILABLE" : claimState;
    const recommendation = advise(opp, decisionClaim, window, state, now);
    let missedPrevious = false;
    if (opp.reset.type === "daily" || opp.reset.type === "weekly") {
      const tz = state.timezone || "Asia/Taipei";
      const current =
        opp.reset.type === "daily"
          ? dailyWindow(now, opp.reset.hour ?? 0, opp.reset.minute ?? 0, tz)
          : weeklyWindow(now, opp.reset.weekday ?? 1, opp.reset.hour ?? 0, opp.reset.minute ?? 0, tz);
      const previous =
        opp.reset.type === "daily"
          ? dailyWindow(new Date(current.start.getTime() - 1), opp.reset.hour ?? 0, opp.reset.minute ?? 0, tz)
          : weeklyWindow(new Date(current.start.getTime() - 1), opp.reset.weekday ?? 1, opp.reset.hour ?? 0, opp.reset.minute ?? 0, tz);
      missedPrevious = wasMissed(state.claims, opp.id, previous.id);
    }
    opportunities.push({
      id: opp.id,
      gameId: opp.gameId,
      title: opp.title,
      category: opp.category,
      rewardLabel: opp.reward.label,
      quantityLabel: quantityLabel(opp),
      claimState,
      resetAt: window.end ? window.end.toISOString() : null,
      expiresAt: window.end ? window.end.toISOString() : null,
      remainingMs: window.end ? window.end.getTime() - now.getTime() : null,
      prerequisite: opp.prerequisite,
      evidence: opp.evidence,
      action: opp.action,
      estimatedValue: opp.estimatedValue,
      estimatedEffort: opp.estimatedEffort,
      cost: opp.cost,
      userProgress: opp.progressFlag ? state.flags[opp.progressFlag] : undefined,
      missedPrevious,
      recommendation,
      lane,
      radarState,
      freshness: (opp.freshness ?? "UNVERIFIED") as Freshness,
      urgent:
        lane === "verified" &&
        radarState === "AVAILABLE" &&
        window.end != null &&
        window.end.getTime() - now.getTime() <= 24 * 3_600_000 &&
        window.end.getTime() - now.getTime() >= 0,
      opensAt: window.status === "upcoming" && window.start ? window.start.toISOString() : null,
    });
  }

  const recommendations = [...opportunities.map((item) => item.recommendation)].sort(
    (a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id),
  );

  const viewEvents: ViewEvent[] = events.map((event) => {
    const progress = state.eventProgress.find((item) => item.eventId === event.id) ?? null;
    const recommendation =
      opportunities.find((item) => catalog.opportunities.find((opp) => opp.id === item.id)?.eventId === event.id)
        ?.recommendation ?? null;
    return {
      id: event.id,
      gameId: event.gameId,
      title: event.title,
      start: event.start,
      end: event.end,
      remainingMs: event.remainingMs,
      status: event.status,
      freeRewards: event.freeRewards,
      progress: progress ? { current: progress.current, total: progress.total } : null,
      requiredResourceId: event.requiredResourceId,
      summary: event.summary,
      evidence: event.evidence,
      sample: event.sample,
      recommendation,
    };
  });

  for (const custom of state.customEvents) {
    const start = custom.start ? new Date(custom.start) : null;
    const end = custom.end ? new Date(custom.end) : null;
    const status: ViewEvent["status"] = start && end ? (now < start ? "upcoming" : now < end ? "active" : "expired") : "undated";
    viewEvents.push({
      id: custom.id,
      gameId: custom.gameId,
      title: custom.title,
      start: custom.start,
      end: custom.end,
      remainingMs: end ? end.getTime() - now.getTime() : null,
      status,
      freeRewards: custom.note ? [{ label: custom.note, quantity: null }] : [],
      progress: state.eventProgress.find((item) => item.eventId === custom.id) ?? null,
      summary: custom.note,
      evidence: { level: "UNKNOWN", source: "玩家自行輸入", retrievedAt: state.updatedAt },
      sample: false,
      recommendation: null,
    });
  }

  const tracked = opportunities.filter((item) => item.claimState === "CLAIMED" || item.claimState === "AVAILABLE" || item.claimState === "MISSED");
  const claimed = tracked.filter((item) => item.claimState === "CLAIMED").length;
  return {
    opportunities,
    events: viewEvents,
    recommendations,
    summary: {
      highValue: opportunities.filter((item) => item.claimState === "AVAILABLE" && item.estimatedValue >= 70).length,
      expiring: opportunities.filter(
        (item) =>
          item.claimState === "AVAILABLE" &&
          item.remainingMs != null &&
          item.remainingMs >= 0 &&
          item.remainingMs <= 6 * 3_600_000,
      ).length,
      unclaimed: opportunities.filter((item) => item.claimState === "AVAILABLE").length,
      completion: tracked.length === 0 ? 0 : claimed / tracked.length,
      verifiedOpen: opportunities.filter((item) => item.lane === "verified" && item.radarState === "AVAILABLE").length,
      verifiedClaimed: opportunities.filter((item) => item.lane === "verified" && item.radarState === "CLAIMED").length,
      expiringDay: opportunities.filter((item) => item.urgent).length,
      needsVerify: opportunities.filter((item) => item.lane === "needs-verify").length,
    },
  };
}

export function verifiedActions(view: Materialized): Recommendation[] {
  const open = new Set(
    view.opportunities.filter((item) => item.lane === "verified" && item.radarState === "AVAILABLE").map((item) => item.id),
  );
  return view.recommendations.filter((item) => open.has(item.opportunityId) && ACTIONABLE.has(item.kind));
}

export function verifiedTop3(view: Materialized): Recommendation[] {
  return verifiedActions(view).slice(0, 3);
}

export function setClaim(
  catalog: Catalog,
  state: PlayerState,
  opportunityId: string,
  claimState: ClaimState,
  now: Date,
): PlayerState {
  const opp = catalog.opportunities.find((item) => item.id === opportunityId);
  if (!opp) throw new Error(`unknown opportunity ${opportunityId}`);
  const resolved = catalog.events
    .map((event) => resolveEvent(event, state, now))
    .filter((event): event is ResolvedEvent => event != null);
  const window = windowFor(opp, resolved, state, now);
  const claims = state.claims.filter((claim) => !(claim.opportunityId === opportunityId && claim.windowId === window.id));
  claims.push({
    opportunityId,
    state: claimState,
    windowId: window.id,
    updatedAt: now.toISOString(),
  });
  return { ...state, claims, updatedAt: now.toISOString() };
}

export { mergeCatalog } from "./catalog";
