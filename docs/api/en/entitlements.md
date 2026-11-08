# Built-in entitlements and credit ledger

The "Entitlements & credits" section of a product's dashboard is a read-only view of built-in memberships, lifetime licenses and credits. You can filter by exact account ID or email. Email matching is case-insensitive. External user IDs set through the API do not need to match a Keydrop account.

## Dashboard queries

`/dashboard/products/{productId}/entitlements` requires an administrator sign-in and covers only that product. The membership and credit lists show 25 rows per page. A credit wallet's details show 50 transactions per page, plus a separately paged list of 25 sources. Membership sources show 25 per page.

A membership shows its current continuous valid period, using the same rules as the redemption service. Revoking an earlier grant can leave a gap between the current and future grants, so do not treat the latest expiry date alone as proof that the membership is active. The details also show lifetime licenses, overridden sources, and entitlements that are kept after a redemption is revoked because of the original setting.

Credit transactions show the requested amount and the actual balance change separately. Sources show the original grant, available, reclaimed, consumed and not returned, and returned after revocation. A revoked source does not become available again because of a return transaction. When consumed credits were not reclaimed, a notice asks the administrator to review it.

This page does not allow arbitrary ledger overrides. Grants, deductions and returns use the existing credit operations. Code revocation and refunds use the existing entitlement reclaim rules. Entitlements in external products are not part of the built-in ledger. See [External entitlements](external-rewards.md) for their reconciliation and revocation flow.

## Admin query API

`GET /api/admin/entitlements` uses an administrator session. It does not accept regular users or API keys. Every response, including errors, sets `Cache-Control: no-store`.

| Query | Parameters |
| --- | --- |
| Credit list | `productId`, `view=credits` (default), optional `query`, `page` |
| Membership list | `productId`, `view=memberships`, optional `query`, `page` |
| Credit details | `productId`, `view=wallet`, `walletId`, optional `page`, `sourcesPage` |
| Membership details | `productId`, `view=membership`, `userId`, `plan`, optional `page` |

`query` is an exact account ID or email, up to 254 characters. Wildcard search is not supported. Pages start at 1. Lists and details return `view`, `product`, `page` and `hasMore`. Credit details also return `sourcesPage` and `sourcesHasMore`. An unknown product, a wallet from another product or a nonexistent membership plan returns 404. Malformed input returns 400, no sign-in returns 401, and a non-administrator gets 403.

Responses never contain plaintext codes, encrypted content, sign-in credentials or the custom idempotency keys of transactions. Source IDs, operation IDs, user IDs and the code IDs of membership sources are there for administrator review. They are identifiers only, not redeemable codes.

The administrator endpoint `GET /api/credits?walletId=…` and the `credits.read` operation return the wallet's transactions, 50 per page, with `hasMore`. External product integrations should use the [API operations](authentication.md) (also available through [MCP](mcp.md)), which are limited by product and operation scope.
