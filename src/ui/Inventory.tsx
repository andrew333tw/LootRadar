import { useState } from "react";
import { evidenceLabel } from "./format";
import { usePlayer } from "./player";

export function Inventory() {
  const { catalog, state, setQuantity, addResource } = usePlayer();
  const [gameId, setGameId] = useState("tata-adventure");
  const [name, setName] = useState("");
  const extras = state.inventory.filter((item) => !catalog.resources.some((resource) => resource.id === item.resourceId));

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">庫存</p>
        <h1>你手上有什麼</h1>
        <p className="lede">空白代表還沒填，不是零。</p>
      </header>
      {catalog.games.map((game) => (
        <section key={game.id} className="game-block">
          <h2>{game.name}</h2>
          {catalog.resources
            .filter((resource) => resource.gameId === game.id)
            .map((resource) => {
              const held = state.inventory.find((item) => item.resourceId === resource.id);
              return (
                <label key={resource.id} className="stock">
                  <span>
                    {resource.name}
                    <small>
                      {resource.unit} · {evidenceLabel(resource.evidence.level)}
                    </small>
                  </span>
                  <input
                    inputMode="numeric"
                    value={held?.quantity ?? ""}
                    placeholder="未填"
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      setQuantity(resource.id, raw === "" ? null : Number(raw));
                    }}
                  />
                </label>
              );
            })}
        </section>
      ))}
      {extras.length > 0 ? (
        <section className="game-block">
          <h2>自己加的</h2>
          {extras.map((item) => (
            <label key={item.resourceId} className="stock">
              <span>
                {state.flags[`name:${item.resourceId}`] ?? item.resourceId}
                <small>{catalog.games.find((game) => game.id === state.flags[`game:${item.resourceId}`])?.shortName}</small>
              </span>
              <input
                inputMode="numeric"
                value={item.quantity ?? ""}
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  setQuantity(item.resourceId, raw === "" ? null : Number(raw));
                }}
              />
            </label>
          ))}
        </section>
      ) : null}
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          addResource(gameId, name.trim());
          setName("");
        }}
      >
        <h2>新增資源種類</h2>
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
          名稱
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <button className="cta" type="submit">
          加到庫存
        </button>
      </form>
    </div>
  );
}
