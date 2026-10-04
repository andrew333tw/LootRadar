import { verifiedTop3 } from "../domain/engine";
import { kindLabel } from "./format";
import { OpportunityCard } from "./bits";
import { usePlayer } from "./player";

function when(iso: string | null): string {
  if (!iso) return "時間未寫";
  return new Date(iso).toLocaleString("zh-Hant-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Today({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { catalog, state, view, setClaimState } = usePlayer();
  const top = verifiedTop3(view);
  const verified = view.opportunities.filter((item) => item.lane === "verified" && item.radarState === "AVAILABLE");
  const claimed = view.opportunities.filter((item) => item.lane === "verified" && item.radarState === "CLAIMED");
  const expiring = verified.filter((item) => item.urgent);
  const upcoming = view.opportunities.filter((item) => item.lane === "verified" && item.radarState === "UPCOMING");
  const pending = view.opportunities.filter((item) => item.lane === "needs-verify");
  const samples = view.opportunities.filter((item) => item.lane === "sample");
  const open = view.summary.verifiedOpen;
  const done = view.summary.verifiedClaimed;

  return (
    <div className="page today-layout">
      <div>
        {state.mode === "sample" ? (
          <p className="banner">這是範例推演，不是你的今天。下面「今天確定可拿」只放官方已核實的項目。</p>
        ) : (
          <p className="banner personal">我的資料只存在這台裝置。還沒核對過的東西不會算進今天。</p>
        )}
        <header className="page-head">
          <p className="eyebrow">不花錢 · 今天</p>
          <h1>今天還有什麼免費的？</h1>
        </header>
        <section className="stats" aria-label="今日狀態">
          <div>
            <strong>{open}</strong>
            <span>還沒拿</span>
          </div>
          <div>
            <strong>
              {done}/{open + done}
            </strong>
            <span>已拿 / 今天可拿</span>
          </div>
          <div>
            <strong>{expiring.length}</strong>
            <span>24 小時內會失效</span>
          </div>
          <div>
            <strong>{pending.length}</strong>
            <span>只是待確認</span>
          </div>
        </section>
        <h2 className="block-title">現在最值得做</h2>
        {top.length === 0 ? <p className="fine">今天沒有已核實、還沒做的免費項目。</p> : null}
        <ol className="top3">
          {top.map((item, index) => {
            const source = verified.find((entry) => entry.id === item.opportunityId);
            return (
              <li key={item.id} className={source?.urgent ? "urgent" : undefined}>
                <span className="rank">{index + 1}</span>
                <div>
                  <strong>{item.action}</strong>
                  <p>
                    {catalog.games.find((game) => game.id === item.gameId)?.shortName} · {kindLabel(item.kind)} · {item.deadline}
                    {source?.urgent ? " · 今天會失效" : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <button className="text-button" type="button" onClick={onOpenPlan}>
          調整目標與完整排序
        </button>
      </div>
      <div className="game-stack">
        {catalog.games.map((game) => {
          const items = verified.filter((item) => item.gameId === game.id);
          const taken = claimed.filter((item) => item.gameId === game.id);
          return (
            <section key={game.id} className="game-block">
              <h2>{game.name}</h2>
              {items.length === 0 ? <p className="fine">今天沒有已核實的免費項目。</p> : null}
              {items.map((item) => (
                <OpportunityCard key={item.id} item={item} onClaim={(next) => setClaimState(item.id, next)} />
              ))}
              {taken.length > 0 ? <p className="fine">今天已拿：{taken.map((item) => item.title).join("、")}</p> : null}
            </section>
          );
        })}
        {upcoming.length > 0 ? (
          <section className="game-block">
            <h2>即將開始</h2>
            <ul className="plain">
              {upcoming.map((item) => (
                <li key={item.id}>
                  {item.title} · {when(item.opensAt)} 開始
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <details className="fold">
          <summary>待確認 · {pending.length}</summary>
          <p className="fine">這些有欄位，但數量、重置或今天有沒有開還沒核實。不會進前三。</p>
          {pending.map((item) => (
            <OpportunityCard key={item.id} item={item} onClaim={(next) => setClaimState(item.id, next)} />
          ))}
        </details>
        {samples.length > 0 ? (
          <details className="fold">
            <summary>範例推演 · 不是你的今天</summary>
            {samples.map((item) => (
              <OpportunityCard key={item.id} item={item} onClaim={(next) => setClaimState(item.id, next)} />
            ))}
          </details>
        ) : null}
      </div>
    </div>
  );
}
