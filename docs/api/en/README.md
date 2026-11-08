# Keydrop

Keydrop is an open-source, self-hosted app for indie developers. It manages and distributes redemption codes, discount codes and license keys from your own Cloudflare account. Project website: [keydrop.allright.dev](https://keydrop.allright.dev).

## Status

Keydrop implements sign-in and setup, an encrypted code vault, campaign claims, direct assignment, entitlement redemption, online activation, Stripe payments and discount sync, plus an API/MCP server, webhooks and an email queue. The source code is public on [GitHub](https://github.com/all-right-LLC/keydrop) under the MIT license. Test the flows you rely on in your own environment before using it for real sales.

## Stack

Next.js, OpenNext, Cloudflare Workers and D1, Better Auth, next-intl, beUI (https://beui.dev), Stripe (optional).

## Local development

Follow the [Web README](../../../apps/web/README.md) to install dependencies, generate local settings outside the project, apply migrations and start the dev server.
The D1 configuration uses a local placeholder ID. The Deploy to Cloudflare button creates the database for you; for a manual deployment, create your own database and put its ID in wrangler.jsonc.
Run `pnpm run cf-typegen` again after you change the Wrangler configuration.

## Documentation

Setup and operations

- [Local development and configuration](development.md): requirements, environment variables, optional email, tests and built-in endpoints.
- [Deployment and backups](deployment.md): Deploy to Cloudflare, secrets, migrations, D1 backups, restore drills and scheduled jobs.
- [Passwords and account recovery](passwords.md): setting, changing and resetting passwords.
- [Public pages, branding and themes](customization.md): homepage copy, optional pages, SEO, themes, the admin console layout and interface languages.
- [Third-party components](third-party.md): bundled beUI components, SheetJS and their licenses.

Distribution

- [Campaign conditions](conditions.md): the JSON condition tree for claim campaigns.
- [External eligibility](eligibility.md): HTTP endpoints and code hooks that decide campaign eligibility.
- [Direct assignment by the administrator](assignments.md): assigning a code to an existing account from the dashboard, API or MCP.
- [Quick handout](handouts.md): taking codes on a phone, sharing them as images and logging who received them.
- [Email delivery](email.md): optional email sending, code emails and guest email binding.

Payments

- [Stripe checkout](stripe.md): Checkout, Stripe webhooks, orders, inventory policies and refunds.
- [Stripe discount sync](stripe-discounts.md): syncing Stripe coupons and promotion codes with Keydrop.

Entitlements and licenses

- [Built-in entitlements and credit ledger](entitlements.md): memberships, lifetime licenses and credits, and the admin queries for them.
- [External entitlements](external-rewards.md): the protocol for granting and revoking entitlements in your own product.
- [Online license activation](licenses.md): activating, validating and releasing devices for license keys.

Integrations

- [API tokens and product integration](authentication.md): scoped API tokens and the `/api/v1/operations` endpoint.
- [Event webhooks](webhooks.md): event types, signatures, delivery and endpoint management.
- [MCP integration](mcp.md): the MCP server, its tools and write permissions.
