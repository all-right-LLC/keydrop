# Local development

The local development environment supports the code vault, campaigns, entitlements, orders and integrations. The full first version and production service verification are still in progress. See the [Web README](../../../apps/web/README.md) for the main entry point.

You need Node.js 24 and pnpm. Run from `apps/web`:

```sh
pnpm install --frozen-lockfile
node scripts/create-local-env.mjs "$HOME/keys/keydrop/local.env" admin@example.com
pnpm run db:migrate
KEYDROP_DEV_ENV_FILE="$HOME/keys/keydrop/local.env" pnpm dev
```

## Required settings

The runtime must provide the variables below. Keep secrets in Workers secrets or a secure local secret store. Never commit them to Git.

| Variable | Purpose |
| --- | --- |
| APP_URL | Full origin without a trailing slash; use HTTPS in production; http://localhost:3000 works locally |
| ADMIN_EMAIL | Email of the only administrator; public sign-up cannot use this reserved address |
| BETTER_AUTH_SECRET | Random secret of at least 32 characters; protects sign-in state |
| SETUP_SECRET | Separate random secret of at least 32 characters; used once to set up the administrator |
| CODE_ENCRYPTION_KEY | 32 random bytes as 64 hexadecimal characters; encrypts codes waiting for delivery; required to create batches |

The homepage is viewable right away. The first visit to `/dashboard` redirects to `/setup`. Enter the one-time setup secret, the administrator name and a password of at least 12 characters, then sign in at `/sign-in`. After setup succeeds, the same secret cannot create another administrator.

Regular users and the administrator share Better Auth. Admin rights come from the user ID in the installation table, not from public sign-up or email matching.

## Optional email

Set `EMAIL_FROM`, add a `send_email` binding named `EMAIL` in Wrangler, and set up the sending domain as described in the Cloudflare Email Service docs. If either is missing, the Email OTP plugin is not registered and the interface does not offer code sign-in. Do not change your existing inbound MX records for sending.

```json
{"send_email": [{"name": "EMAIL"}]}
```

Run `pnpm run cf-typegen` after you change Wrangler. Password sign-in works without email.

## Checks

```sh
pnpm run test
pnpm run typecheck
pnpm run build:worker
```

The tests run the real migrations on in-memory SQLite. They cover Better Auth password and OTP sign-in, setup rollback, admin rights isolation, 1,000-code batches, rollback on duplicate codes, and encryption integrity. They send no real email and create no payments.

## Built-in endpoints

- `POST /api/setup`: one-time administrator setup.
- `/api/auth/*`: Better Auth.
- `GET /api/products`, `POST /api/products`: list and create products (administrator).
- `GET /api/batches`, `POST /api/batches`: list batches, generate codes and import them into inventory.
- `POST /api/batches/preview`: check for codes that already exist in the product.
- `GET /api/codes`, `PATCH /api/codes`: paged queries by batch and status, revoke and restore.
- `POST /api/codes/export`: decrypt a batch and export it; the admin interface downloads it as Excel.

This list covers the core inventory endpoints only. Other features document their own endpoints, for example [Quick handout and product icons](handouts.md), [passwords](passwords.md) and [Stripe checkout](stripe.md).

Product and batch writes require an administrator session and an Origin that matches APP_URL. For external integrations, use a separate API token with `/api/v1/operations`. Do not use the administrator cookie as an integration method.

## Settings file outside the project

If your secrets live outside the project, run `KEYDROP_DEV_ENV_FILE=/absolute/path/to/local.env pnpm dev`. This option is read only in development mode. Production deployments still use Workers secrets.

Imports parse .xlsx/CSV in the browser. You can pick the worksheet, the code column and the header row, and the data is sent only after the preview passes. Each import takes at most 1,000 codes. Excel formula cells and numeric codes that may have lost precision are rejected. The .xlsx export stores codes as text, keeps leading zeros and runs no formulas.

Exact code lookup uses a JSON body (the code field) on `POST /api/codes/search`, so raw codes never appear in URLs or access logs.

## Client IP for sign-in

Better Auth uses only the Cloudflare-set `cf-connecting-ip` for sign-in rate limiting. It ignores the client-supplied `x-forwarded-for`. Production must go through the Cloudflare Workers entry point. If you put another reverse proxy in front, adjust the setting to the headers you actually trust. Never trust arbitrary forwarding headers. Purely local requests without a source header use a local/shared rate limit bucket. This does not mean production should disable rate limiting. See the [Better Auth options](https://better-auth.com/docs/reference/options).

Keydrop's own rate limits and caps (claiming, sending codes by email, purchasing, license validation) convert the client IP to a network range first. IPv4 uses the full address. IPv6 is truncated to /64 (matching Better Auth's default `ipv6Subnet: 64`), so one IPv6 user cannot bypass the limit by changing addresses. The database stores only an HMAC, never the plaintext IP.

Anonymous claims and accounts with unverified emails are both subject to the campaign's per-person cap for each network range. Accounts can be registered without limit, so an unverified email does not count as a separate person. Accounts with a verified email are limited only by the per-account cap. `codes.issue` through the API/MCP is called by a trusted backend and has no client IP, so the network range cap does not apply.


## Local dev cache

next.config.ts sets `experimental.turbopackFileSystemCacheForDev` to false so that the dev server does not keep reloading and resetting form input. Production builds keep the default disk cache.

The dev server also allows the `127.0.0.1` origin for local checks with separate cookies. Set `APP_URL` to the origin you actually use. `allowedDevOrigins` adds only this local hostname and does not open arbitrary origins. Production Origin checks are not affected.
