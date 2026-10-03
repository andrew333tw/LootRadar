import { SCHEMA_VERSION, type PlayerState } from "./types";

export const STORAGE_KEY = "lootradar.player.v1";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ExportEnvelope {
  schemaVersion: 1;
  app: "LootRadar";
  exportedAt: string;
  state: PlayerState;
}

const SECRET_KEY = /password|passwd|credential|token|secret/i;

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function assertNoSecrets(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoSecrets);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) throw new Error("rejected secret-like field");
      assertNoSecrets(child);
    }
  }
}

function isPlayerState(value: unknown): value is PlayerState {
  if (!value || typeof value !== "object") return false;
  const state = value as PlayerState;
  return (
    state.schemaVersion === SCHEMA_VERSION &&
    (state.mode === "sample" || state.mode === "personal") &&
    typeof state.timezone === "string" &&
    Array.isArray(state.goals) &&
    Array.isArray(state.inventory) &&
    Array.isArray(state.claims) &&
    Array.isArray(state.eventProgress) &&
    Array.isArray(state.codeClaims) &&
    !!state.flags &&
    Array.isArray(state.screenshots) &&
    Array.isArray(state.recommendationHistory) &&
    Array.isArray(state.customEvents) &&
    Array.isArray(state.customCodes)
  );
}

export function exportEnvelope(state: PlayerState, now: Date): ExportEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: "LootRadar",
    exportedAt: now.toISOString(),
    state,
  };
}

export function importEnvelope(raw: string): PlayerState {
  const parsed = JSON.parse(raw) as unknown;
  assertNoSecrets(parsed);
  if (!parsed || typeof parsed !== "object") throw new Error("unsupported schemaVersion");
  const envelope = parsed as { schemaVersion?: number; app?: string; state?: unknown };
  if (envelope.schemaVersion !== SCHEMA_VERSION) throw new Error("unsupported schemaVersion");
  if (envelope.app && envelope.app !== "LootRadar") throw new Error("unsupported schemaVersion");
  if (!isPlayerState(envelope.state)) throw new Error("unsupported schemaVersion");
  return envelope.state;
}

export function saveState(store: KeyValueStore, state: PlayerState): void {
  store.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(store: KeyValueStore): PlayerState | null {
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as unknown;
  assertNoSecrets(parsed);
  if (!isPlayerState(parsed)) throw new Error("unsupported schemaVersion");
  return parsed;
}
