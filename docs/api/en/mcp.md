# MCP integration

Direct assignment provides `assign_code` (codes:issue plus the MCP write switch) and `list_code_assignments` (codes:read). Both are limited to the token's product scope. See the [direct assignment protocol](assignments.md). The history includes recipient emails and internal notes; keep it confidential.

Endpoint: `https://<deployment domain>/mcp`. It uses the stateless Streamable HTTP transport from the official MCP TypeScript SDK. POST returns JSON. There is no long-lived GET SSE stream. Every request re-validates the token, so a revoked token never keeps session access.

## Setup

1. The administrator creates a token at `/dashboard/tokens` and selects products and the needed scopes.
2. Configure the MCP URL in your client with the HTTP header `Authorization: Bearer <token>`.
3. By default only read-only tools are available. If an agent really needs to write, select both the matching write scope and "Allow these write permissions through MCP" when creating the token. Either one alone does not grant MCP write access.

MCP write access is off by default (`mcpWriteEnabled=false`) and a token's permissions cannot be edited. To change them, create a new token and revoke the old one. API tokens cannot create or change tokens.

This currently works with clients where you set the Bearer header manually. OAuth sign-in and dynamic client registration are not provided, so OAuth-only connectors will not work. Store the secret in the client's secure settings or an environment variable. Do not put it in shared project files.

## Tools

| Tool | scope | Purpose |
|---|---|---|
| `read_product` | `products:read` | One product's settings |
| `list_batches` | `codes:read` | Product batches |
| `list_codes` | `codes:read` | Code summaries, without secrets |
| `list_campaigns` | `campaigns:read` | Campaign settings and conditions |
| `change_code_status` | `codes:write` + MCP write switch | Revoke or restore codes |
| `change_campaign_status` | `campaigns:write` + MCP write switch | Change campaign status against the current version |
| `issue_code` | `codes:issue` + MCP write switch | Claim a code for a registered user under campaign conditions |
| `read_credits` | `credits:read` | Credit balance, transactions in pages of 50, and source status |
| `read_entitlements` | `entitlements:read` | Time-limited membership or permanent entitlements |
| `manage_credits` | `credits:write` + MCP write switch | Grant, spend, refund and revoke credits |
| `redeem_code` | `codes:redeem` + MCP write switch | Redeem a code for a given user |

Tool parameters and business rules are the same as in the [API token docs](authentication.md). The tool list contains only the operations the token is authorized for. Every call still checks the product scope; authorization never relies on hidden tools or prompt text.

`userId` must be a stable user identifier that your product backend has verified. Issuing codes and writing entitlements need stable idempotency keys; retries must not generate new keys. Campaign status operations use expectedVersion. On a version conflict, re-read before deciding; these operations are not marked idempotent. Tool annotations mark read/write and idempotency for client display only. The server enforces the real authorization.

Each token shares the limit of 30 requests per minute with the REST API, including protocol initialization and tool discovery. Tool business errors return a public code with `isError: true`, never SQL or internal exceptions. An invalid token returns HTTP 401. A product mismatch returns `API_SCOPE_DENIED` in the tool result.

Requests with an Origin must be same-origin with APP_URL, and the Host must match the deployment URL. Native MCP clients usually send no Origin and can connect directly. The request limit is 1 MiB. Responses are never cached.

## Compatibility

The server follows the MCP Streamable HTTP transport and works with the official SDK client; check your own client before relying on it. Only `POST` is accepted: `GET` and `DELETE` are authenticated first and then answered with 405 and `Allow: POST`, and a request whose `Host` does not match `APP_URL` gets 403 `INVALID_HOST`. The sections below cover the tools for creating and editing products and campaigns, generating/importing/restocking codes, device management, direct assignment and Stripe discounts.

Implementation reference: [Web Standard transport in the official SDK](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/streamableHttp.examples.ts).

## Management tools

`create_product`, `update_product` and `archive_product` require products:write. Creating a product also requires access to all products, so product-scoped tokens do not see the create tool. `restock_batch` requires codes:write and uses a stable UUID idempotency key; retry with the same content. All of these tools require the MCP write switch. Field definitions match the product and restock section of authentication.md.

`create_campaign` and `update_campaign` require campaigns:write and the MCP write switch. `read_campaign` requires campaigns:read. New campaigns are drafts; activate them with change_campaign_status. Updates require expectedVersion, and the product and batch are fixed. On a version conflict, re-read before deciding. See [Campaign conditions](conditions.md) for the condition JSON format. Conditions must not reference purchase history for products the token is not authorized for.

Private link tools: create_claim_link, list_claim_links, revoke_claim_link. Campaign credential tools: save_campaign_credential, list_campaign_credentials, revoke_campaign_credential. Reads require campaigns:read. The others require campaigns:write and the MCP write switch. Fields match the REST docs. Creating a link returns a secret token, and saving a credential accepts a secret. Enable these only for trusted agents, and do not paste secrets into public chats or logs.

`create_code_batch` imports an actual list of codes. `generate_code_batch` generates codes securely from rules. Both require codes:write and the MCP write switch, plus a UUID idempotencyKey; retries reuse the same key and content. Responses contain only the batch id/count and never reveal codes. See the REST batch creation docs for fields.

The sales tool configure_sales_batch requires products:write. The reward tools configure_reward and read_reward require rewards:write and rewards:read. Writes need the extra MCP switch, and reward changes need expectedVersion. You can set credits, time-limited membership, permanent entitlements or external grants. When an external grant result is unknown, the administrator must review it; do not simply resend. See the REST docs for details.

## License device tools

`list_license_devices` and `release_license_device` map to licenses.read and licenses.release. Both require licenses:manage and product authorization. By default only the list tool is shown; the release tool also requires mcpWriteEnabled. Listing returns 50 per page and never returns activation credentials or device fingerprints. A device may be reactivated, so the release tool is not declared idempotent. If a result is unknown, list again first.

`activate_license_device` lets a product backend or authorized agent activate on a user's behalf. It requires licenses:manage, product scope and mcpWriteEnabled. Shared codes check the given userId's holding and do not accept an unrelated account that only knows the code. The response contains an activationToken; treat it as a secret and keep it out of public logs.

Stripe discount tools: `read_stripe_discounts` and `manage_stripe_discounts` are available only to all-products tokens and require `discounts:read` and `discounts:write` respectively. The latter also needs MCP write permission. Inputs are wrapped in `request`; see [Stripe discounts](stripe-discounts.md). Imports also require `codes:write`. Decrypted snapshots may contain codes and customer identifiers; keep them confidential.

`configure_sales_batch` also accepts optional `allowPromotionCodes` and `stripeProductId`. Omitting them keeps the current values. Passing null for the Product ID clears the link.
