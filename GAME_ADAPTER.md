# 遊戲轉接

核心不認識 Pikmin 或塔塔的畫面。它只吃 `GameBundle`：

`game`、`resources`、`goals`、`events`、`opportunities`、`codes`

`src/domain/catalog.ts` 把 `data/games/*` 合併成一份目錄。`mergeCatalog` 可以再加一款，不必改分數、重置或建議函式。測試 `accepts a third game` 用一款 `demo-quest` 證明這件事。

第三款遊戲的做法：

1. 新增 `data/games/<id>/` 同一組 JSON。
2. 在 `catalog.ts` 匯入並 `mergeCatalog`。
3. 不確定的數量留 `null`，證據等級不要填 `OFFICIAL`，除非來源是官方文件。
4. 畫面會跟著目錄長出遊戲名、庫存與目標。今日卡片與建議不用為新遊戲改版。

重置與建議在 `src/domain/reset.ts`、`score.ts`、`recommend.ts`、`engine.ts`。UI 只讀 `materialize()` 的結果。
