# LootRadar V1 驗證

日期：2026-10-04

| 檢查 | 結果 |
| --- | --- |
| lint `npx eslint src` | PASS，exit 0 |
| typecheck `tsc --noEmit` | PASS，exit 0 |
| unit `npm test` | PASS，18/18 |
| production `npm run build` | PASS，vite 6.4.3，PWA precache 12 entries |
| PWA `npm run verify:pwa` | PASS，manifest name/display/lang、192 與 512 icon、`dist/sw.js` |
| 服務工作人員 | preview 上 `sw.js` state = activated |
| 離線 | 模擬 `navigator.onLine = false` 後重新打開 `#/inventory`，已存的彈珠 381 仍在 |
| 匯出 / 清空 / 匯入 | unit：export → removeItem → import 後狀態相等 |
| 分數 / 重置邊界 | unit：午夜、週一 00:00、活動結束瞬間、已領不改成錯過 |
| 目標改變排序 | unit，以及 preview 關掉「彈珠」目標後，大樹從第 3 名掉到蘑菇後面 |
| 負向 | 壞 JSON、schema 99、含 password 鍵，都會拒絕。未核對的截圖不能套用 |
| 390×844 | 無水平溢位。scrollWidth 390。前三個動作在底欄之上（底 764，底欄頂 798） |
| 1280×800 | 側欄顯示、底欄隱藏、今日兩欄。文件無水平溢位 |
| 掃描 | 畫面寫明不讀圖。文字規則有 fixture 測試 |

Preview：`http://127.0.0.1:4173`

iPhone「加入主畫面」沒有在真機上做。本機 HTTP 不能當成手機的完整安裝證明。
