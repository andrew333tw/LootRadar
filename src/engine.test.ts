import { describe, expect, it } from "vitest";
import type { ClaimState, PlayerState } from "./domain/types";
import { evidenceConfidence, goalRelevance, priorityScore, urgencyFromDeadline } from "./domain/score";
import { classifyAction } from "./domain/recommend";
import { dailyWindow, eventWindow, resolveClaimState, wasMissed, weeklyWindow } from "./domain/reset";
import {
  STORAGE_KEY,
  exportEnvelope,
  importEnvelope,
  loadState,
  memoryStore,
  saveState,
} from "./domain/persist";
import { applyIngest, buildDraft } from "./domain/ingest";
import { createPersonalState, createSampleState, materialize, mergeCatalog, setClaim } from "./domain/engine";
import { loadCatalog } from "./domain/catalog";

const noon = new Date("2026-10-04T04:00:00.000Z");

function blankState(): PlayerState {
  return {
    schemaVersion: 1 as const,
    mode: "personal" as const,
    timezone: "Asia/Taipei",
    sampleAnchor: null,
    createdAt: "2026-10-04T00:00:00.000Z",
    updatedAt: "2026-10-04T00:00:00.000Z",
    goals: [] as { goalId: string; enabled: boolean; weight: number }[],
    inventory: [] as { resourceId: string; quantity: number | null }[],
    claims: [] as PlayerState["claims"],
    eventProgress: [] as PlayerState["eventProgress"],
    codeClaims: [] as { codeId: string; state: ClaimState; updatedAt: string }[],
    flags: {} as Record<string, string>,
    screenshots: [] as {
      id: string;
      gameId: string | null;
      page: string | null;
      createdAt: string;
      appliedAt: string | null;
      observationCount: number;
    }[],
    recommendationHistory: [] as { at: string; ids: string[] }[],
    customEvents: [] as {
      id: string;
      gameId: string;
      title: string;
      start: string | null;
      end: string | null;
      note: string;
    }[],
    customCodes: [] as {
      id: string;
      gameId: string;
      code: string;
      rewardLabel: string;
      expiry: string | null;
      source: string;
    }[],
  };
}

describe("priority score", () => {
  it("is deterministic and keeps zero-cost freebies finite", () => {
    const input = {
      rewardValue: 80,
      urgency: 1.6,
      goalRelevance: 1.8,
      confidence: 1,
      cost: 0,
      effort: 0.5,
    };
    const a = priorityScore(input);
    const b = priorityScore(input);
    expect(a).toBe(b);
    expect(a).toBe(460.8);
    expect(Number.isFinite(a)).toBe(true);
  });

  it("drops when effort rises", () => {
    const base = {
      rewardValue: 50,
      urgency: 1,
      goalRelevance: 1,
      confidence: 1,
      cost: 0,
      effort: 1,
    };
    expect(priorityScore({ ...base, effort: 4 })).toBeLessThan(priorityScore(base));
  });
});

describe("urgency boundaries", () => {
  it("steps at 1h, 6h, 24h and 72h", () => {
    expect(urgencyFromDeadline(1)).toBe(2);
    expect(urgencyFromDeadline(1.01)).toBe(1.6);
    expect(urgencyFromDeadline(6)).toBe(1.6);
    expect(urgencyFromDeadline(6.01)).toBe(1.15);
    expect(urgencyFromDeadline(24)).toBe(1.15);
    expect(urgencyFromDeadline(24.01)).toBe(0.85);
    expect(urgencyFromDeadline(72)).toBe(0.85);
    expect(urgencyFromDeadline(72.01)).toBe(0.55);
    expect(urgencyFromDeadline(null)).toBe(0.45);
    expect(urgencyFromDeadline(-0.01)).toBe(2);
  });
});

describe("goal relevance", () => {
  it("raises matching goals and lowers unrelated ones", () => {
    const goals = [
      { goalId: "tata-marbles", enabled: true, weight: 1 },
      { goalId: "pb-fruit", enabled: true, weight: 0.5 },
    ];
    expect(goalRelevance(["tata-marbles"], goals)).toBe(1.8);
    expect(goalRelevance(["pb-coins"], goals)).toBe(0.45);
    expect(goalRelevance(["tata-marbles"], [])).toBe(1);
    expect(goalRelevance(["tata-marbles"], goals.map((g) => ({ ...g, enabled: false })))).toBe(1);
  });
});

describe("evidence confidence", () => {
  it("orders official above community above unknown", () => {
    expect(evidenceConfidence("OFFICIAL")).toBeGreaterThan(evidenceConfidence("COMMUNITY_VERIFIED"));
    expect(evidenceConfidence("COMMUNITY_VERIFIED")).toBeGreaterThan(evidenceConfidence("COMMUNITY_REPORT"));
    expect(evidenceConfidence("COMMUNITY_REPORT")).toBeGreaterThan(evidenceConfidence("INFERRED"));
    expect(evidenceConfidence("INFERRED")).toBeGreaterThan(evidenceConfidence("UNKNOWN"));
  });
});

describe("classify", () => {
  const base = {
    claimState: "AVAILABLE" as const,
    policy: "claim" as const,
    hoursToDeadline: 10,
    cost: 0,
    currentValue: 40,
    laterValue: 0,
    goalRelevance: 1,
  };

  it("covers the decision kinds", () => {
    expect(classifyAction({ ...base, claimState: "CLAIMED" })).toBe("SKIP");
    expect(classifyAction({ ...base, claimState: "MISSED" })).toBe("WATCH");
    expect(classifyAction({ ...base, claimState: "UNKNOWN" })).toBe("WATCH");
    expect(classifyAction({ ...base, hoursToDeadline: 1.5 })).toBe("CLAIM_NOW");
    expect(classifyAction({ ...base, hoursToDeadline: 2.5 })).toBe("DO_NOW");
    expect(classifyAction({ ...base, hoursToDeadline: 10 })).toBe("DO_TODAY");
    expect(classifyAction({ ...base, hoursToDeadline: -1 })).toBe("WATCH");
    expect(
      classifyAction({
        ...base,
        policy: "defer-claim",
        hoursToDeadline: 48,
        currentValue: 40,
        laterValue: 90,
      }),
    ).toBe("CLAIM_LATER");
    expect(
      classifyAction({
        ...base,
        policy: "defer-claim",
        hoursToDeadline: 2,
        currentValue: 40,
        laterValue: 90,
      }),
    ).toBe("CLAIM_NOW");
    expect(
      classifyAction({
        ...base,
        policy: "spend-or-save",
        currentValue: 25,
        laterValue: 80,
        goalRelevance: 1,
      }),
    ).toBe("SAVE");
    expect(
      classifyAction({
        ...base,
        policy: "spend-or-save",
        currentValue: 70,
        laterValue: 80,
        goalRelevance: 1.8,
      }),
    ).toBe("SPEND");
  });
});

describe("reset boundaries", () => {
  it("rolls the Taipei daily window at midnight", () => {
    const before = dailyWindow(new Date("2026-10-04T15:59:59.999Z"), 0, 0, "Asia/Taipei");
    const after = dailyWindow(new Date("2026-10-04T16:00:00.000Z"), 0, 0, "Asia/Taipei");
    expect(before.id).toBe("daily:2026-10-04@00:00");
    expect(after.id).toBe("daily:2026-10-05@00:00");
    expect(before.end.toISOString()).toBe(after.start.toISOString());
  });

  it("rolls the weekly window at Monday 00:00 Taipei", () => {
    const before = weeklyWindow(new Date("2026-10-04T15:59:59.999Z"), 1, 0, 0, "Asia/Taipei");
    const after = weeklyWindow(new Date("2026-10-04T16:00:00.000Z"), 1, 0, 0, "Asia/Taipei");
    expect(before.id).toBe("weekly:2026-09-28@00:00");
    expect(after.id).toBe("weekly:2026-10-05@00:00");
  });

  it("expires an event on the end instant and keeps a claimed window", () => {
    const start = "2026-10-01T00:00:00.000Z";
    const end = "2026-10-04T16:00:00.000Z";
    const active = eventWindow(new Date("2026-10-04T15:59:59.999Z"), start, end, "evt");
    const expired = eventWindow(new Date(end), start, end, "evt");
    expect(active.status).toBe("active");
    expect(expired.status).toBe("expired");
    expect(
      resolveClaimState({
        stored: { state: "CLAIMED", windowId: active.id },
        windowId: active.id,
        windowStatus: "expired",
        defaultState: "AVAILABLE",
      }),
    ).toBe("CLAIMED");
    expect(
      resolveClaimState({
        stored: { state: "AVAILABLE", windowId: active.id },
        windowId: active.id,
        windowStatus: "expired",
        defaultState: "AVAILABLE",
      }),
    ).toBe("MISSED");
    expect(
      resolveClaimState({
        stored: null,
        windowId: expired.id,
        windowStatus: "expired",
        defaultState: "AVAILABLE",
      }),
    ).toBe("UNKNOWN");
    expect(
      resolveClaimState({
        stored: { state: "CLAIMED", windowId: "daily:old" },
        windowId: "daily:new",
        windowStatus: "active",
        defaultState: "AVAILABLE",
      }),
    ).toBe("AVAILABLE");
  });

  it("only calls a miss when the previous window was left open", () => {
    expect(
      wasMissed(
        [{ opportunityId: "pb-free-detector", state: "AVAILABLE", windowId: "daily:2026-10-03@00:00" }],
        "pb-free-detector",
        "daily:2026-10-03@00:00",
      ),
    ).toBe(true);
    expect(
      wasMissed(
        [{ opportunityId: "pb-free-detector", state: "CLAIMED", windowId: "daily:2026-10-03@00:00" }],
        "pb-free-detector",
        "daily:2026-10-03@00:00",
      ),
    ).toBe(false);
    expect(wasMissed([], "pb-free-detector", "daily:2026-10-03@00:00")).toBe(false);
  });
});

describe("persistence", () => {
  it("round-trips export, wipe, and import", () => {
    const state = createPersonalState(noon);
    const store = memoryStore();
    saveState(store, state);
    expect(loadState(store)).toEqual(state);
    const raw = JSON.stringify(exportEnvelope(state, noon));
    store.removeItem(STORAGE_KEY);
    expect(loadState(store)).toBeNull();
    saveState(store, importEnvelope(raw));
    expect(loadState(store)).toEqual(state);
  });

  it("rejects future schemas, garbage, and secret-like keys", () => {
    expect(() => importEnvelope("{")).toThrow();
    expect(() => importEnvelope(JSON.stringify({ schemaVersion: 99, state: blankState() }))).toThrow(/schema/i);
    expect(() => importEnvelope(JSON.stringify({ schemaVersion: 1, app: "LootRadar", state: { password: "nope" } }))).toThrow(
      /secret|password/i,
    );
  });
});

describe("screenshot ingest", () => {
  it("parses notes, refuses unreviewed apply, and never claims OCR", () => {
    const draft = buildDraft("pikmin-mushroom.png", "蘑菇 1/3\n金幣 12/60\n彈珠 380");
    expect(draft.gameId).toBe("pikmin-bloom");
    expect(draft.reviewed).toBe(false);
    expect(draft.observations.map((item) => String(item.source)).includes("ocr")).toBe(false);
    expect(draft.observations.find((item) => item.key === "pb-mushroom")?.value).toBe("1/3");
    expect(() => applyIngest(blankState(), draft, noon)).toThrow(/review/i);

    const applied = applyIngest(blankState(), { ...draft, reviewed: true }, noon);
    expect(applied.flags["pb-mushroom"]).toBe("1/3");
    expect(applied.inventory.find((item) => item.resourceId === "pb-coins")?.quantity).toBe(12);
    expect(applied.inventory.find((item) => item.resourceId === "tata-marbles")?.quantity).toBe(380);
    expect(applied.screenshots).toHaveLength(1);
  });

  it("leaves an unknown screenshot unclassified", () => {
    const draft = buildDraft("IMG_2044.png", "");
    expect(draft.gameId).toBeNull();
    expect(draft.classificationConfidence).toBe(0);
  });
});

describe("catalog, sample, and goals", () => {
  it("keeps official Pikmin numbers and does not promote Tata community numbers", () => {
    const catalog = loadCatalog();
    expect(catalog.games.map((game) => game.id).sort()).toEqual(["pikmin-bloom", "tata-adventure"]);
    const detector = catalog.opportunities.find((item) => item.id === "pb-free-detector");
    expect(detector?.evidence.level).toBe("OFFICIAL");
    expect(detector?.reward.quantity).toBe(1);
    const mushrooms = catalog.opportunities.find((item) => item.id === "pb-mushroom-tries");
    expect(mushrooms?.reward.quantity).toBe(3);
    const coins = catalog.opportunities.find((item) => item.id === "pb-bonus-coins");
    expect(coins?.reward.quantity).toBe(60);
    const tree = catalog.opportunities.find((item) => item.id === "tata-marble-tree");
    expect(tree?.evidence.level).not.toBe("OFFICIAL");
    expect(tree?.reward.quantity == null || tree?.reward.approximate).toBe(true);
    for (const code of catalog.codes) {
      expect(code.evidence.level).not.toBe("OFFICIAL");
    }
  });

  it("sample mode shows claim-later, save, and spend, and goals change priority", () => {
    const catalog = loadCatalog();
    const state = createSampleState(noon);
    expect(state.mode).toBe("sample");
    const view = materialize(catalog, state, noon);
    const kinds = new Set(view.recommendations.map((item) => item.kind));
    expect(kinds.has("CLAIM_LATER")).toBe(true);
    expect(kinds.has("SAVE")).toBe(true);
    expect(kinds.has("SPEND")).toBe(true);
    const ranked = view.recommendations.filter((item) => item.kind !== "SKIP");
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    expect(ranked[0].priorityScore).toBeGreaterThanOrEqual(ranked[1].priorityScore);
    expect(ranked[1].priorityScore).toBeGreaterThanOrEqual(ranked[2].priorityScore);

    const before = view.recommendations.find((item) => item.opportunityId === "tata-marble-tree");
    const afterState = {
      ...state,
      goals: state.goals.map((goal) => (goal.goalId === "tata-marbles" ? { ...goal, enabled: false } : goal)),
    };
    const after = materialize(catalog, afterState, noon).recommendations.find((item) => item.opportunityId === "tata-marble-tree");
    expect(before && after && before.priorityScore).toBeGreaterThan(after!.priorityScore);
  });

  it("accepts a third game through the catalog merge without rewriting scores", () => {
    const catalog = loadCatalog();
    const extended = mergeCatalog(catalog, {
      game: { id: "demo-quest", name: "Demo Quest", shortName: "Demo", adapterVersion: "1" },
      resources: [],
      goals: [],
      events: [],
      codes: [],
      opportunities: [
        {
          id: "demo-daily",
          gameId: "demo-quest",
          title: "示範每日",
          category: "daily",
          reward: { resourceId: null, quantity: 1, approximate: false, label: "示範獎勵" },
          estimatedValue: 50,
          estimatedEffort: 1,
          cost: 0,
          reset: { type: "daily", hour: 0, minute: 0 },
          evidence: { level: "UNKNOWN", source: "test" },
          policy: "claim",
          laterValue: 0,
          goalTags: [],
          action: "打開示範",
          why: "用來證明第三款遊戲不必改核心。",
          active: true,
        },
      ],
    });
    const personal = createPersonalState(noon);
    const view = materialize(extended, personal, noon);
    expect(view.opportunities.some((item) => item.id === "demo-daily")).toBe(true);
  });

  it("stores a claim against the current window", () => {
    const catalog = loadCatalog();
    const state = createPersonalState(noon);
    const next = setClaim(catalog, state, "pb-free-detector", "CLAIMED", noon);
    const view = materialize(catalog, next, noon);
    expect(view.opportunities.find((item) => item.id === "pb-free-detector")?.claimState).toBe("CLAIMED");
  });
});
