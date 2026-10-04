# 資料模型

Schema version: `1`

## 目錄

`data/games/<game-id>/` 裡的 JSON 是規則，不是玩家狀態。

- `game.json`
- `resources.json`
- `goals.json`
- `events.json`
- `opportunities.json`
- `codes.json`（有兌換碼的遊戲）

`Opportunity` 重要欄位：`gameId`、`title`、`category`、`reward`、`estimatedValue`、`marginalValue`、`estimatedEffort`、`cost`、`reset`、`evidence`、`freshness`、`verifiedAt`、`policy`、`laterValue`、`goalTags`、`action`、`why`。

`freshness` 是 `FRESH`、`STALE` 或 `UNVERIFIED`。只有 `evidence.level = OFFICIAL`、`freshness = FRESH`、而且 `cost = 0` 會進「今天確定可拿」。過期、即將開始、待確認和範例都不會進前三。

`reward.quantity = null` 代表數量沒有驗證，畫面顯示「數量未驗證」，不可以補 0。`approximate: true` 代表只是約略。

`sample: true` 的活動與機會只在範例模式出現，而且首頁會標成範例推演。第一次沒有本機資料時，預設是「我的資料」，不是範例。兌換碼沒有到期日就標 `STALE`，不當現役碼。

## 玩家狀態

存在本機，匯出信封：

```json
{
  "schemaVersion": 1,
  "app": "LootRadar",
  "exportedAt": "ISO-8601",
  "state": {}
}
```

`state.mode` 是 `sample` 或 `personal`。

另外保存：目標、庫存、領取窗、活動進度、兌換碼狀態、截圖中繼資料、建議歷史、自訂活動、自訂兌換碼、flags。

領取狀態：`AVAILABLE` `CLAIMED` `MISSED` `UNKNOWN`。

重置窗 id：

- 每日 `daily:YYYY-MM-DD@HH:mm`
- 每週 `weekly:YYYY-MM-DD@HH:mm`（日期是該週起始日）
- 活動 `event:<id>:<start>:<end>`

窗結束的那一瞬不算還在窗內。過期但沒有舊紀錄，狀態是 `UNKNOWN`，不假裝錯過。同一窗裡標過可領、時間過了，才變成 `MISSED`。已領的不會因為到期改成錯過。

鍵名若像 password、token、secret，匯入會拒絕。

## 時區

預設 `Asia/Taipei`。Pikmin 官方寫午夜重置，這裡用玩家時區的午夜，不是寫死某一台伺服器。
