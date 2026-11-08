# Third-party components

beUI component source: https://github.com/starc007/ui-components , added through the button-base and input registry entries at https://beui.dev/r/ (2026-11-07).

Files: src/components/motion/button/base.tsx, src/components/motion/input.tsx, src/lib/ease.ts, src/lib/hooks/use-hover-capable.ts, src/lib/utils.ts.

The original license is kept in `apps/web/vendor/beui.LICENSE`. All component paths in this document are relative to `apps/web/`. Upstream files keep their original comments.

On 2026-11-07, the beUI select and table registry entries were also added with all their helper files: `src/components/motion/select.tsx`, `src/components/motion/table/`, `src/components/motion/checkbox.tsx`, `src/lib/hooks/`, `src/lib/touch.ts`. The same beUI license applies.

Site-wide theme switching also uses the beUI `theme-toggle` and `action-swap` registry components, including `src/components/motion/theme-toggle.tsx` and `src/components/motion/action-swap.tsx`, under the same license.

Excel parsing uses SheetJS CE 0.20.3, installed from the official CDN https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz. Its license is kept with the package.

On 2026-11-08 the admin console added these beUI registry components with their helper files, under the same license: `animated-sidebar` (with `shared-layout-bg`), `card`, `breadcrumb` (with `popover-morph`), `tabs`, `animated-badge`, `alert`, `pagination`, `switch`, `tooltip`, `animated-number`, `number-ticker`, `sparkline`, `bar-chart` (in `src/components/charts/`), `command-palette`, `loader`, `animated-toast-stack`, `drawer` and `button-stateful`. Tooltips and charts depend on `@floating-ui/dom` (MIT). ICU message checks in tests use `@formatjs/icu-messageformat-parser` (MIT).

Fonts: the console and public pages use [Geist and Geist Mono](https://vercel.com/font) (SIL Open Font License 1.1), loaded through `next/font/google` and self-hosted at build time. The Keydrop wordmark and icon are drawn from Poppins Bold converted to outlines (SIL Open Font License 1.1); no font file is shipped for them.
