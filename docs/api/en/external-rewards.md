# External reward grant protocol

When a code is redeemed, Keydrop can grant the reward in your own product through an HTTPS endpoint or a code hook. Reward settings live in the dashboard; redemption works through the signed-in session, REST and MCP, and every operation is recorded so that unclear results can be reviewed in the dashboard.

## Registering integrations

Register HTTPS endpoints or code hooks that you control in `apps/web/src/custom/external-rewards.ts`. The same ID cannot appear in both registries. Business settings refer only to an integration ID and cannot submit arbitrary URLs. HTTP endpoints need a secretName. The deployer stores the matching 32-byte hex HMAC key in the `EXTERNAL_REWARD_SECRETS` secret. The key never goes into the database or the repository.

The JSON sent:

```json
{
  "version": 1,
  "operationId": "fixed operation UUID",
  "productId": "product UUID",
  "codeId": "code UUID",
  "userId": "Keydrop account ID",
  "reward": {"payload": {"plan": "pro", "duration": {"days": 30}}, "repeat": "add", "reclaimOnRevoke": true}
}
```

It never includes the raw code, email, device ID or any user-supplied URL. reward can contain nested JSON. The whole request is limited to 16 KiB.

Headers:

- `Idempotency-Key`: the operationId.
- `Keydrop-Signature`: `t=<Unix seconds>,v1=HMAC-SHA256(timestamp.rawBody)`, signed with the decoded 32-byte hex key. Verify it the same way as described in the webhook docs.
- `Content-Type` / `Accept`: application/json.

The receiver must verify the signature, check for a reasonable clock skew, and persist the operationId with the grant result. A retry with the same operationId and body must return the original result and must not grant again. The same ID with a different body must be rejected. Do not keep the duplicate check only in memory.

## Response

HTTP 2xx, application/json, body up to 4 KiB:

```json
{"operationId":"the same UUID as the request","status":"applied"}
```

`applied` means the entitlement has been persisted. Only a valid receipt with a matching operation ID confirms success. If you explicitly reject with no side effects, return `status: "rejected"`. Never return rejected when the grant was applied but the receipt is temporarily unavailable. Any other status, extra fields, a wrong ID, a non-2xx status or invalid JSON is treated as an unconfirmed result. The response body is never shown to the user.

## Timeouts and retries

The five-second deadline covers DNS, HTTP, reading the body and code hooks. HTTP uses an AbortSignal and does not follow redirects. A body over the limit cancels the request. Raw exceptions and external bodies are never written into user-facing errors.

A 3xx reply is treated as an invalid receipt; Keydrop never follows redirects to another host.

The calling layer does not retry on its own. The redemption service first persists the operationId and the reward snapshot. For the same account and code, even after a reload or a new request idempotency key, the same external identifier and content are reused. Each request key keeps its mapping and cannot be reused for another code. A timeout does not mean the receiver did not grant. A late success or an interrupted run must be resolved by looking up the same ID, never by sending a new grant.

Code hooks receive the same fields plus a signal and return the same receipt. Hooks must also implement durable idempotency and honor cancellation. A Promise timeout cannot force-stop code you write yourself.

Keydrop currently requires HTTPS on port 443 with a public DNS preflight. It rejects IPs, private/special addresses and mixed public/private resolution. The DNS preflight does not pin fetch to the checked IP, so register only services you control. This synchronous grant protocol is different from event webhooks, which retry automatically.

## Configuration and transaction behavior

- `EXTERNAL_REWARD_SECRETS` is a JSON secret map from secretName to a 64-character hex key. Keep it only in the deployment environment or your secret store. Never put it in a reward payload.
- In the dashboard, choose "Connected product reward" for the campaign reward, then set a registered integrationId and a JSON payload (up to 8 KiB). The API reward format is `{kind:"external",integrationId:"partner",payload:{plan:"pro"},repeat:"add",reclaimOnRevoke:true}`.
- A 60-second lease prevents concurrent resends. When the lease expires, the operation moves to manual review and the user cannot take it over. There is no automatic re-grant schedule. Each send still has the five-second deadline.
- Failures add no redemptions and do not increase use_count. Only a rejected receipt with a matching operationId allows the user to retry. An explicit rejection also releases the redemption slot (use_count/max_uses), so others can redeem the same code. If the original user retries later and the slots are used up, the API returns `REDEMPTION_UNAVAILABLE` without calling the receiver. Unique codes still do not go back to inventory for new claims or sales. Timeouts, invalid replies, interrupted runs and local commit failures all set review_required and block user retries. The dashboard home page shows the operation ID and the cumulative failure count. On success, Keydrop atomically writes the redemption, consumes one slot and resolves the failure notification.
- The slot for an unconfirmed operation stays reserved for the original account, in case the receiver actually granted it. Unique codes are not redistributed or sold during this time. This is a held, unredeemed operation, not a redemption. When the result is unknown, only the administrator can resolve it on the external result review page. Changing the request key or reloading cannot bypass this. If the grant was applied but the local code has since been revoked or expired, the administrator still needs to arrange compensation in the external product.
- In-flight operations keep the original reward snapshot. Changing the rule in the dashboard cannot turn a retry into a different reward. Retries and completion still check revocation, expiry, holding and capacity.
- If the receiver returned applied but the local commit failed because of revocation or a database error, the same operation is kept and the administrator is notified. The receiver must support looking up an existing result by the same ID. Never add entitlements by resending.
- The add/replace/reject semantics of `repeat` are implemented by the external product in the same grant transaction. Keydrop does not invent an external credit ledger.
- When a completed external reward is revoked with reclaimOnRevoke on, Keydrop creates an external revocation job and an administrator notification in the same transaction. The schedule sends the revocation, and the notification is resolved only when the receiver confirms completion. Revoking the local code does not mean the external reward has been reclaimed.

## External revocation

Revocation requests use the same integration and the original reward snapshot, plus:

```json
{"action":"revoke","originalOperationId":"original grant operation UUID","operationId":"fixed revocation UUID, different from the grant"}
```

productId, codeId, userId, reward, version and the signature format are unchanged. A request without action still means a grant, so in-flight grant bodies do not change. action and originalOperationId must appear together. The revocation operationId cannot equal the original grant ID.

The receiver must find the original entitlement source by originalOperationId and reclaim only the part of that source that the policy allows. It must not revoke all of the account's entitlements or another buyer's entitlements. Only an applied response with a matching revocation operationId means the revocation is done; HTTP 2xx alone is not enough. The receiver should keep transaction records for consumed parts and must not claim to have reclaimed anything it could not process.

The schedule handles up to 10 jobs per run, with a 60-second lease and result fencing. Failures back off at 5, 10, 20 and 40 minutes, and automatic attempts stop after the fifth failure. This retries revocation jobs only; it never retries a user's failed redemption. Timeouts and manual retries reuse the same revocation ID.

The administrator can view jobs and cumulative attempt counts at `/dashboard/external-revocations`, 25 per page. Only failed jobs can be retried manually. Confirmed jobs are never resent. `POST /api/admin/external-revocations` accepts `{redemptionId:"original grant UUID"}` and requires an administrator session and Origin. It resets the count for this round but keeps total_attempts/retry_count. Even if the rule has changed, the revocation uses the snapshot from the time of the grant.

## Administrator review of unknown grant results

`/dashboard/external-reviews` lists operations waiting for review. The administrator first looks up the receiver's record by the original operationId, then writes a review note of at least 10 characters (no keys or raw codes) and chooses:

- `applied`: the external grant is confirmed. Keydrop atomically completes the local redemption and does not call the receiver again.
- `not_applied`: confirmed not granted. The original user can retry. The original operation ID and reward snapshot are kept, and the redemption slot is released (as with an explicit rejection). Nothing is granted automatically.

`POST /api/admin/external-reviews` accepts `{attemptId, outcome, note}` and requires an administrator session and a same-origin Origin. The operation and the review record are written in the same transaction. Repeated handling is rejected. On success, the notification is resolved. If the code was revoked or expired, or the product was archived, during the review, confirming applied still records the redemption (the external grant really happened, and a local record is needed to track reclaim). The code keeps its status. If the code was revoked or the source order lost access, the redemption is marked revoked immediately, and with `reclaimOnRevoke` on, an external revocation is queued automatically.

The schedule moves in-flight grants past their 60-second lease to manual review without waiting for the user to retry. Legacy retryable operations that did not distinguish results are all conservatively moved to manual review after migration.

The administrator notification center at `/dashboard/notifications` separates explicit rejections from unknown results. Users can retry after the former. The latter keep the slot reserved, block user retries and must go through the manual review above. Notification emails are optional; see the [email docs](email.md) for the sending rules. Email retries only resend the alert and never grant the reward again.
