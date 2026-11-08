# 第三方组件

beUI 组件来源：https://github.com/starc007/ui-components ，通过 https://beui.dev/r/ 的 button-base 与 input registry 引入。

文件：src/components/motion/button/base.tsx、src/components/motion/input.tsx、src/lib/ease.ts、src/lib/hooks/use-hover-capable.ts、src/lib/utils.ts。

原始许可证保留在 `apps/web/vendor/beui.LICENSE`。本文列出的组件路径均相对于 `apps/web/`，上游文件保留原始注释。

另引入 beUI select、table registry 及其完整的辅助文件：`src/components/motion/select.tsx`、`src/components/motion/table/`、`src/components/motion/checkbox.tsx`、`src/lib/hooks/`、`src/lib/touch.ts`。同样适用上述 beUI 许可证。

全站主题切换另使用 beUI `theme-toggle` 与 `action-swap` registry 组件，包括 `src/components/motion/theme-toggle.tsx` 与 `src/components/motion/action-swap.tsx`，沿用相同的许可证。

Excel 解析使用 SheetJS CE 0.20.3，从官方 CDN https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz 安装，许可证随软件包保留。

2026-11-08 管理后台另外加入以下 beUI registry 组件及其辅助文件，许可证相同：`animated-sidebar`（含 `shared-layout-bg`）、`card`、`breadcrumb`（含 `popover-morph`）、`tabs`、`animated-badge`、`alert`、`pagination`、`switch`、`tooltip`、`animated-number`、`number-ticker`、`sparkline`、`bar-chart`（在 `src/components/charts/`）、`command-palette`、`loader`、`animated-toast-stack`、`drawer`、`button-stateful`。工具提示与图表依赖 `@floating-ui/dom`（MIT）。测试中的 ICU 文案检查使用 `@formatjs/icu-messageformat-parser`（MIT）。

字体：控制台与公开页面使用 [Geist 与 Geist Mono](https://vercel.com/font)（SIL Open Font License 1.1），通过 `next/font/google` 在构建时下载并自行托管。Keydrop 字标与图标由 Poppins Bold 转成轮廓绘制（SIL Open Font License 1.1），不附带字体文件。
