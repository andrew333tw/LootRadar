import { ACTIONABLE, formatRemaining, kindLabel } from "./format";
import { OpportunityCard } from "./bits";
import { usePlayer } from "./player";

export function Today({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { catalog, state, view, setClaimState } = usePlayer();
  const plan = view.recommendations.filter((item) => ACTIONABLE.has(item.kind));
  const top = plan.slice(0, 3);
  const percent = Math.round(view.summary.completion * 100);

  return (
    <div className="page today-layout">
      <div>
        {state.mode === "sample" ? (
          <p className="banner">範例資料。這不是你的遊戲進度。要用自己的，到「資料」改成我的資料。</p>
        ) : (
          <p className="banner personal">我的資料。存在這台裝置。</p>
        )}
        <header className="page-head">
          <p className="eyebrow">今天還能白拿 · NT$0</p>
          <h1>今天還有什麼免費的？</h1>
        </header>
        <section className="stats" aria-label="今日摘要">
          <div>
            <strong>{view.summary.highValue}</strong>
            <span>高價值</span>
          </div>
          <div>
            <strong>{view.summary.expiring}</strong>
            <span>快過期</span>
          </div>
          <div>
            <strong>{view.summary.unclaimed}</strong>
            <span>尚未領取</span>
          </div>
          <div>
            <strong>{percent}%</strong>
            <span>今日完成</span>
          </div>
        </section>
        <button className="cta" type="button" onClick={onOpenPlan}>
          我現在該做什麼？
        </button>
        <ol className="top3">
          {top.map((item, index) => (
            <li key={item.id}>
              <span className="rank">{index + 1}</span>
              <div>
                <strong>{item.action}</strong>
                <p>
                  {kindLabel(item.kind)} · {item.deadline} · {item.why}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="game-stack">
        {catalog.games.map((game) => {
          const items = view.opportunities.filter(
            (item) => item.gameId === game.id && (ACTIONABLE.has(item.recommendation.kind) || item.missedPrevious || item.claimState === "MISSED"),
          );
          return (
            <section key={game.id} className="game-block">
              <h2>{game.name}</h2>
              {items.length === 0 ? <p className="fine">今天沒有已確認的免費項目。先到掃描或白拿把狀態補上。</p> : null}
              {items.map((item) => (
                <OpportunityCard key={item.id} item={item} onClaim={(next) => setClaimState(item.id, next)} />
              ))}
              {items.some((item) => item.remainingMs != null && item.remainingMs < 6 * 3600000) ? (
                <p className="fine">有項目 {formatRemaining(Math.min(...items.map((item) => item.remainingMs ?? Number.POSITIVE_INFINITY)))} 內要決定。</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
