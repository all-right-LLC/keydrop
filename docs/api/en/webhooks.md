# Event webhooks

The event notification queue, signed delivery, endpoint management and manual retry are in place. The admin page is /dashboard/webhooks. This document describes the protocol; test it against your own receiver before relying on it.

## Events and payload

Supported events: code.assigned, code.claimed, code.redeemed, code.revoked, order.delivered, order.refunded. Events are committed in the same transaction as the business data. A delivery job is created only for endpoints that are enabled when the event is created and whose product and event type match. New subscriptions do not receive earlier events.

The JSON body contains version (1), id, type, productId, createdAt (milliseconds) and data. data contains the matching claimId/campaignId/codeId/userId/redemptionId/orderId. Refund events also include refundedMinor, amountMinor and currency. For anonymous users, userId is null. The payload never contains raw codes, emails, IPs, survey answers or payment credentials.

For the direct assignment event code.assigned, data is assignmentId, codeId and userId. See [Direct assignment by the administrator](assignments.md). The administrator's internal note is not included.

## Signatures

HTTP headers:

- Keydrop-Event-Id: the event ID; it stays the same across retries.
- Keydrop-Signature: `t=<unix-seconds>,v1=<hex-hmac-sha256>`.

The signed message is the UTF-8 string `<timestamp>.<raw JSON body>`. The secret is a 32-byte random value stored as 64 hexadecimal characters. The HMAC uses the decoded bytes, not the hex text. Put secrets in the deployment's WEBHOOK_SECRETS JSON object, with a key name such as PARTNER and the secret as the value. The database stores only the name, never the secret.

The receiver must verify the signature on the raw body first, then parse the JSON. Do not verify after calling JSON.stringify again. Allow about five minutes of clock skew, compare with a timing-safe comparison, check that the body id matches the event header, and then use the event id for idempotent processing. Each delivery attempt is signed with the current time, while the event's createdAt stays the same. Checking a fresh timestamp does not replace event deduplication.

## Delivery semantics

A scheduled job runs every five minutes and processes up to 20 due deliveries. Only 2xx counts as success. DNS errors, network errors, timeouts and other HTTP statuses all count as failures. Each attempt has a five-second limit (including DNS). Redirects are not followed, and the response body is neither read nor stored. The HTTP status may be kept, but error text is not stored.

After a failure, retries wait about 2, 4, 8, 16, 32, 64 and 128 minutes, subject to the five-minute schedule. After the eighth failure, the delivery becomes failed and automatic retries stop. A sending job interrupted mid-process can be taken over after its 60-second lease expires. Delivery is at least once, so events may arrive duplicated or out of order. The receiver should enqueue reliably before returning 2xx.

Endpoints must use HTTPS, public DNS and port 443. URL credentials, queries, fragments and IP literals are not allowed. DNS is resolved again for every delivery, and any non-public result is refused. The DNS pre-check does not pin the connection IP, so endpoints must still be set by a trusted deployment administrator. The Worker keeps global_fetch_strictly_public. Never create endpoints from untrusted user input.

This mechanism is for event notifications only. Granting entitlements in an external product uses a separate synchronous redemption flow. A successful notification delivery does not mean an entitlement was granted, and a failed notification does not roll back an existing claim or payment.

## Admin API

These endpoints accept only an administrator session. Writes need an Origin that matches APP_URL. They are not regular API token operations.

- POST /api/webhooks: name, url, secretName, events (an array of the events above), productIds (an explicit null means all products; otherwise a non-empty array of product UUIDs). New endpoints are disabled by default.
- PATCH /api/webhooks: `{action:"enabled",endpointId,enabled:true|false}`. Enabling requires the matching WEBHOOK_SECRETS entry. Disabling does not depend on the secret. An HTTP request already in progress may still complete, and disabling cannot recall data the receiver already got.
- GET /api/webhooks: endpoint settings and enabled status. Only the secret name is returned, never the secret value.
- GET /api/webhooks?endpointId=UUID&page=1: 20 deliveries per page with status, event type, HTTP status, next attempt, attempts in the current round, total attempts and manual retry count. The raw event body is not returned.
- PATCH /api/webhooks: `{action:"retry",endpointId,deliveryId}`. Only a failed job on an enabled endpoint can go back to pending. It keeps the original event ID and is processed by the next scheduled run. Attempts in the current round reset to zero, while total attempts and the manual retry count are kept. pending, sending and delivered jobs do not accept manual retries.

An endpoint's URL, secret name, products and event subscriptions are fixed after creation. To change the destination, disable the old endpoint, then create and enable a new one. The new endpoint receives only new events after it is enabled. Re-enabling an old endpoint resumes its unfinished jobs, but it does not receive events from while it was disabled. To rotate a secret, update the value under the same name in the environment variable, and coordinate verification with the receiver during the rotation.

## Secret names and Quick handout

- `secretName` must match `^[A-Z][A-Z0-9_]{0,63}$`, and the matching value in the `WEBHOOK_SECRETS` JSON must be 64 hex characters (32 bytes).
- Codes taken on the [Quick handout](handouts.md) page are marked as assigned but do not emit `code.assigned` or any other webhook event.
