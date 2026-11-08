<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/brand/keydrop-wordmark-dark.svg">
    <img src="apps/web/public/brand/keydrop-wordmark.svg" alt="Keydrop" width="320">
  </picture>
</p>

<p align="center"><b>English</b> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.zh-Hans.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ar.md">العربية</a></p>

**Self-hosted code distribution for indie developers.** Manage and hand out redemption codes, discount codes, license keys and App Store promo codes from your own Cloudflare account — free claim campaigns, Stripe checkout, entitlements, an API, webhooks and an MCP server, all in one small Next.js app.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fall-right-LLC%2Fkeydrop%2Ftree%2Fmain%2Fapps%2Fweb)

[![CI](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml/badge.svg)](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

> **Status:** pre-1.0. The core flows run end to end on Cloudflare, but expect breaking changes before 1.0. Test it in your own environment before relying on it for real sales.

## Why Keydrop

You built an app and now you have a spreadsheet of promo codes, a few hundred license keys and a Stripe account. Keydrop gives those codes a home:

- **One inventory for every kind of code** — generate codes, import them from CSV/Excel (App Store offer codes, partner keys, Stripe promotion codes) and keep them encrypted at rest.
- **Hand them out however you need** — public or private claim pages with eligibility rules, paid checkout via Stripe, direct assignment, email distribution, or a phone-friendly *Quick handout* page for giving a code to someone in a chat.
- **Know who has what** — every claim, order, handout and redemption is recorded; revoke codes, reclaim entitlements and handle refunds without losing history.
- **Wire it into your product** — scoped API tokens, a REST API, signed webhooks and an MCP server so your backend or AI agents can issue and check codes.
- **Yours to run** — MIT licensed, single administrator, deploys to your own Cloudflare Workers + D1. No hosted service, no per-code fees.

## Features

**Codes & inventory**
- Four code kinds: redemption, discount, license (online activation with per-device limits) and external-platform codes
- Generate, import (.xlsx / CSV with column mapping and preview) and sync Stripe promotion codes
- AES-GCM encryption at rest, exact-match search, export, revoke / restore, expiry and per-code usage limits
- Unique or shared codes, with shared-claim limits across campaigns and sales

**Distribution**
- Claim campaigns: public or private links, anonymous / verified-email / account-only, per-person and total limits, nested AND/OR eligibility rules (time windows, passphrases, invitations, purchase history, your own HTTP check)
- Stripe Checkout: one code per purchase, discounts, refunds that can revoke the code, and three out-of-stock strategies (refund, manual fulfilment, auto-fulfil after restock)
- Direct assignment and email distribution to people who don't have an account yet
- **Quick handout** — a mobile-first page to take a code, share it (including three shareable image cards drawn on-device) and note who got it; installable to the home screen

**Rewards & entitlements**
- Built-in memberships (time-limited or permanent) and credit ledgers with idempotent spend / refund APIs
- Stack, replace or reject repeated rewards; reclaim unused entitlements when a code is revoked
- External rewards delivered to your own service, with manual review when the result is unknown

**Integrations**
- REST API and an MCP server with fine-grained, product-scoped tokens (MCP is read-only by default)
- Signed outgoing webhooks with retries
- Optional Cloudflare Email Sending for one-time-code sign-in, code emails and admin alerts

**Admin console**
- SaaS-style dashboard with activity charts, ⌘K command palette, light / dark themes and a mobile layout, built with [beUI](https://beui.dev) components
- Interface in English, 简体中文, 繁體中文, 日本語, 한국어, Italiano, Deutsch and العربية (right-to-left supported); the language follows the visitor's browser and can be switched at any time

## Tech stack

[Next.js](https://nextjs.org) (App Router) on [Cloudflare Workers](https://workers.cloudflare.com) via [OpenNext](https://opennext.js.org/cloudflare) · [Cloudflare D1](https://developers.cloudflare.com/d1/) · [Better Auth](https://better-auth.com) · [Stripe](https://stripe.com) (optional) · [next-intl](https://next-intl.dev) · [beUI](https://beui.dev) + Tailwind CSS

## Quick start

### Deploy to Cloudflare

1. Click **Deploy to Cloudflare** above. Cloudflare copies the `apps/web` folder into a new repository in your GitHub account and creates a Worker and a D1 database.
2. Fill in the settings it asks for:

   | Name | What to enter |
   |---|---|
   | `APP_URL` | The site's HTTPS origin, e.g. `https://keydrop.your-subdomain.workers.dev` (no trailing slash) |
   | `ADMIN_EMAIL` | The email address of the single administrator |
   | `BETTER_AUTH_SECRET` | A random secret, e.g. `openssl rand -hex 32` |
   | `SETUP_SECRET` | Another random secret, used once on the setup page |
   | `CODE_ENCRYPTION_KEY` | 64 hex characters, e.g. `openssl rand -hex 32` — **back this up; losing it makes existing codes unreadable** |

   Use a different value for each secret. Leave the build command empty and set the deploy command to `pnpm run deploy`.
3. Open `APP_URL/setup`, enter `SETUP_SECRET` and choose the administrator password. Then sign in and create your first product.

The free core (codes, campaigns, claims) needs nothing else. Add Stripe and Email Sending later if you want them.

### Run locally

Requires Node.js 24+ and pnpm.

```sh
cd apps/web
pnpm install --frozen-lockfile
node scripts/create-local-env.mjs "$HOME/.config/keydrop/local.env" you@example.com
pnpm run db:migrate
KEYDROP_DEV_ENV_FILE="$HOME/.config/keydrop/local.env" pnpm dev
```

Open <http://localhost:3000/setup> and use the `SETUP_SECRET` from the generated file (kept outside the repository, never printed to the terminal).

### Deploy manually

```sh
cd apps/web
pnpm exec wrangler login
pnpm exec wrangler d1 create keydrop   # put the database ID into wrangler.jsonc
# set your Worker name, APP_URL and ADMIN_EMAIL in wrangler.jsonc, then:
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put SETUP_SECRET
pnpm exec wrangler secret put CODE_ENCRYPTION_KEY
pnpm run deploy                        # builds, applies D1 migrations, deploys
```

## Configuration

| Setting | Type | Required | Purpose |
|---|---|---|---|
| `APP_URL`, `ADMIN_EMAIL` | var | yes | Public origin and administrator email |
| `BETTER_AUTH_SECRET`, `SETUP_SECRET`, `CODE_ENCRYPTION_KEY` | secret | yes | Sessions and identity hashing, one-time setup, code encryption |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret | for sales | Stripe Checkout and the webhook at `/api/stripe/webhook` |
| `EMAIL` binding + `EMAIL_FROM` | binding / var | for email | Cloudflare Email Sending: OTP sign-in, code emails, admin alerts |
| `WEBHOOK_SECRETS` | secret | for webhooks | Signing secrets for outgoing webhooks |
| `ELIGIBILITY_SECRETS`, `EXTERNAL_REWARD_SECRETS` | secret | optional | Signing secrets for your own eligibility checks and external reward receivers |

A cron trigger runs every five minutes to expire reservations, fulfil back-orders, send queued email and deliver webhooks. Run `pnpm run cf-typegen` after editing `wrangler.jsonc`.

Feature switches (public pages, "My codes", admin alert emails) live in `apps/web/src/config/site.ts`; branding and all copy live in `apps/web/messages/<locale>.json`.

## Make it your own

Everything a typical deployment changes lives in a handful of files. Keeping your edits there makes it easier to pull in upstream updates later.

| What you want to change | Where (inside `apps/web/`) |
|---|---|
| Brand name, homepage and page copy, email text | `messages/<locale>.json`: `common.brand`, `home`, `publicSite`, `email` (edit the same key in every language you ship) |
| Homepage sections and their order, optional public pages, "My codes" and admin alert switches | `src/config/site.ts` |
| “Powered by Keydrop” footer link and GitHub links (optional under MIT; you may turn them off) | `src/config/site.ts`: `poweredBy.enabled`, `publicSite.repositoryUrl` |
| Homepage layout and visuals | `src/components/site/landing/sections.tsx`, `src/components/site/landing/hero-visual.tsx`, `src/app/page.tsx` |
| Features page and optional pages (docs, pricing, demo, changelog) | `src/app/features/page.tsx`, `src/app/[section]/page.tsx` |
| Logo, favicon and app icons | `src/components/site/brand-logo.tsx`, `public/brand/`, `public/favicon.svg`, `src/app/favicon.ico`, `public/icons/`, `public/handout.webmanifest` |
| Colors and light / dark theme | `src/app/globals.css` (the `:root` tokens and `--brand-accent`) |
| Social share image | Generated on every build from the wordmark and the `home` copy by `scripts/generate-share-image.mjs` |
| Interface languages | `src/i18n/locales.ts` plus one file per language in `messages/` |
| Worker name, public URL, cron schedule, bindings | `wrangler.jsonc` (run `pnpm run cf-typegen` afterwards) |

Products, prices, campaigns, eligibility rules, email delivery and API tokens are managed in the dashboard, not in code.

Change these only when you know why: `migrations/` (add new files, never edit existing ones), `src/lib/server/` (authentication, encryption, payments and inventory rules) and `src/components/motion/` (beUI components; update them from upstream instead).

## Documentation

Full guides live in [`docs/api`](docs/api/README.md) in **English**, [繁體中文](docs/api/zh-Hant/README.md) and [简体中文](docs/api/zh-Hans/README.md):

- [Deployment, backup & restore](docs/api/en/deployment.md) · [Local development](docs/api/en/development.md) · [Customization & admin console](docs/api/en/customization.md)
- [Authentication & API tokens](docs/api/en/authentication.md) · [MCP](docs/api/en/mcp.md) · [Webhooks](docs/api/en/webhooks.md)
- [Campaign conditions](docs/api/en/conditions.md) · [Eligibility hooks](docs/api/en/eligibility.md) · [Entitlements & credits](docs/api/en/entitlements.md) · [Licenses](docs/api/en/licenses.md)
- [Stripe](docs/api/en/stripe.md) · [Stripe discounts](docs/api/en/stripe-discounts.md) · [Email](docs/api/en/email.md) · [Quick handout](docs/api/en/handouts.md)

## Translations

The interface ships in eight languages. Public pages also have language URLs such as `/ja/features` with matching `hreflang` tags and sitemap entries, and emails go out in each recipient's language. Each locale is a JSON file in [`apps/web/messages`](apps/web/messages) with exactly the same keys as `en.json`; a test checks that every translation has the same keys and the same ICU placeholders. To add a language, add its code to [`src/i18n/locales.ts`](apps/web/src/i18n/locales.ts) and create the matching JSON file. Corrections from native speakers are very welcome.

## Development

```sh
cd apps/web
pnpm run lint
pnpm run typecheck
pnpm test                # unit and integration tests against real SQLite + migrations
pnpm run build:worker    # production Worker build
```

CI runs the same checks on Node.js 24 and 26, plus a fresh local D1 setup that claims codes end to end. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

[MIT](LICENSE) © all right LLC. Bundled [beUI](https://beui.dev) components keep their upstream MIT license ([`apps/web/vendor/beui.LICENSE`](apps/web/vendor/beui.LICENSE)).

## Acknowledgements

Keydrop stands on the shoulders of these projects. Thank you to everyone who builds and maintains them:

- [Next.js](https://nextjs.org) and [React](https://react.dev): the app framework
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare), [Cloudflare Workers, D1](https://developers.cloudflare.com/) and [Wrangler](https://developers.cloudflare.com/workers/wrangler/): hosting, database and deployment
- [Better Auth](https://better-auth.com): sign-in, sessions and email one-time codes
- [Stripe](https://github.com/stripe/stripe-node): payments
- [next-intl](https://next-intl.dev) and [FormatJS](https://formatjs.github.io): translations and message checks
- [beUI](https://beui.dev), [Tailwind CSS](https://tailwindcss.com), [Motion](https://motion.dev), [Lucide](https://lucide.dev), [Floating UI](https://floating-ui.com), [TanStack Virtual](https://tanstack.com/virtual), [next-themes](https://github.com/pacocoursey/next-themes), [clsx](https://github.com/lukeed/clsx) and [tailwind-merge](https://github.com/dcastil/tailwind-merge): the interface
- [Zod](https://zod.dev): input validation
- [Kysely](https://kysely.dev) and [kysely-d1](https://github.com/aidenwallis/kysely-d1): database access for Better Auth
- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk): the MCP server
- [SheetJS](https://sheetjs.com): Excel import
- [Geist](https://vercel.com/font) and [Poppins](https://fonts.google.com/specimen/Poppins): typefaces for the interface and the logo
- [Vitest](https://vitest.dev), [TypeScript](https://www.typescriptlang.org) and [ESLint](https://eslint.org): testing and tooling
