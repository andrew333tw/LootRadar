import { evidenceLabel, kindLabel } from "./format";
import { usePlayer } from "./player";

export function Advisor() {
  const { catalog, state, view, toggleGoal } = usePlayer();
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">建議</p>
        <h1>我現在該做什麼</h1>
        <p className="lede">排序是固定算法，不靠聊天。目標打開之後，相關項目會往上。</p>
      </header>
      <section className="panel">
        <h2>你現在在追</h2>
        <ul className="goals">
          {catalog.goals.map((goal) => {
            const current = state.goals.find((item) => item.goalId === goal.id);
            const on = current?.enabled ?? false;
            return (
              <li key={goal.id}>
                <button type="button" aria-pressed={on} className={on ? "goal on" : "goal"} onClick={() => toggleGoal(goal.id)}>
                  {goal.name}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <ol className="advice">
        {view.recommendations.map((item) => (
          <li key={item.id} className="card">
            <header className="card-head">
              <h2>{item.action}</h2>
              <span className={`kind kind-${item.kind}`}>{kindLabel(item.kind)}</span>
            </header>
            <dl className="advice-grid">
              <div>
                <dt>原因</dt>
                <dd>{item.why}</dd>
              </div>
              <div>
                <dt>獎勵</dt>
                <dd>{item.reward}</dd>
              </div>
              <div>
                <dt>成本</dt>
                <dd>{item.cost === "0" ? "0，不花錢" : item.cost}</dd>
              </div>
              <div>
                <dt>期限</dt>
                <dd>{item.deadline}</dd>
              </div>
              <div>
                <dt>信心</dt>
                <dd>
                  {evidenceLabel(item.evidenceLevel)} · {Math.round(item.confidence * 100)}%
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </div>
  );
}
