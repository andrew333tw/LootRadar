import type { PlayerState } from "./types";

export interface Observation {
  id: string;
  target: "inventory" | "claim" | "progress";
  key: string;
  value: string;
  confidence: number;
  label: string;
  source: "text-rule" | "manual" | "filename";
}

export interface IngestDraft {
  id: string;
  fileName: string;
  gameId: string | null;
  page: string | null;
  note: string;
  reviewed: boolean;
  classificationConfidence: number;
  observations: Observation[];
}

const PAGE_RULES: { re: RegExp; page: string }[] = [
  { re: /mushroom|蘑菇/, page: "mushroom" },
  { re: /detector|探測/, page: "detector" },
  { re: /coin|金幣/, page: "coins" },
  { re: /marble|彈珠/, page: "marbles" },
  { re: /card|卡片|卡冊/, page: "cards" },
  { re: /event|活動/, page: "event" },
  { re: /camp|營地/, page: "camp" },
];

function classify(fileName: string, note: string) {
  const file = fileName.toLowerCase();
  let gameId: string | null = null;
  let confidence = 0;
  if (/pikmin|bloom|皮克敏/.test(file)) {
    gameId = "pikmin-bloom";
    confidence = 0.74;
  } else if (/tata|critter|塔塔/.test(file)) {
    gameId = "tata-adventure";
    confidence = 0.74;
  }
  const hay = `${fileName} ${note}`.toLowerCase();
  const page = PAGE_RULES.find((rule) => rule.re.test(hay))?.page ?? null;
  if (!gameId && !page) confidence = 0;
  return { gameId, page, confidence };
}

function parseNote(note: string): Observation[] {
  const rules: {
    re: RegExp;
    key: string;
    target: Observation["target"];
    label: string;
    value: (match: RegExpMatchArray) => string;
  }[] = [
    {
      re: /蘑菇\s*(\d+)\s*[/／]\s*(\d+)/,
      key: "pb-mushroom",
      target: "progress",
      label: "蘑菇次數",
      value: (match) => `${match[1]}/${match[2]}`,
    },
    {
      re: /金幣\s*(\d+)\s*[/／]\s*(\d+)/,
      key: "pb-coins",
      target: "inventory",
      label: "今日金幣",
      value: (match) => match[1] ?? "",
    },
    {
      re: /彈珠\s*(\d+)/,
      key: "tata-marbles",
      target: "inventory",
      label: "彈珠",
      value: (match) => match[1] ?? "",
    },
    {
      re: /糖果\s*(\d+)/,
      key: "tata-candy",
      target: "inventory",
      label: "糖果",
      value: (match) => match[1] ?? "",
    },
    {
      re: /探測器\s*(未使用|已使用|可用)/,
      key: "pb-free-detector",
      target: "claim",
      label: "免費探測器",
      value: (match) => (match[1] === "已使用" ? "CLAIMED" : "AVAILABLE"),
    },
  ];
  const found: Observation[] = [];
  for (const rule of rules) {
    const match = note.match(rule.re);
    if (!match) continue;
    found.push({
      id: `obs-${rule.key}`,
      target: rule.target,
      key: rule.key,
      value: rule.value(match),
      confidence: 0.62,
      label: rule.label,
      source: "text-rule",
    });
  }
  return found;
}

export function buildDraft(fileName: string, note: string): IngestDraft {
  const classified = classify(fileName, note);
  const observations = parseNote(note);
  if (observations.length === 0 && classified.page) {
    observations.push({
      id: `obs-blank-${classified.page}`,
      target: "progress",
      key: classified.page,
      value: "",
      confidence: 0,
      label: "這個畫面需要你填",
      source: "manual",
    });
  }
  return {
    id: `shot-${fileName}-${note.length}`,
    fileName,
    gameId: classified.gameId,
    page: classified.page,
    note,
    reviewed: false,
    classificationConfidence: classified.confidence,
    observations,
  };
}

export function applyIngest(state: PlayerState, draft: IngestDraft, now: Date): PlayerState {
  if (!draft.reviewed) throw new Error("review required before apply");
  const next: PlayerState = {
    ...state,
    inventory: state.inventory.map((item) => ({ ...item })),
    flags: { ...state.flags },
    claims: state.claims.map((claim) => ({ ...claim })),
    screenshots: [...state.screenshots],
    updatedAt: now.toISOString(),
  };
  for (const observation of draft.observations) {
    if (!observation.value) continue;
    if (observation.target === "inventory") {
      const quantity = Number(observation.value);
      if (!Number.isFinite(quantity)) continue;
      const existing = next.inventory.find((item) => item.resourceId === observation.key);
      if (existing) existing.quantity = quantity;
      else next.inventory.push({ resourceId: observation.key, quantity });
    } else if (observation.target === "progress") {
      next.flags[observation.key] = observation.value;
    } else if (observation.target === "claim") {
      next.flags[`claim:${observation.key}`] = observation.value;
    }
  }
  next.screenshots.push({
    id: draft.id,
    gameId: draft.gameId,
    page: draft.page,
    createdAt: now.toISOString(),
    appliedAt: now.toISOString(),
    observationCount: draft.observations.length,
  });
  return next;
}
