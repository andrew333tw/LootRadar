import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadCatalog } from "../domain/catalog";
import { createPersonalState, createSampleState, materialize, setClaim } from "../domain/engine";
import { applyIngest, type IngestDraft } from "../domain/ingest";
import { exportEnvelope, importEnvelope, loadState, saveState, type KeyValueStore } from "../domain/persist";
import type { Catalog, ClaimState, Materialized, PlayerState } from "../domain/types";

interface PlayerApi {
  catalog: Catalog;
  state: PlayerState;
  now: Date;
  view: Materialized;
  setClaimState: (opportunityId: string, claimState: ClaimState) => void;
  setQuantity: (resourceId: string, quantity: number | null) => void;
  addResource: (gameId: string, name: string) => void;
  toggleGoal: (goalId: string) => void;
  setProgress: (eventId: string, current: number, total: number) => void;
  setCodeClaim: (codeId: string, claimState: ClaimState) => void;
  addCode: (input: { gameId: string; code: string; rewardLabel: string; expiry: string | null }) => void;
  addEvent: (input: { gameId: string; title: string; start: string | null; end: string | null; note: string }) => void;
  applyDraft: (draft: IngestDraft) => void;
  exportJson: () => string;
  importJson: (raw: string) => void;
  resetSample: () => void;
  startPersonal: () => void;
  setTheme: (theme: "system" | "light" | "dark") => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

function browserStore(): KeyValueStore {
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const catalog = useMemo(() => loadCatalog(), []);
  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<PlayerState>(() => {
    try {
      return loadState(browserStore()) ?? createSampleState(new Date());
    } catch {
      return createSampleState(new Date());
    }
  });

  useEffect(() => {
    saveState(browserStore(), state);
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const view = useMemo(() => materialize(catalog, state, now), [catalog, state, now]);

  const api: PlayerApi = {
    catalog,
    state,
    now,
    view,
    setClaimState: (opportunityId, claimState) => {
      setState((current) => setClaim(catalog, current, opportunityId, claimState, new Date()));
    },
    setQuantity: (resourceId, quantity) => {
      setState((current) => {
        const inventory = current.inventory.some((item) => item.resourceId === resourceId)
          ? current.inventory.map((item) => (item.resourceId === resourceId ? { ...item, quantity } : item))
          : [...current.inventory, { resourceId, quantity }];
        return { ...current, inventory, updatedAt: new Date().toISOString() };
      });
    },
    addResource: (gameId, name) => {
      const id = `custom-${gameId}-${Date.now()}`;
      setState((current) => ({
        ...current,
        inventory: [...current.inventory, { resourceId: id, quantity: 0 }],
        flags: { ...current.flags, [`name:${id}`]: name, [`game:${id}`]: gameId },
        updatedAt: new Date().toISOString(),
      }));
    },
    toggleGoal: (goalId) => {
      setState((current) => ({
        ...current,
        goals: current.goals.map((goal) => (goal.goalId === goalId ? { ...goal, enabled: !goal.enabled } : goal)),
        updatedAt: new Date().toISOString(),
      }));
    },
    setProgress: (eventId, currentValue, total) => {
      setState((current) => {
        const rest = current.eventProgress.filter((item) => item.eventId !== eventId);
        return {
          ...current,
          eventProgress: [...rest, { eventId, current: currentValue, total }],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    setCodeClaim: (codeId, claimState) => {
      setState((current) => {
        const rest = current.codeClaims.filter((item) => item.codeId !== codeId);
        return {
          ...current,
          codeClaims: [...rest, { codeId, state: claimState, updatedAt: new Date().toISOString() }],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    addCode: (input) => {
      const id = `code-${Date.now()}`;
      setState((current) => ({
        ...current,
        customCodes: [
          ...current.customCodes,
          { id, gameId: input.gameId, code: input.code.trim(), rewardLabel: input.rewardLabel, expiry: input.expiry, source: "玩家自行輸入" },
        ],
        codeClaims: [...current.codeClaims, { codeId: id, state: "AVAILABLE", updatedAt: new Date().toISOString() }],
        updatedAt: new Date().toISOString(),
      }));
    },
    addEvent: (input) => {
      setState((current) => ({
        ...current,
        customEvents: [
          ...current.customEvents,
          {
            id: `event-${Date.now()}`,
            gameId: input.gameId,
            title: input.title.trim(),
            start: input.start,
            end: input.end,
            note: input.note,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
    },
    applyDraft: (draft) => {
      setState((current) => applyIngest(current, draft, new Date()));
    },
    exportJson: () => JSON.stringify(exportEnvelope(state, new Date()), null, 2),
    importJson: (raw) => {
      setState(importEnvelope(raw));
    },
    resetSample: () => setState(createSampleState(new Date())),
    startPersonal: () => setState(createPersonalState(new Date())),
    setTheme: (theme) => {
      setState((current) => ({
        ...current,
        flags: { ...current.flags, theme },
        updatedAt: new Date().toISOString(),
      }));
    },
  };

  return <PlayerContext.Provider value={api}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerApi {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("PlayerProvider missing");
  return value;
}
