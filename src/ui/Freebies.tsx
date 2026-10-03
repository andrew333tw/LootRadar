import { useState } from "react";
import type { ClaimState } from "../domain/types";
import { ClaimSwitch, OpportunityCard } from "./bits";
import { evidenceLabel } from "./format";
import { usePlayer } from "./player";

const FILTERS = [
  { id: "daily", label: "每日" },
  { id: "weekly", label: "每週" },
  { id: "redeem", label: "兌換碼" },
  { id: "manual", label: "手動" },
] as const;

export function Freebies() {
  const { catalog, state, view, setClaimState, setCodeClaim, addCode } = usePlayer();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("daily");
  const [gameId, setGameId] = useState("tata-adventure");
  const [code, setCode] = useState("");
  const [reward, setReward] = useState("");
  const [expiry, setExpiry] = useState("");

  const codes = [
    ...catalog.codes.map((item) => ({ ...item, sourceLabel: item.evidence.source })),
    ...state.customCodes.map((item) => ({
      id: item.id,
      gameId: item.gameId,
      code: item.code,
      rewardLabel: item.rewardLabel,
      expiry: item.expiry,
      evidence: { level: "UNKNOWN" as const, source: item.source, note: "玩家自行輸入，不是官方。" },
      sourceLabel: item.source,
    })),
  ];

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">白拿</p>
        <h1>免費與兌換</h1>
      </header>
      <div className="filters" role="tablist">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {filter !== "redeem"
        ? view.opportunities
            .filter((item) => (filter === "manual" ? item.category === "manual" || item.category === "spend" : item.category === filter))
            .map((item) => <OpportunityCard key={item.id} item={item} onClaim={(next) => setClaimState(item.id, next)} />)
        : null}
      {filter === "redeem" ? (
        <>
          <form
            className="panel"
            onSubmit={(event) => {
              event.preventDefault();
              if (!code.trim()) return;
              addCode({ gameId, code, rewardLabel: reward || "玩家自行填寫", expiry: expiry || null });
              setCode("");
              setReward("");
              setExpiry("");
            }}
          >
            <h2>自己加一組兌換碼</h2>
            <label>
              遊戲
              <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
                {catalog.games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              兌換碼
              <input value={code} onChange={(event) => setCode(event.target.value)} required />
            </label>
            <label>
              獎勵
              <input value={reward} onChange={(event) => setReward(event.target.value)} placeholder="不知道就留空" />
            </label>
            <label>
              到期
              <input type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
            </label>
            <button className="cta" type="submit">
              存進我的兌換碼
            </button>
          </form>
          {codes.map((item) => {
            const claim = state.codeClaims.find((entry) => entry.codeId === item.id)?.state ?? "UNKNOWN";
            return (
              <article key={item.id} className="card">
                <header className="card-head">
                  <h3>{item.code}</h3>
                  <span className={`evidence evidence-${item.evidence.level}`}>{evidenceLabel(item.evidence.level)}</span>
                </header>
                <p>{item.rewardLabel}</p>
                <p className="fine">{item.expiry ? `到期 ${item.expiry}` : "到期未知"} · {catalog.games.find((game) => game.id === item.gameId)?.shortName}</p>
                {item.evidence.note ? <p className="fine">{item.evidence.note}</p> : null}
                <ClaimSwitch value={claim as ClaimState} onChange={(next) => setCodeClaim(item.id, next)} />
              </article>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
