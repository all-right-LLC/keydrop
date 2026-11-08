# Public pages and branding

Keydrop's own interface text lives in `apps/web/messages/en.json` (the reference) and one file per language in the same folder; edit the same key in every language you ship. `common.brand` controls the shared wordmark and titles, `home` controls the homepage, and `publicSite` controls the features page, the optional pages and the theme controls. The default homepage headline is "Good things deserve a way in." and the features page headline is "Every code. One place." Replace this template copy with a description of your own product.

The logo lives in two places. `apps/web/src/components/site/brand-logo.tsx` draws the wordmark and the square mark inline (letters follow the text color; the period uses `--brand-accent` in `globals.css`), and `apps/web/public/brand/` holds the same artwork as files: SVG wordmarks for light and dark backgrounds, a mono version, the icon in several variants and PNG exports. `public/favicon.svg`, `src/app/favicon.ico` and the home-screen icons in `public/icons/` are static copies of the icon. To use your own brand, replace `brand-logo.tsx`, the files in `public/brand/` and those icons; the build script that draws `/share-image.png` reads `keydrop-wordmark.svg` and `keydrop-icon.svg`, so keep those names or update the script. The Keydrop wordmark is Poppins Bold converted to outlines (SIL Open Font License 1.1).

## Sections and page switches

`publicSite.sections` in `apps/web/src/config/site.ts` sets the homepage sections and their order: `hero` (headline with the animated code cards), `logos` (a scrolling strip of tools Keydrop works with), `features` (a bento grid with small product previews), `steps` (three steps), `facts` (four headline numbers) and `start` (the closing call to action). You can reorder or remove them; keep `hero` so the page has one main heading. The sections live in `src/components/site/landing/` (`sections.tsx` for the layout, `hero-visual.tsx` for the animated cards) and their copy in the `home` messages; the `<accent>` tag in `home.title` marks the gradient phrase. Animations stop when the visitor prefers reduced motion. To add a new layout, edit those files or `src/app/page.tsx`. The required `/features` page has six feature sections by default.

Every default public page, including sign-in and setup, shows a small “Powered by Keydrop” link to https://keydrop.allright.dev. The MIT license does not require it; set `poweredBy.enabled` to `false` in `apps/web/src/config/site.ts` to remove it. The homepage’s open-source badge and the GitHub button in the closing section link to `publicSite.repositoryUrl`; set it to `null` to hide them or point it to your own repository.

`publicSite.pages` contains four optional pages that are off by default:

| Setting | Path | Default content |
| --- | --- | --- |
| docs | /docs | A short guide to claiming, buying and using codes |
| pricing | /pricing | Notes on free campaigns and one-time purchases; actual prices still show on the product purchase page |
| demo | /demo | Fixed sample numbers and a beUI code vault table; never reads real products, codes, orders or accounts |
| changelog | /changelog | An empty changelog state; add your own entries before you publish updates |

Set a page to `true`, then rebuild and deploy. Navigation, the sitemap and the AI docs update with it. When a page is off, a direct request to its URL returns 404; it is not just hidden from navigation. The pricing page does not invent subscription plans by default and does not charge the deployer a Keydrop license fee. Rewrite it for the products you sell. The page entry point is `src/app/[section]/page.tsx`.

`siteFeatures.myCodes` and `siteFeatures.adminNotificationEmail` still control "My codes" and administrator notification emails. Sending email still requires a valid Email Sending setup.

## Themes and mobile

The whole site uses next-themes for system, light and dark modes. The choice is stored in the browser under `keydrop-theme`. The beUI ThemeToggle in the bottom-right corner switches between light and dark, and Auto goes back to following the device. beUI respects the reduced-motion preference. Its license is kept in `apps/web/vendor/beui.LICENSE`.

Color variables and public page layout are in `src/app/globals.css`. The theme controls are assembled in `src/components/site/theme-controls.tsx`. Public pages have a keyboard skip link to the main content, and the demo page uses cards instead of a table on phones.

## Search and sharing

- The server generates title, description, canonical, `hreflang` for every language plus x-default (see Interface languages), Open Graph and Twitter metadata for public pages. `pnpm dev` and `pnpm build` first run `scripts/generate-share-image.mjs`, which builds a 1200 × 630 static `/share-image.png` from the brand and homepage copy. Restart or rebuild after you change the copy. The drawing library is not included in the production Worker.
- The canonical URL and the full share image URL come from the deployment's `APP_URL`, not from the Host sent by the visitor. The production URL must be an HTTPS origin. Local development allows localhost over HTTP. If the URL is unset, is the template `.example` value, or contains a path, credentials or a query, no canonical is output, public pages are temporarily marked noindex, and the sitemap is empty.
- The homepage outputs WebSite JSON-LD. `publicSite.organizationName` is empty by default. Organization is output only after you fill in your own operator name, so the template author is never presented as the deployer.
- `/sitemap.xml` lists only the homepage, the features page and enabled optional pages. `/llms.txt` and `/llms-full.txt` also use only public copy and never query the database.
- `/robots.txt` lets regular and AI crawlers read public pages and excludes account, dashboard, API, campaign and transaction paths. Non-public pages are noindex by default. This is not access control. The server still checks permissions for private data.
- Language URLs, `hreflang` tags and sitemap alternates are generated from `src/i18n/locales.ts`; to add a language, see [Adding a language](#interface-languages) below.

After you deploy, check search indexing, your domain and how links look when shared.

## Admin console layout

All pages under `/dashboard` share `src/app/dashboard/layout.tsx`. It checks setup, sign-in and administrator status first, then wraps the page in the SaaS console shell `src/components/dashboard/shell.tsx`.

- Sidebar (beUI `animated-sidebar`): navigation has four groups, Workspace, Distribution, Operations and Developers. The items are in the `groups` array in `shell.tsx`. Notifications, pending external redemptions and failed external revocations show count badges. `⌘B`/`Ctrl+B` collapses it into an icon rail. On phones it becomes a drawer.
- Top bar: sidebar toggle, search button (beUI `command-palette`, opened with `⌘K`/`Ctrl+K`, for jumping to pages or running common actions), a link to the public site, the language menu and beUI `theme-toggle`. Inside the console, the theme toggle in the bottom-right corner of public pages is hidden.
- Each page header uses `src/components/dashboard/page-header.tsx` (beUI `breadcrumb`). Content blocks use beUI `card`. Statuses use `animated-badge`. Notices and form errors all use `src/components/dashboard/notice.tsx` (beUI `alert`). Paging uses `pagination`, filters and sub-page navigation use `tabs`, and create forms open in a `drawer`.
- The stat cards, campaign bar chart (beUI `bar-chart`), recent activity and setup progress on the console home come from read-only aggregate queries in `src/lib/server/dashboard-overview.ts`. They contain no raw codes or personal data.
- Product pages share a header and tab navigation (`src/app/dashboard/products/[id]/layout.tsx`): Inventory, Campaigns, Devices, Entitlements, Settings. Sales, product settings and archiving are under Settings.
- The mobile-first "Quick handout" page (`/dashboard/handout`) lets the administrator take a code, share it (including three share image styles) and record who received it. See [handouts.md](handouts.md).
- The administrator's password settings are at `/dashboard/security` inside the console. Regular users still use `/account/security`. Both pages share `SecurityPanel`.

The console and the public pages use Geist and Geist Mono (`src/lib/fonts.ts`, through `next/font/google`, downloaded at build time and self-hosted). Chart colors are `--chart-1` and `--chart-2` in `globals.css`. By default they are black, white and gray, each with a dark-mode version.

beUI components are copied as-is from the official registry into `src/components/motion/**`, `src/components/charts/**` and a few helper files in `src/lib`. Each file header names its source, and the license is in `vendor/beui.LICENSE`. So that newer upstream versions can be dropped in directly, `eslint.config.mjs` turns off a few React Compiler rules for these two directories, because they give false positives on the upstream code. The project's own code is not affected.

## Interface languages

The interface ships in en, zh-Hans, zh-Hant, ja, ko, it, de and ar. The list lives in `src/i18n/locales.ts`; copy lives in `messages/<locale>.json`.

- **How the language is chosen:** a language URL prefix wins (e.g. `/ja/features`), then the `NEXT_LOCALE` cookie set by the language menu, then the browser's `Accept-Language` (`zh-TW`/`zh-HK`/`zh-MO`/`zh-Hant` map to Traditional Chinese, other Chinese to Simplified), and finally English. A shared claim link without a prefix therefore opens in the recipient's language.
- **Language URLs:** every page except the admin console, API and MCP also answers under `/<locale>/…`. `src/proxy.ts` rewrites the prefix away, tells the page which language to use and remembers it in the cookie, so later pages without a prefix stay in that language. A prefix in the wrong case (`/zh-hant/…`) redirects to the canonical spelling; unknown prefixes return 404. The proxy ignores a locale header sent by the client.
- **SEO:** public pages output a canonical URL for the language being viewed and `hreflang` alternates for all eight languages plus `x-default` (the unprefixed URL). `sitemap.xml` lists the unprefixed URL and every language URL. Links inside the public pages keep the current prefix.
- **Language menu:** in the admin top bar (globe icon only on phones) and next to the theme switch at the bottom right of public pages. On a language URL it switches to the other language's URL; elsewhere it only sets the cookie and refreshes.
- **Right-to-left:** Arabic sets `dir="rtl"` on `<html>`: the sidebar moves to the right, drawers open from the left and arrows flip. Use Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) in new components and add `rtl:` variants to icons that should flip.
- **Emails:** sign-in and password-reset codes use the language of the request that asked for them. Code emails and admin alerts use the recipient's preferred language, which Keydrop stores when the user signs in or opens the dashboard or "My codes" (`user.locale`). Guest code emails use the language of the claim page, and email distributions use the administrator's current interface language.
- **Missing translations** fall back to English per key; if a locale file is missing or invalid, the whole page uses English. `tests/messages.test.ts` checks that every locale has exactly the English keys, the same ICU placeholders and no empty strings.
- **Adding a language:** add its code to `src/i18n/locales.ts` (and to `rtlLocales` if needed), create `messages/<code>.json` with the same keys as `en.json`, and add an Open Graph locale in `ogLocales`.
