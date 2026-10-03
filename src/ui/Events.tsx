import { useState } from "react";
import { evidenceLabel, formatRemaining, kindLabel } from "./format";
import { usePlayer } from "./player";

export function Events() {
  const { catalog, view, setProgress, addEvent } = usePlayer();
  const [gameId, setGameId] = useState("tata-adventure");
  const [title, setTitle] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">活動</p>
        <h1>現在領、晚點領、或留著</h1>
      </header>
      {view.events.map((event) => (
        <article key={event.id} className="card">
          <header className="card-head">
            <h2>{event.title}</h2>
            {event.sample ? <span className="kind">範例</span> : null}
          </header>
          <p>{event.summary}</p>
          <dl className="meta">
            <div>
              <dt>剩餘</dt>
              <dd>{formatRemaining(event.remainingMs)}</dd>
            </div>
            <div>
              <dt>狀態</dt>
              <dd>{event.status === "active" ? "進行中" : event.status === "expired" ? "已結束" : event.status === "upcoming" ? "還沒開始" : "沒有日期"}</dd>
            </div>
          </dl>
          <ul className="reward-list">
            {event.freeRewards.map((reward) => (
              <li key={reward.label}>
                {reward.label}
                {reward.quantity == null ? " · 數量未驗證" : ` · ${reward.quantity}`}
              </li>
            ))}
          </ul>
          {event.requiredResourceId ? (
            <p className="fine">會用到：{catalog.resources.find((item) => item.id === event.requiredResourceId)?.name ?? event.requiredResourceId}</p>
          ) : null}
          {event.progress ? (
            <label className="progress-edit">
              進度 {event.progress.current}/{event.progress.total}
              <input
                type="range"
                min={0}
                max={event.progress.total}
                value={event.progress.current}
                onChange={(input) => setProgress(event.id, Number(input.target.value), event.progress?.total ?? 1)}
              />
            </label>
          ) : (
            <button type="button" className="text-button" onClick={() => setProgress(event.id, 0, 5)}>
              加上進度
            </button>
          )}
          {event.recommendation ? (
            <p className="action-line">
              {kindLabel(event.recommendation.kind)} · {event.recommendation.action}
            </p>
          ) : null}
          <p className="fine">
            <span className={`evidence evidence-${event.evidence.level}`}>{evidenceLabel(event.evidence.level)}</span>
            {event.evidence.note ? ` ${event.evidence.note}` : null}
          </p>
        </article>
      ))}
      <form
        className="panel"
        onSubmit={(input) => {
          input.preventDefault();
          if (!title.trim()) return;
          addEvent({
            gameId,
            title,
            start: new Date().toISOString(),
            end: end ? new Date(end).toISOString() : null,
            note,
          });
          setTitle("");
          setNote("");
          setEnd("");
        }}
      >
        <h2>加上你正在打的活動</h2>
        <label>
          遊戲
          <select value={gameId} onChange={(input) => setGameId(input.target.value)}>
            {catalog.games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          名稱
          <input value={title} onChange={(input) => setTitle(input.target.value)} required />
        </label>
        <label>
          結束
          <input type="datetime-local" value={end} onChange={(input) => setEnd(input.target.value)} />
        </label>
        <label>
          免費獎勵
          <input value={note} onChange={(input) => setNote(input.target.value)} placeholder="不知道數量就只寫名稱" />
        </label>
        <button className="cta" type="submit">
          加入活動
        </button>
      </form>
    </div>
  );
}
