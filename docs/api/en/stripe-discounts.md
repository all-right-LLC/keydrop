# Stripe discount sync

Keydrop can read your Stripe coupons and promotion codes into an encrypted catalog, create new ones, import promotion codes into a batch and push local codes to Stripe. Every Stripe write is recorded as an operation that can be resumed or recovered. Verify the flow in Stripe test mode before using it with live data.

## Data and sync

A Coupon defines a discount. A Promotion Code is the code you distribute. The catalog is isolated by Stripe account, test/live mode, object kind and source ID. The caller must confirm the account and mode from the server credentials. Never trust a scope sent by a client.

Snapshots store Stripe's applicable products, customer/account, minimum amount, multiple currencies, duration, redemption count and active status. Amounts use Stripe's smallest currency unit. Use the existing currency conversion when turning them into Keydrop amounts. Snapshots are encrypted, with the AAD bound to the account, mode, object ID and version. Lists never include raw codes, customer details or metadata.

Each sync first takes an increasing version, then reads from Stripe. Only a reply that still holds the current version can commit, so an older request cannot overwrite newer data. Stripe is the source of truth. On failure, the old snapshot is kept but marked stale. A stale snapshot must not be used for new discount decisions. Only the official SDK's resource_missing 404 becomes a deletion mark. Permission or network failures are never treated as deletions.

## Create operations

Before creating, Keydrop stores a UUID, the scope, a normalized request hash and the encrypted body. The same UUID cannot switch account, mode or content. Requests use a fixed Stripe idempotency key. A Coupon uses a fixed ID derived from the operation UUID. After success, the original object ID is replayed forever and nothing is created again.

A 60-second lease and token fencing prevent concurrent commits and late results from overwriting each other. You can retry with the same ID and body within 23 hours of the first attempt. After that, the operation moves to review and the create API is no longer called. Stripe API v1 idempotency keys may be purged after at least 24 hours, so you cannot rely on them for permanent deduplication. Items in review can be recovered by checking existing objects from the creation history. Do not issue again blindly with a new UUID.

Creation and catalog sync are separate steps. If sync fails afterwards, the created source ID must be kept and synced separately. Never create the object again.

## References

Checked 2026-11-07: [Create a Coupon](https://docs.stripe.com/api/coupons/create), [Create a Promotion Code](https://docs.stripe.com/api/promotion_codes/create), [Idempotent requests](https://docs.stripe.com/api/idempotent_requests).

## Administrator dashboard

`/dashboard/stripe-discounts` shows the connection status, Stripe discounts with paging, and the local catalog, and supports sync by source ID. Syncing here updates the discount catalog only; it does not turn discounts into distributable codes. To import into the current product, the administrator opens "Import a Stripe promotion code" on the product's code library page.

`GET /api/admin/stripe-discounts` requires an administrator session. It confirms the account ID and livemode through `/v1/account` and `/v1/balance` on the same Stripe client. It returns only `{accountId,livemode}` and never stores or returns balances or account personal data. A restricted key needs read access to account and balance.

`POST /api/admin/stripe-discounts` requires an administrator session, a same-origin Origin and JSON, up to 32 KiB. All responses are no-store:

- `{action:"catalog",kind,page?}`: local catalog, 25 per page.
- `{action:"discover",kind,cursor?}`: Stripe source IDs and active status, 25 per page, without raw codes.
- `{action:"read",kind,sourceId}`: decrypts and reads one synced snapshot. Administrators only.
- `{action:"sync",kind,sourceId,expectedScope}`: fetches the current Stripe snapshot.
- `{action:"createCoupon",operationId,input,expectedScope}`, `createPromotion`: durable creation followed by sync. If creation succeeds but sync fails, the source ID is still returned with synced=false, and a retry does not create again.

kind is coupon/promotion_code. Write actions must pass the expectedScope that the page showed earlier. The server still uses the authenticated scope. A mismatch returns 409 STRIPE_CONNECTION_CHANGED, so changing the server key cannot write to another account or to live mode by mistake. The create input uses a strict schema in the code. The dashboard provides Coupon and Promotion Code forms. A fuller public protocol is still in progress.

## Create forms and retries

The dashboard forms support percentage or fixed amount, multiple currencies, subscription duration, product restrictions, expiry and redemption count. Promotion Codes support the linked Coupon, customer/account, first-time transaction, minimum amount and active status. Amount fields are labeled in Stripe's smallest unit. Dates are entered in the browser's local time and converted to Unix seconds.

The current tab's sessionStorage stores only the operation UUID keyed by the normalized request hash. It never stores raw codes, customer IDs or credentials. After reloading the same tab, entering the same account, mode and values reuses the UUID. A different tab, cleared browser data or another device loses this mapping. Keep the operation ID shown on screen and check the server records. Cross-device automatic deduplication is not provided.

After a successful creation you can check the same operation again. Only after success is confirmed does the page show "Create again with the same values", which lets the administrator start a separate operation on purpose. This button is not shown for unknown results. The server can retry using the original request by operation ID, or recover after checking an existing object.

## Creation history and recovery

The "Creation history and recovery" section on the admin page shows 25 items per page. It lists only the operation ID, kind, status, source ID and times/attempt counts, never the original request or codes. The same administrator account can view it across tabs and devices, which covers cases where the browser no longer has the form data.

The administrator POST also supports:

- `{action:"operations",page?}`: lists the creation log for the current connection scope.
- `{action:"resume",operationId,expectedScope}`: the server decrypts the original request and retries. Successful operations only sync. Unconfirmed operations are still subject to the 23-hour limit.
- `{action:"recover",operationId,sourceId,expectedScope}`: reads an existing Stripe object only. It restores the source ID and syncs the catalog only if metadata.keydrop_operation_id, the object ID, the mode and the original code/Coupon link all match. A Coupon must use the fixed ID derived from the original operation. For a Promotion Code, the administrator copies the source ID from Stripe.

Recovery never calls the create API. It does not force-close a case when the metadata was removed or changed, the source was deleted, the object cannot be verified, or an active lease exists. Operation leases and token fencing prevent an expired recovery from overwriting a newer result. If no verifiable existing object exists, the case stays pending. There is currently no feature that can automatically prove "Stripe never created it".

## Importing a Promotion Code into the code library

The administrator POST accepts `{action:"importPromotion",expectedScope,input:{productId,promotionId,name,distributionMode,sharedClaimLimit}}`. distributionMode is unique/shared (default shared). sharedClaimLimit is 1–1,000,000 or null. Keydrop first syncs the Promotion Code and its Coupon from Stripe, then in one transaction creates a discount/stripe batch, the encrypted code and the source link.

Each account, mode, Promotion Code and product has only one link. Retrying with the same import settings returns the original batch and code IDs. Different settings return a conflict. If the product already has another code with the same text, the import is not merged silently; the whole import rolls back. The import is also rejected if the source snapshot version changed before storage, the product is archived or the source has expired.

Keydrop claim slots are different from Stripe redemption counts. The code library shows that usage counts are managed by Stripe. Stripe enforces its own discount restrictions, such as customer, minimum amount, product and first-time transaction. Importing does not remove them. The administrator should configure campaign eligibility for the intended recipients.

If a later sync finds that the source or Coupon is inactive or deleted, or the sync failed or is still in flight, a database view and claim/order guards block new distribution. The expiry is the earlier of the Coupon and Promotion Code expiry. A source becoming active again does not change an administrator's manual revocation. Existing delivery records are kept. These checks use the latest local sync state. A periodic background sync exists, but Stripe discount events are not connected yet, so remote changes are not guaranteed to show up immediately.

Stripe batches cannot use regular manual restock, so codes without a source cannot slip in. Each import currently creates a batch for a single Promotion Code. Bulk operations create one batch per item. If the source code text or the linked Coupon changes unexpectedly, distribution is blocked. An old encrypted code is never sent as if it were the new source.

The product import form first confirms the Stripe connection, then asks for the Promotion Code ID, batch name, unique/shared mode and claim limit. On success, the code library switches to that batch. Repeating the import with the same settings returns to the original batch. Archived products do not show the import action. Verify it in Stripe test mode before using it live.

## Bulk import

The administrator POST supports `{action:"importPromotions",expectedScope,input:{productId,promotionIds,name,distributionMode,sharedClaimLimit}}`. promotionIds is 1–25 unique source IDs. Other settings match the single import. The response is `{scope,results:[{promotionId,batchId,codeId}|{promotionId,error}]}`. HTTP success does not mean every item succeeded; the caller must check results.

Each item commits on its own. A partial failure or dropped connection does not undo completed items. Resending with the same settings returns the existing links without importing twice. Do not change the batch name or other settings to retry, or completed items will return a conflict. Each error returns only a safe code, never the raw Stripe error.

The product form accepts up to 25 IDs separated by commas or whitespace and shows the result for each. When several succeed, the view returns to all batches. When one succeeds, it switches to that batch.

## Background sync

The existing five-minute schedule syncs the 20 least recently checked sources by default. Set STRIPE_SYNC_BATCH_SIZE to 1–100 to change this. Sources include Coupons and Promotion Codes, not individual codes. A full pass over many sources can take hours. A single failure does not stop the rotation of other sources. Missing configuration, a failed connection identity check, or an account/mode switch marks the affected sources unavailable. A schedule lease prevents overlap, but remote changes are not guaranteed to show up immediately.

## API tokens and MCP

`POST /api/v1/operations` uses the existing Bearer token and provides two operations:

- `{action:"discounts.read",request:{action:"connection"}}`: returns the account ID and mode. request also accepts the same fields as catalog, discover, read and operations above.
- `{action:"discounts.write",request:{action:"sync",kind:"coupon",sourceId:"coupon_id",expectedScope:{accountId:"acct_id",livemode:false}}}`: request also accepts createCoupon, createPromotion, resume, recover, importPromotion, importPromotions, exportPromotion and resumeExport.

Reads require `discounts:read` and writes require `discounts:write`. Both require an all-products token with `productIds:null`, because the Stripe discount catalog is account-wide and cannot be isolated by product. Imports also require `codes:write`. Missing permissions return `API_SCOPE_DENIED` before Stripe is called. read snapshots include decrypted promotion codes and possibly customer IDs. Treat them as secrets and keep them out of public logs.

The MCP tools are `read_stripe_discounts` and `manage_stripe_discounts`, with parameters also wrapped in `request`. Product-scoped tokens do not get these two tools. The write tool also requires `mcpWriteEnabled:true`. The read tool does not sync local snapshots; sync is a write operation. The tools are marked as possibly accessing external Stripe. Create, retry and recover are still bound by the operation UUID, account/mode and unknown-result rules above.

`discounts.write` does not include read access. Agents usually also need `discounts:read` to get the connection scope and check creation records. This integration does not provide an SDK.

## Pushing existing discount codes to Stripe

The administrator discount API and the discounts.write request accept exportPromotion. expectedScope names the confirmed account and mode. input contains productId, codeId, operationId (a stable UUID) and promotion. promotion uses the Promotion Code creation settings, such as couponId, maxRedemptions, customer and minimum amount restrictions. It does not accept code; the server decrypts the original code. active can only be true.

This operation keeps the original code and batch. It first confirms the Coupon, then stores the encrypted request and a unique push intent. Until the source link is complete, the code stops being distributed; existing delivery records are kept. The original code must be a local discount code that is not revoked, reserved or expired, and the product must not be archived. Once linked, the latest Stripe snapshot blocks invalid codes. The original local expiry remains an upper limit.

The response contains operationId, sourceId, codeId, batchId and linked. linked:false means Stripe created the object but sync or the local link is not complete. Do not switch to a new operation ID. Resending the same settings reuses the original operation. You can also send `{action:"resumeExport",expectedScope,input:{productId,codeId}}` so the server decrypts the original request and resumes.

If a result is still unknown after the safe retry window, use the existing recover action to check the Stripe object, then resumeExport to complete the link. Unknown pushes are not cancelled automatically, and their distribution lock is not released automatically. Both push and resume require an all-products token with discounts:write and codes:write. MCP also requires write permission.

After selecting a local discount code in the product code library, use "Push selected code to Stripe". The form first confirms the connection, then shows the mode and restriction settings. If a saved push exists, it offers "Resume saved request". Verify it in Stripe test mode before using it live.
