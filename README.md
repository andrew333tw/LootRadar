# LootRadar

今天還有什麼免費的？

LootRadar 是給 Andrew 自己用的免費資源決策工具。它看的是你現在不付錢，還有哪些東西可以拿、哪些快過期、哪些該現在領、晚點領、留著或花掉。

第一版支援：

- Pikmin Bloom
- 塔塔冒險隊（Clash of Critters）

這是本機優先的可安裝 PWA。不需要遊戲帳號，也不會連上遊戲。

## 開啟

在 repo 根目錄執行：

```powershell
npm install
npm run build
npm run preview
```

瀏覽器開 [http://127.0.0.1:4173](http://127.0.0.1:4173)。

開發時用 `npm run dev`。

第一次打開是空白的**我的資料**，存在這台瀏覽器，不會把範例活動當成今天。右上角「資料 → 重設範例」才會進入標明的範例推演。

## 安裝

Windows / Chrome：用上面的 preview 網址，位址列的安裝圖示，或選單裡的「安裝 LootRadar」。`localhost` 算安全來源，可以裝。

iPhone Safari：分享 → 加入主畫面。服務工作人員與獨立視窗需要 HTTPS。這台電腦的 `http://127.0.0.1` 不能直接給手機裝成完整 PWA；手機要裝，得先放到你自己的 HTTPS。V1 沒有部署到未知主機。

## 資料

- 狀態在瀏覽器 `localStorage`，鍵名 `lootradar.player.v1`。
- 「資料」可以匯出 / 匯入 JSON。
- 規則在 `data/games/`，改檔再重建就會更新，不會把不確定的數字寫成官方。

## 文件

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md)
- [DATA_MODEL.md](DATA_MODEL.md)
- [GAME_ADAPTER.md](GAME_ADAPTER.md)
- [CURRENT_RULES.md](CURRENT_RULES.md)
- [TEST_RECEIPT.md](TEST_RECEIPT.md)
