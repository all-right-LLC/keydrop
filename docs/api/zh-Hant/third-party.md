# 第三方元件

beUI 元件來源：https://github.com/starc007/ui-components ，透過 https://beui.dev/r/ 的 button-base 與 input registry 引入。

檔案：src/components/motion/button/base.tsx、src/components/motion/input.tsx、src/lib/ease.ts、src/lib/hooks/use-hover-capable.ts、src/lib/utils.ts。

原始授權保留於 `apps/web/vendor/beui.LICENSE`。本文列出的元件路徑皆相對於 `apps/web/`，上游檔案保留原始註解。

另引入 beUI select、table registry 及其完整輔助檔案：`src/components/motion/select.tsx`、`src/components/motion/table/`、`src/components/motion/checkbox.tsx`、`src/lib/hooks/`、`src/lib/touch.ts`。同樣適用上述 beUI 授權。

全站主題切換另使用 beUI `theme-toggle` 與 `action-swap` registry 元件，包含 `src/components/motion/theme-toggle.tsx` 與 `src/components/motion/action-swap.tsx`，沿用相同授權。

Excel 解析使用 SheetJS CE 0.20.3，從官方 CDN https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz 安裝，授權隨套件保留。

2026-11-08 管理後台另外加入以下 beUI registry 元件及其輔助檔，授權相同：`animated-sidebar`（含 `shared-layout-bg`）、`card`、`breadcrumb`（含 `popover-morph`）、`tabs`、`animated-badge`、`alert`、`pagination`、`switch`、`tooltip`、`animated-number`、`number-ticker`、`sparkline`、`bar-chart`（在 `src/components/charts/`）、`command-palette`、`loader`、`animated-toast-stack`、`drawer`、`button-stateful`。工具提示與圖表依賴 `@floating-ui/dom`（MIT）。測試裡的 ICU 文案檢查使用 `@formatjs/icu-messageformat-parser`（MIT）。

字型：控制台與公開頁面使用 [Geist 與 Geist Mono](https://vercel.com/font)（SIL Open Font License 1.1），透過 `next/font/google` 在建置時下載並自行託管。Keydrop 字標與圖示以 Poppins Bold 轉成外框繪製（SIL Open Font License 1.1），不隨附字型檔。
