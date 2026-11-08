# 公開頁面與品牌客製

Keydrop 自有的介面文字放在 `apps/web/messages/en.json`（基準版本），同一資料夾每種語言一個檔案；修改文案時請在每個要提供的語言改同一個鍵。`common.brand` 控制共用字標與標題，`home` 控制首頁，`publicSite` 控制功能介紹、選配頁面及主題操作。預設首頁標題「Good things deserve a way in.」意為「好的產品，值得有個入口」；功能頁標題「Every code. One place.」意為「所有碼，集中管理」。部署者應把範本文案改成自己產品的介紹。

標誌分兩處：`apps/web/src/components/site/brand-logo.tsx` 以內嵌 SVG 畫出字標與方形圖示（字母跟著文字色，句點用 `globals.css` 的 `--brand-accent`）；`apps/web/public/brand/` 放同一套素材的檔案，包含淺色／深色底字標、單色版、各種圖示與 PNG。`public/favicon.svg`、`src/app/favicon.ico` 和 `public/icons/` 的主畫面圖示都是圖示的靜態副本。換成自己的品牌時，替換 `brand-logo.tsx`、`public/brand/` 裡的檔案與這些圖示；產生 `/share-image.png` 的建置腳本會讀 `keydrop-wordmark.svg` 和 `keydrop-icon.svg`，請沿用檔名或一併修改腳本。Keydrop 字標由 Poppins Bold 轉外框製作（SIL Open Font License 1.1）。

## 區塊與頁面開關

`apps/web/src/config/site.ts` 的 `publicSite.sections` 決定首頁區塊與順序：`hero`（主標題與會動的票券卡片）、`logos`（可搭配工具的跑馬燈）、`features`（含小型產品示意的便當格）、`steps`（三步驟）、`facts`（四個重點數字）、`start`（底部行動入口）。可排序或移除；保留 `hero`，讓頁面只有一個主標題。區塊程式在 `src/components/site/landing/`（`sections.tsx` 是版面、`hero-visual.tsx` 是動態卡片），文案在 `home`；`home.title` 裡的 `<accent>` 標記漸層文字。訪客偏好減少動態時，動畫會停止。新增版型時修改這些檔案或 `src/app/page.tsx`。必備的 `/features` 預設有六個功能區塊。

所有預設公開頁（含登入與初始化頁）底部都有小字「Powered by Keydrop」，連到 https://keydrop.allright.dev。MIT 授權不強制顯示，在 `apps/web/src/config/site.ts` 把 `poweredBy.enabled` 設成 `false` 即可移除。首頁的開源徽章與結尾區的 GitHub 按鈕連到 `publicSite.repositoryUrl`；設成 `null` 就不顯示，也可改成自己的倉庫。

`publicSite.pages` 包含四個預設關閉的選配頁：

| 設定 | 路徑 | 預設內容 |
| --- | --- | --- |
| docs | /docs | 領取、購買及使用碼的簡短指南 |
| pricing | /pricing | 免費活動與一次性購買說明；實際價格仍在商品購買頁顯示 |
| demo | /demo | 固定範例數字與 beUI 碼庫表格；完全不讀真實商品、碼、訂單或帳號 |
| changelog | /changelog | 更新紀錄的空狀態；發布更新前自行加入內容 |

改成 `true` 後重建並部署，導覽、sitemap 與 AI 文件一起更新。關閉後直接請求該網址回傳 404，並非只隱藏導覽。定價預設不虛構訂閱方案，也不對部署者收取 Keydrop 授權費；可依自己販售的產品改寫。頁面入口在 `src/app/[section]/page.tsx`。

`siteFeatures.myCodes` 與 `siteFeatures.adminNotificationEmail` 繼續分別控制「我的碼」及管理員提醒郵件；寄信仍需要有效的 Email Sending 設定。

## 主題與手機版

全站以 next-themes 管理系統／淺色／深色，選擇保存在瀏覽器的 `keydrop-theme`。右下角 beUI ThemeToggle 切換淺深色，Auto 恢復跟隨裝置（中文意義：自動）。beUI 會尊重減少動態效果偏好；相關授權保留在 `apps/web/vendor/beui.LICENSE`。

色彩變數與公開頁面排版在 `src/app/globals.css`，主題組裝在 `src/components/site/theme-controls.tsx`。公開頁面提供鍵盤跳至主要內容連結，手機展示頁以卡片取代表格。

## 搜尋與分享

- 公開頁面由伺服器產生 title、description、canonical、各語言與 x-default 的 hreflang（見「介面語言」）、Open Graph 與 Twitter metadata。`pnpm dev`／`pnpm build` 先執行 `scripts/generate-share-image.mjs`，依品牌與首頁文案產生 1200 × 630 的 `/share-image.png` 靜態資源；修改文案後需重啟或重建。繪圖函式庫不進正式 Worker。
- canonical 與分享圖完整網址讀取部署環境 `APP_URL`，不採用訪客傳入的 Host。正式網址必須是 HTTPS origin；本機允許 localhost HTTP。未設定、範本 `.example`、帶路徑／帳密／查詢的網址不輸出 canonical，公開頁面暫標 noindex，sitemap 為空。
- 首頁輸出 WebSite JSON-LD；`publicSite.organizationName` 預設空值。填入自己的經營者名稱後才輸出 Organization，不把範本作者冒充部署者。
- `/sitemap.xml` 只列首頁、功能介紹與啟用的選配頁。`/llms.txt` 與 `/llms-full.txt` 同樣只取公開文案，不查資料庫。
- `/robots.txt` 開放一般與 AI 爬蟲讀取公開頁，排除帳號、後台、API、活動與交易路徑。非公開頁預設 noindex。這不是存取控制；私有資料仍由伺服器驗證權限。
- 語言網址、`hreflang` 標籤與 sitemap alternates 都由 `src/i18n/locales.ts` 產生；要新增語言，見下方[新增語言](#介面語言)。

搜尋收錄、網域與社群分享效果請在部署後自行確認。

## 管理後台版面

`/dashboard` 底下所有頁面共用 `src/app/dashboard/layout.tsx`：先檢查初始化、登入與管理員身分，再套上 SaaS 控制台外框 `src/components/dashboard/shell.tsx`。

- 側欄（beUI `animated-sidebar`）：導覽分成 Workspace、Distribution、Operations、Developers 四組，項目在 `shell.tsx` 的 `groups` 陣列；通知、外部兌換待確認、外部撤銷失敗會顯示數量徽章。`⌘B`／`Ctrl+B` 收合成圖示列，手機上變成抽屜。
- 頂欄：側欄切換、搜尋按鈕（beUI `command-palette`，`⌘K`／`Ctrl+K` 開啟，可跳頁或執行常用動作）、開啟公開網站、語言選單、beUI `theme-toggle`。控制台內隱藏公開頁右下角的主題切換。
- 每頁頁首用 `src/components/dashboard/page-header.tsx`（beUI `breadcrumb`），內容區塊用 beUI `card`；狀態用 `animated-badge`，提示與表單錯誤統一用 `src/components/dashboard/notice.tsx`（beUI `alert`），分頁用 `pagination`，篩選與子頁導覽用 `tabs`，建立表單放在 `drawer`。
- 首頁的統計卡、活動長條圖（beUI `bar-chart`）、最近動態與設定進度來自 `src/lib/server/dashboard-overview.ts` 的唯讀彙總查詢，不含碼原文或個資。
- 商品頁有共用頁首與分頁導覽（`src/app/dashboard/products/[id]/layout.tsx`）：Inventory、Campaigns、Devices、Entitlements、Settings。銷售與商品設定、封存移到 Settings。
- 手機優先的「Quick handout」頁（`/dashboard/handout`）讓管理員取碼、分享（含三款分享圖片）並記錄給了誰，細節見 [handouts.md](handouts.md)。
- 管理員的密碼設定在控制台內的 `/dashboard/security`；一般使用者仍使用 `/account/security`，兩頁共用 `SecurityPanel`。

控制台與公開頁面都使用 Geist／Geist Mono（`src/lib/fonts.ts`，透過 `next/font/google`，建置時下載並自行託管）。圖表顏色是 `globals.css` 的 `--chart-1`、`--chart-2`，預設為黑白灰階並各有深色版本。

beUI 元件從官方 registry 原樣複製到 `src/components/motion/**`、`src/components/charts/**` 與 `src/lib` 的幾個輔助檔，檔頭註明來源，授權見 `vendor/beui.LICENSE`。為了日後能直接用上游新版覆蓋，這兩個目錄在 `eslint.config.mjs` 關閉了幾條對上游寫法誤報的 React Compiler 規則，專案自己的程式不受影響。

## 介面語言

介面支援 en、zh-Hans、zh-Hant、ja、ko、it、de、ar，清單在 `src/i18n/locales.ts`，文案在 `messages/<語言>.json`。

- **怎麼決定語言**：網址語言前綴優先（例如 `/ja/features`），其次是語言選單寫入的 `NEXT_LOCALE` cookie，再來是瀏覽器 `Accept-Language`（`zh-TW`／`zh-HK`／`zh-MO`／`zh-Hant` 對應繁中，其他中文對應簡中），最後是英文。因此不帶前綴的領碼連結分享出去，會用收件人的語言顯示。
- **語言網址**：除了管理後台、API 和 MCP，每個頁面都能用 `/<語言>/…` 開啟。`src/proxy.ts` 會去掉前綴、告訴頁面要用哪個語言，並寫進 cookie，之後點到不帶前綴的頁面也維持同一種語言。大小寫不對（`/zh-hant/…`）會導向標準寫法；不支援的前綴回 404。用戶端自己送的語言標頭會被忽略。
- **SEO**：公開頁面輸出目前語言的 canonical，以及 8 種語言加 `x-default`（不帶前綴的網址）的 `hreflang`。`sitemap.xml` 列出不帶前綴與每種語言的網址。公開頁面裡的連結會保留目前的前綴。
- **語言選單**：在控制台頂欄（手機上只顯示地球圖示）與公開頁右下角的主題切換旁。在語言網址底下會換成另一個語言的網址，其他頁面只寫入 cookie 並重新整理。
- **由右到左**：阿拉伯文在 `<html>` 設 `dir="rtl"`：側欄移到右邊、抽屜從左邊滑出、箭頭翻轉。新元件請用 Tailwind 的邏輯方向（`ms-`／`me-`／`ps-`／`pe-`／`text-start`／`text-end`），需要翻轉的圖示加 `rtl:` 變體。
- **郵件**：登入與重設密碼的驗證碼信用發出請求時的語言。碼信與管理員提醒用收件人偏好的語言，Keydrop 會在使用者登入、開啟控制台或「我的碼」時記下（`user.locale`）。匿名碼信用領碼頁的語言；Email 分發用管理員當下的介面語言。
- **缺少翻譯**時逐鍵退回英文；語言檔不存在或格式錯誤時整頁用英文。`tests/messages.test.ts` 檢查每個語言的鍵與英文完全相同、ICU 參數一致且沒有空字串。
- **新增語言**：在 `src/i18n/locales.ts` 加代碼（由右到左的語言另加進 `rtlLocales`），新增鍵與 `en.json` 相同的 `messages/<代碼>.json`，並在 `ogLocales` 加上 Open Graph 語系。
