import type { Catalog, GameBundle } from "./types";
import pikminGame from "../../data/games/pikmin-bloom/game.json";
import pikminResources from "../../data/games/pikmin-bloom/resources.json";
import pikminGoals from "../../data/games/pikmin-bloom/goals.json";
import pikminEvents from "../../data/games/pikmin-bloom/events.json";
import pikminOpportunities from "../../data/games/pikmin-bloom/opportunities.json";
import tataGame from "../../data/games/tata-adventure/game.json";
import tataResources from "../../data/games/tata-adventure/resources.json";
import tataGoals from "../../data/games/tata-adventure/goals.json";
import tataEvents from "../../data/games/tata-adventure/events.json";
import tataOpportunities from "../../data/games/tata-adventure/opportunities.json";
import tataCodes from "../../data/games/tata-adventure/codes.json";

function bundle(parts: GameBundle): GameBundle {
  return parts;
}

const pikmin = bundle({
  game: pikminGame,
  resources: pikminResources,
  goals: pikminGoals,
  events: pikminEvents,
  opportunities: pikminOpportunities,
  codes: [],
} as GameBundle);

const tata = bundle({
  game: tataGame,
  resources: tataResources,
  goals: tataGoals,
  events: tataEvents,
  opportunities: tataOpportunities,
  codes: tataCodes,
} as GameBundle);

export function emptyCatalog(): Catalog {
  return {
    games: [],
    resources: [],
    goals: [],
    events: [],
    opportunities: [],
    codes: [],
  };
}

export function mergeCatalog(base: Catalog, extra: GameBundle): Catalog {
  const gameId = extra.game.id;
  return {
    games: [...base.games.filter((game) => game.id !== gameId), extra.game],
    resources: [...base.resources.filter((item) => item.gameId !== gameId), ...extra.resources],
    goals: [...base.goals.filter((item) => item.gameId !== gameId), ...extra.goals],
    events: [...base.events.filter((item) => item.gameId !== gameId), ...extra.events],
    opportunities: [...base.opportunities.filter((item) => item.gameId !== gameId), ...extra.opportunities],
    codes: [...base.codes.filter((item) => item.gameId !== gameId), ...extra.codes],
  };
}

export function loadCatalog(): Catalog {
  return [pikmin, tata].reduce((catalog, extra) => mergeCatalog(catalog, extra), emptyCatalog());
}
