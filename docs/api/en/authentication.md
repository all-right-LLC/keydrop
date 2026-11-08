# API tokens and product integration

This interface is for the deployer's own servers. Never put a token in a public web page, a mobile app bundle or any client-side code.

## Create and revoke

After signing in, the administrator can create and revoke tokens at `/dashboard/tokens`. The form defaults to read-only and requires you to pick products. The secret is shown once and cannot be recovered after you close the dialog. You can also use `/api/tokens`: GET lists tokens, POST creates one, and DELETE `{ "id": "token UUID" }` revokes one. Mutating requests require a same-site Origin. A regular API token cannot manage or create other tokens.

Create fields: `name`, `scopes`, `productIds`, optional `expiresAt` (Unix milliseconds or null) and `mcpWriteEnabled` (default false). The product scope is required: pass a non-empty array of UUIDs. Only an explicit null grants access to all products, including products added later. The expiry must be in the future.

The `token` in the create response is shown only once. Its format is `kd_` followed by a random secret. The database stores only a SHA-256 fingerprint. The list does not include the raw token or the fingerprint. Store the token in your secret manager. If you lose it, revoke it and create a new one.

## Calling the API

Send `POST /api/v1/operations` with the headers `Authorization: Bearer <token>` and `Content-Type: application/json`. Server integrations do not need a browser session. Each valid token allows up to 30 requests per minute; above that the API returns 429 `RATE_LIMITED`. The limit is set in code (`apps/web/src/lib/server/claim-identity.ts`) and is capped at 30, so raising it means changing that code.

Product operations take a `productId` as described in each section (it may sit inside product, batch or campaign). Creating a product and account-wide Stripe discount operations do not use a top-level productId. Operations that touch customer entitlements or issue codes also take a `userId`. The trusted deployer server sets `userId`; it is a stable user identifier within that product. To access entitlements created through Keydrop pages, use the same Keydrop user ID. Never trust an unverified ID sent by a client.

| action | Required scope | Other fields |
|---|---|---|
| `products.read` | `products:read` | None; returns one product's settings |
| `batches.read` | `codes:read` | None; lists the product's batches |
| `codes.read` | `codes:read` | Optional `batchId`, `status`, `page`; 50 per page |
| `codes.update` | `codes:write` | `ids` (up to 1,000 UUIDs), `change` (revoke/restore) |
| `campaigns.read` | `campaigns:read` | Optional `page`; 20 per page |
| `campaigns.status` | `campaigns:write` | `campaignId`, `expectedVersion`, `status` |
| `codes.issue` | `codes:issue` | `userId`, `campaignId`, UUID `idempotencyKey`; optional claim-condition inputs |
| `credits.read` | `credits:read` | `bucket`, optional `page` |
| `credits.write` | `credits:write` | `bucket`, `operation` |
| `entitlements.read` | `entitlements:read` | `plan` |
| `codes.redeem` | `codes:redeem` | `code`, UUID `idempotencyKey` |

For a wallet that does not exist, `credits.read` returns `wallet: null` and an empty history; it does not create the wallet. For an existing wallet it returns the balance, transactions in pages of 50, and the status of traceable sources.

The `operation` for `credits.write` contains:

- `kind`: grant/spend/refund/revoke.
- `amount`: a positive integer for grant/spend/refund; must be 0 for revoke.
- `idempotencyKey`: 1–128 characters. The same key on the same wallet runs only once. Reusing a key with different content is rejected.
- `relatedId`: for grant, the unique grant source; for refund, the ID of the original spend transaction; for revoke, the source grant ID; for spend, it must be null or omitted.

`credits:write` covers both granting and revoking. Give it only to trusted product backends. The operation does not accept an arbitrary walletId. The wallet is located by the authorized product, the user and the bucket together, which prevents cross-product operations.

`codes.redeem` applies the code's usage limits, assigned holder, reward settings and atomic transaction. Built-in redemption accepts only the redemption kind. It cannot mark an external platform code as redeemed.

Errors return `{"error": "<CODE>"}` with these statuses. Responses are never cached.

| Status | Meaning |
|---|---|
| 400 | The input format is wrong (`INVALID_INPUT`) |
| 401 | The token is invalid, expired or revoked |
| 403 | The operation or product is not authorized |
| 404 | The product, campaign or user was not found (`PRODUCT_NOT_FOUND`, `CAMPAIGN_NOT_FOUND`, `CLAIM_USER_NOT_FOUND`, …) |
| 409 | A business conflict, such as insufficient balance or a reused idempotency key |
| 413 | The request body is over 1 MiB (`REQUEST_TOO_LARGE`) |
| 415 | The `Content-Type` is not `application/json` |
| 429 | Too many requests for this token (`RATE_LIMITED`) |
| 503 | A required setting is missing, such as `CODE_ENCRYPTION_KEY` (`ENCRYPTION_NOT_CONFIGURED`), Stripe (`STRIPE_NOT_CONFIGURED`) or an eligibility endpoint (`QUALIFICATION_UNAVAILABLE`) |

## Current scope

The table above lists the basic read, issue and entitlement operations; it is not the full list. `codes.assign` and `assignments.read` are described in [Direct assignment](assignments.md), and `discounts.read` / `discounts.write` in [Stripe discounts](stripe-discounts.md). Product management, batch creation/restock, campaign editing, credentials/links, sales/reward settings and device management are covered in the sections below. See also [Direct assignment](assignments.md) and [Stripe discounts](stripe-discounts.md). All of these are also available through [MCP](mcp.md).

## Inventory and campaign issuing

`codes.read` returns only the code ID, batch, status, limits and usage count. It never returns the raw code, ciphertext or fingerprint. `codes.update` affects only codes within the productId. Revoking may also reclaim configured entitlements. Restoring a code does not bring back entitlements that were already reclaimed.

`campaigns.status` accepts draft/active/paused/archived and must include the current version. A stale version returns 409. Re-read the campaign and let the caller decide whether to retry. Do not overwrite blindly.

`codes.issue` lets a trusted backend claim a campaign code on behalf of a registered Keydrop user. The userId must exist. Email and verification status are read only from the account database. All campaign eligibility rules, open times, private links, per-person limits, total limits and inventory limits still apply. This is not an administrator assignment that bypasses conditions.

Optional claim parameters are `linkToken`, `answers`, `passphrases`, `invitations` and `recoveryOnly`, with the same meaning as a public campaign claim. The same user, campaign and idempotency key return the same claim result. The response contains the raw code. Grant codes:issue only when you really need to issue codes, and do not log the response body.

An unknown campaign, or one from a different product, returns CAMPAIGN_NOT_FOUND. An unknown user returns CLAIM_USER_NOT_FOUND. Unmet eligibility or inventory/limit problems return 409. An unavailable external eligibility service returns 503. Purchase-history conditions check orders that Keydrop has confirmed as paid and that are not fully refunded. You must configure and verify live Stripe payments in your own deployment.

## Product and restock management

- `products.create`: requires `products:write` and `productIds: null`. The `product` input contains name, slug, description, currency, priceMinor, shortagePolicy and revokeOnRefund, with the same defaults as the dashboard. Creation is not idempotent. The slug must be unique. If the result is unknown, check first. Do not change the slug and blindly create again.
- `products.update`: requires `products:write`. Input is productId and the full product settings. Omitted fields take default values; this is not a partial PATCH.
- `products.archive`: requires `products:write`. Input is productId and an archived boolean. Archiving can be undone.
- `batches.restock`: requires `codes:write`. Input is productId, batchId, idempotencyKey (UUID), codes (1–1,000), and optional expiresAt, maxUses, maxDevices. The batch must belong to an authorized product. An identical retry returns the same receipt without the raw codes. The same key with different content is rejected. You can generate secure random codes on the caller side first; this operation only accepts an actual list of codes.
- The request body limit for REST and MCP is 1 MiB. Split larger payloads into batches, each with its own idempotency key. Many special characters can still hit the limit after JSON encoding.

## Creating and updating campaigns

| action | Scope | Input |
| --- | --- | --- |
| campaigns.create | campaigns:write | Full campaign settings; created as draft |
| campaigns.update | campaigns:write | campaignId, expectedVersion, full campaign settings |
| campaigns.get | campaigns:read | productId, campaignId |

A campaign contains productId, batchId, name, slug and conditions. Optional fields: description, visibility (public/private), authMode (anonymous/email/account), startsAt/endsAt (milliseconds or null), totalLimit (or null) and perPersonLimit. Omitted fields take default values; updates are not partial PATCHes. The slug must be unique on create. If the result is unknown, look up existing campaigns. Do not change the slug and create again.

Updates must use the latest version, and productId and batchId cannot change. A stale version or a changed source returns CAMPAIGN_CONFLICT. Cross-product lookups return no campaign data. Any purchase.productId in the conditions must also be within the token's product scope. See [Campaign conditions](conditions.md) for the condition format.

## Private links and campaign credentials

All operations require productId and campaignId. The campaign must belong to an authorized product.

| action | Scope | Extra input/output |
| --- | --- | --- |
| links.create | campaigns:write | link: expiresAt (milliseconds or null), maxClaims (default 1, null for unlimited); returns id, a token shown once, and a relative path |
| links.read | campaigns:read | Returns link ID, expiry, claim limit/count and revocation time; no token or hash |
| links.revoke | campaigns:write | linkId; blocks future claims but does not take back codes already delivered |
| credentials.save | campaigns:write | credential: id, kind (passphrase/invitation), secret (8–128 characters); creates or rotates the credential and clears its revocation |
| credentials.read | campaigns:read | Returns credential id, kind, revoked_at; no secret or hash |
| credentials.revoke | campaigns:write | credential: id, kind; revokes the credential |

links.create is not idempotent. Each success creates a new link. Save the successful response and do not retry blindly. The token in path is in the URL fragment. Prefix it with your own origin. Do not move it into the query string and do not log it. The list cannot recover secrets. If you lose a create response, check the list, revoke any uncertain links, then create a new one.

credentials.save and credentials.revoke bump the campaign version. Re-read the version before editing the campaign afterwards. Secrets are stored as password hashes, and write responses contain only identifiers. These credentials are campaign passphrases and invitation eligibility, not administrator sign-in credentials.

## Creating batches and generating codes

`batches.create` and `batches.generate` both require codes:write, an authorized product scope, an idempotencyKey (UUID) and a batch.

- For create, the batch contains: productId, name, kind (redemption/discount/license/external), source (manual/import), codes (1–1,000 actual codes).
- For generate, the batch contains: productId, name, kind (redemption/discount/license), rules. You cannot generate valid codes for an external platform.
- Both accept expiresAt, maxUses and maxDevices. Defaults: no expiry, one redemption, one device.
- rules: count (1–1,000), prefix (up to 32 characters: letters, digits, `_`, `-`), length (12–64), alphabet (2–64 unique alphanumeric characters), groupSize (0–16; 0 means no grouping). Defaults: length 20, groups of 5, confusable characters excluded. The code space must be at least 60 bits.

The response contains only the batch id and the original count, never the raw codes. Raw codes are stored encrypted and are decrypted only for delivery or an administrator export. A retry with the same product, idempotencyKey and the same effective settings returns the original receipt. Changed content returns BATCH_IDEMPOTENCY_CONFLICT. The count stays at the original creation count even after restocks. Different operations (create/generate) cannot share a key.

The dashboard's POST /api/batches also requires an idempotencyKey. Its flat payload is converted into the shared batch operation above. When the normalized defaults match, the dashboard and REST/MCP can get the same receipt. The dashboard form keeps the request key only in the memory of the open form. If the result is unknown and you have closed or reloaded the form, check the batch list before creating again.

## Sales and reward settings

- `sales.configure` requires products:write. Input is productId, batchId (a UUID of a batch in the same product, or null to stop sales), and optionally allowPromotionCodes (whether Checkout accepts Stripe promotion codes) and stripeProductId (`prod_…`, or null to clear the link to a Stripe product). It does not change the price; set the price with products.update. Payments also require you to finish the Stripe configuration.
- `rewards.configure` requires rewards:write. Input is productId, batchId, optional campaignId (default null), expectedVersion and reward. Use expectedVersion=0 to create a rule, then the version you read afterwards. On conflict, re-read. Do not overwrite blindly.
- `rewards.read` requires rewards:read. Input is productId, batchId and optional campaignId. Returns `{rule:null}` or id/version/reward. When you pass a campaign, it reads only that campaign's override and does not fall back to the batch default.

Supported rewards:

- `{kind:"credits",bucket:"requests",amount:100}`
- `{kind:"membership",plan:"pro",days:30}`
- `{kind:"permanent",plan:"pro"}`
- `{kind:"external",integrationId:"partner",payload:{plan:"pro"}}`. See [External rewards](external-rewards.md) for the receiver protocol and handling of unknown results.

All rewards accept repeat (add/replace/reject, default add) and reclaimOnRevoke (default true). Only redemption batches can have built-in redemption rewards. A campaign override must belong to the same product and batch. Changing a rule affects only future redemptions. Past redemptions keep the snapshot taken at the time. Reclaiming on revoke still follows the original snapshot and traceable consumption.

## License device management

With `licenses:manage`, a token can list, release and activate devices on behalf of users for its authorized products. Listing never returns activation tokens, device fingerprints or raw codes. Only delegated activation returns an activationToken.

- `licenses.read`: productId, optional codeId, page (default 1). Returns devices, page and hasMore. Up to 50 per page, including released devices.
- `licenses.release`: productId, activationId. A single SQL statement checks that the device belongs to the product and releases it. Returns released, activationId and releasedAt. A retry on a device that is released and not reactivated keeps the original time. It does not revoke the code or other devices.

A reactivated device keeps its activationId. If a release result is unknown, check the current status before retrying, so you do not release a device the user reactivated later. This is an administrative permission and does not require the holder's account. User self-service release still uses account ownership checks.

## Shared-code campaign distribution

batches.create, batches.generate and new batches in the dashboard support:

- distributionMode: unique (default; each code is handed out once) or shared (many people can claim the same code).
- sharedClaimLimit: the distribution limit per code across campaigns and orders (including active Checkout reservations). null means no per-code limit. Campaign, per-person and private link limits still apply.

The distribution mode and per-code limit are fixed when the batch is created. Restocks inherit the batch settings. Claims do not consume maxUses; maxUses is still the built-in redemption count. Set the two separately for their own purposes. In shared mode, assigned only means the code was handed out at least once. It does not stop further distribution. Only revocation, expiry, campaign limits and the per-code limit block further claims.

For shared redemption codes, campaign reward overrides look only at the user's own claim records. If one person gets the same code from several campaigns, Keydrop uses the earliest of that person's campaigns that has an override (ties are ordered by claim ID). Each person can still redeem the same code only once. Anonymous claims cannot be reliably tied to an account, so anonymous redemption of shared codes uses the batch default reward. Require account sign-in if you need campaign-specific rewards.

All four kinds of shared batch work with campaigns and Checkout sales. Shared license campaigns require sign-in. Shared licenses support named holders and per-person device isolation; see licenses.md. An administrator revoking a shared code directly affects every holder.

A shared Checkout reserves one slot and does not lock the whole code. When the reservation times out, the slot becomes available to others. A late payment rechecks the slots and follows the original order's refund/manual/restock policy. Refunds do not reopen slots for delivered codes, so a revealed code is never treated as undistributed.

For a full refund of a shared order with revokeOnRefund on, Keydrop revokes only that order's access. It does not revoke the shared code. Built-in redemptions record source_order_id and reclaim unconsumed entitlements from that source as the reclaim settings allow. Other buyers are not affected. Partial refunds, shared external codes and refunds that need manual handling are flagged for review. External platforms cannot take back a revealed code because of a local revocation. With revokeOnRefund off, existing holdings are kept.

After a refund, the order page and My codes no longer reveal codes whose holding was revoked, and emails recheck eligibility. A shared secret that the user has already seen cannot be removed from their memory. Both a named free claim and a valid purchase count as a holding. If a free claim also exists, the entitlement is not attributed to the paid order.

licenses.activate accepts productId, userId, code, deviceId and an optional label. The userId must be verified and delegated by a trusted product backend. Shared codes still check the actual holding. See licenses.md for the full flow and credential handling.
