import type { ClaimState, ViewOpportunity } from "../domain/types";
import { claimLabel, evidenceLabel, formatRemaining, kindLabel, valueLabel } from "./format";

const CLAIMS: ClaimState[] = ["AVAILABLE", "CLAIMED", "MISSED", "UNKNOWN"];

export function ClaimSwitch({
  value,
  onChange,
}: {
  value: ClaimState;
  onChange: (next: ClaimState) => void;
}) {
  return (
    <div className="claim-switch" role="group" aria-label="領取狀態">
      {CLAIMS.map((item) => (
        <button key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)}>
          {claimLabel(item)}
        </button>
      ))}
    </div>
  );
}

export function OpportunityCard({
  item,
  onClaim,
}: {
  item: ViewOpportunity;
  onClaim: (next: ClaimState) => void;
}) {
  return (
    <article className={item.urgent ? "card urgent" : "card"}>
      <header className="card-head">
        <h3>{item.title}</h3>
        <span className={`kind kind-${item.recommendation.kind}`}>{kindLabel(item.recommendation.kind)}</span>
      </header>
      <p className="reward">{item.rewardLabel}</p>
      {item.urgent ? <p className="miss">24 小時內會失效</p> : null}
      <dl className="meta">
        <div>
          <dt>數量</dt>
          <dd>{item.quantityLabel}</dd>
        </div>
        <div>
          <dt>狀態</dt>
          <dd>{claimLabel(item.claimState)}</dd>
        </div>
        <div>
          <dt>剩餘</dt>
          <dd>{formatRemaining(item.remainingMs)}</dd>
        </div>
        <div>
          <dt>價值</dt>
          <dd>{valueLabel(item.estimatedValue)}</dd>
        </div>
      </dl>
      {item.userProgress ? <p className="progress-line">進度 {item.userProgress}</p> : null}
      {item.missedPrevious ? <p className="miss">上一窗沒領</p> : null}
      <p className="action-line">{item.action}</p>
      {item.prerequisite ? <p className="fine">需要：{item.prerequisite}</p> : null}
      <details className="source">
        <summary>來源</summary>
        <p className="fine">
          <span className={`evidence evidence-${item.evidence.level}`}>{evidenceLabel(item.evidence.level)}</span>
          {item.freshness === "FRESH" ? " · 已核實" : item.freshness === "STALE" ? " · 過期來源" : " · 待確認"}
        </p>
        {item.evidence.note ? <p className="fine">{item.evidence.note}</p> : null}
        {item.evidence.source.startsWith("http") ? (
          <p className="fine">
            <a href={item.evidence.source}>{item.evidence.source}</a>
          </p>
        ) : (
          <p className="fine">{item.evidence.source}</p>
        )}
      </details>
      <ClaimSwitch value={item.claimState} onChange={onClaim} />
    </article>
  );
}
