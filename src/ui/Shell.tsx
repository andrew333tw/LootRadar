import { useEffect, useState } from "react";
import { Advisor } from "./Advisor";
import { Events } from "./Events";
import { Freebies } from "./Freebies";
import { Inventory } from "./Inventory";
import { Today } from "./Today";
import { Scan } from "./Scan";
import { usePlayer } from "./player";

const TABS = [
  { id: "today", label: "今天" },
  { id: "scan", label: "掃描" },
  { id: "freebies", label: "白拿" },
  { id: "events", label: "活動" },
  { id: "inventory", label: "庫存" },
  { id: "advisor", label: "建議" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function currentTab(): TabId {
  const raw = window.location.hash.replace("#/", "");
  return TABS.some((tab) => tab.id === raw) ? (raw as TabId) : "today";
}

export function Shell() {
  const { state, exportJson, importJson, resetSample, startPersonal, setTheme } = usePlayer();
  const [tab, setTab] = useState<TabId>(currentTab);
  const [notice, setNotice] = useState<string | null>(null);
  const theme = state.flags.theme === "light" || state.flags.theme === "dark" ? state.flags.theme : "system";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onHash = () => setTab(currentTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function open(next: TabId) {
    window.location.hash = `/${next}`;
    setTab(next);
  }

  function download() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lootradar.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("已匯出 JSON。");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <strong>LootRadar</strong>
            <p>今天還有什麼免費的？</p>
          </div>
        </div>
        <nav>
          {TABS.map((item) => (
            <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => open(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="brand compact">
            <span className="mark" aria-hidden="true" />
            <strong>LootRadar</strong>
          </div>
          <details className="data-menu">
            <summary>資料</summary>
            <div>
              <button type="button" onClick={download}>
                匯出 JSON
              </button>
              <label>
                匯入 JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      importJson(await file.text());
                      setNotice("已匯入。");
                    } catch (error) {
                      setNotice(error instanceof Error ? error.message : "匯入失敗");
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("重設成範例資料？你現在改過的狀態會被換掉。")) resetSample();
                }}
              >
                重設範例
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("改用空白的個人資料？範例進度不會再混在一起。")) startPersonal();
                }}
              >
                改用我的資料
              </button>
              <button
                type="button"
                onClick={() => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system")}
              >
                外觀：{theme === "system" ? "跟系統" : theme === "light" ? "淺色" : "深色"}
              </button>
            </div>
          </details>
        </header>
        {notice ? <p className="banner">{notice}</p> : null}
        <main>
          {tab === "today" ? <Today onOpenPlan={() => open("advisor")} /> : null}
          {tab === "scan" ? <Scan /> : null}
          {tab === "freebies" ? <Freebies /> : null}
          {tab === "events" ? <Events /> : null}
          {tab === "inventory" ? <Inventory /> : null}
          {tab === "advisor" ? <Advisor /> : null}
        </main>
      </div>
      <nav className="tabbar" aria-label="主要">
        {TABS.map((item) => (
          <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => open(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
