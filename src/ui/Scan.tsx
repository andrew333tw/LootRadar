import { useEffect, useState } from "react";
import { buildDraft, type IngestDraft, type Observation } from "../domain/ingest";
import { usePlayer } from "./player";

const PAGES = [
  { id: "mushroom", label: "蘑菇" },
  { id: "detector", label: "探測器" },
  { id: "coins", label: "金幣" },
  { id: "marbles", label: "彈珠" },
  { id: "cards", label: "卡片" },
  { id: "camp", label: "營地" },
  { id: "event", label: "活動" },
];

export function Scan() {
  const { catalog, state, applyDraft } = usePlayer();
  const [draft, setDraft] = useState<IngestDraft | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.items ?? [])].find((entry) => entry.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) loadFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function loadFile(file: File) {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setDraft(buildDraft(file.name, ""));
    setMessage("只看了檔名。畫面裡的數字不會自動讀，請填完再套用。");
  }

  function updateObservation(id: string, patch: Partial<Observation>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            observations: current.observations.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }
        : current,
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">掃描</p>
        <h1>把截圖對上狀態</h1>
        <p className="lede">V1 不讀圖。你貼上或選一張圖，核對欄位，再寫進這台裝置。</p>
      </header>
      <label className="drop">
        選擇截圖
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) loadFile(file);
          }}
        />
      </label>
      <p className="fine">也可以直接貼上截圖。</p>
      {preview ? <img className="preview" src={preview} alt="截圖預覽" /> : null}
      {draft ? (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.reviewed) {
              setMessage("先勾「我已核對」才會寫入。");
              return;
            }
            applyDraft(draft);
            setMessage("已寫進狀態。");
          }}
        >
          <label>
            這是哪款
            <select
              value={draft.gameId ?? ""}
              onChange={(event) => setDraft({ ...draft, gameId: event.target.value || null })}
            >
              <option value="">還不確定</option>
              {catalog.games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            畫面
            <select
              value={draft.page ?? ""}
              onChange={(event) => {
                const page = event.target.value || null;
                const observations =
                  draft.observations.length > 0 || !page
                    ? draft.observations
                    : [
                        {
                          id: `obs-blank-${page}`,
                          target: "progress" as const,
                          key: page,
                          value: "",
                          confidence: 0,
                          label: "這個畫面要你填",
                          source: "manual" as const,
                        },
                      ];
                setDraft({ ...draft, page, observations });
              }}
            >
              <option value="">還不確定</option>
              {PAGES.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.label}
                </option>
              ))}
            </select>
          </label>
          <p className="fine">檔名判斷信心 {Math.round(draft.classificationConfidence * 100)}%。沒有對上就是 0。</p>
          <label>
            或把畫面上的字打在這裡
            <textarea
              value={draft.note}
              placeholder={"蘑菇 1/3\n金幣 12/60\n彈珠 380"}
              onChange={(event) => {
                const note = event.target.value;
                const next = buildDraft(draft.fileName, note);
                setDraft({
                  ...next,
                  id: draft.id,
                  gameId: draft.gameId ?? next.gameId,
                  page: draft.page ?? next.page,
                  reviewed: draft.reviewed,
                });
              }}
            />
          </label>
          {draft.observations.length === 0 ? <p className="fine">還沒有可套用的欄位。</p> : null}
          {draft.observations.map((item) => (
            <label key={item.id}>
              {item.label} · 信心 {Math.round(item.confidence * 100)}% · {item.source === "text-rule" ? "文字規則" : "手動"}
              <input value={item.value} onChange={(event) => updateObservation(item.id, { value: event.target.value })} />
            </label>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={draft.reviewed}
              onChange={(event) => setDraft({ ...draft, reviewed: event.target.checked })}
            />
            我已核對，可以寫入
          </label>
          <button className="cta" type="submit">
            套用到狀態
          </button>
        </form>
      ) : null}
      {message ? <p className="banner">{message}</p> : null}
      {state.screenshots.length > 0 ? (
        <section>
          <h2>已套用的截圖</h2>
          <ul className="shot-list">
            {state.screenshots.map((shot) => (
              <li key={shot.id}>
                {shot.page ?? "未分類"} · {shot.observationCount} 欄 · {shot.createdAt.slice(0, 16).replace("T", " ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
