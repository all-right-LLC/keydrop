# Email delivery

Email is optional. Without it, free code claims, password sign-in and regular redemption still work. Sending uses Cloudflare Email Sending; before going live, send sign-in codes, code emails and alerts from your own domain and confirm they arrive and that SPF, DKIM and DMARC pass.

## Email language

Every email goes out in the recipient's interface language. Sign-in and password-reset codes use the language of the page that requested them. Code emails and administrator alerts use the language the account last used (`user.locale`). Anonymous code emails and administrator email distributions use the language of the request that created them. When no language is known, emails are in English. See [Interface languages](customization.md#interface-languages).

## Cloudflare setup

The Cloudflare Email Sending Workers API supports a structured `send({to,from,subject,text})` call and returns a messageId. The provider accepting a message does not mean the recipient received it. See the [official Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/).

After you verify your sending domain, add `"send_email": [{"name":"EMAIL"}]` to wrangler.jsonc, set EMAIL_FROM to the verified sender address in your environment, and run `pnpm run cf-typegen`. Before you send to arbitrary recipients, confirm that your Cloudflare account has Email Sending enabled with the required sending permissions. The older Routing setup, which only allows verified destination addresses, is not enough to send to general customers.

Use a dedicated sending subdomain. This setup does not require you to point the MX records of your existing inbox at Cloudflare. Do not break your current inbound mail setup to add sending.

## Self-service code email API

POST /api/code-email uses the signed-in session and a same-site Origin. The JSON body is codeId and idempotencyKey (UUID). Each account can make up to 5 requests per minute. The code must be one the user has claimed or purchased, the account email must be verified, the code must not be revoked or expired, and the product must not be archived. Arbitrary recipient addresses are not accepted.

A 202 response with the job id/status means the job is queued. It does not mean the email was delivered. A retry with the same account and idempotency key returns the original job. Reusing the key for a different code is rejected. The mail queue stores only the code identifier, never the raw code or a copy of the email address. Before sending, Keydrop rechecks ownership, validity and the current verified email, then decrypts the code just in time.

A schedule runs every five minutes and handles up to 10 emails. Each send waits at most 10 seconds. A failed send is retried after five minutes and stops after five failures. If the code or eligibility is no longer valid, the job is cancelled. A job interrupted mid-run can be taken over once its 60-second lease expires. The email provider does not promise end-to-end idempotency. After a timeout or crash, a retry may send the same code twice, but it never allocates new inventory. sent means the provider accepted the message, not final delivery.

The My codes page has a send button and status display. GET /api/code-email?id=UUID lets only the owner check a job's status.

## Automatic code emails

When EMAIL, EMAIL_FROM and CODE_ENCRYPTION_KEY are all set, the five-minute schedule first queues up to 25 jobs from committed claims and delivered orders, then sends up to 10 emails under the rules above. A backlog delays sending; immediate delivery is not guaranteed. Without an email service, nothing is queued automatically, and site claims and payment delivery are unaffected.

Automatic emails currently go only to holders who are signed in with a verified email. After a user verifies their email, the next run picks up their codes. When you first enable email sending, existing valid holdings are also queued. Anonymous claims and guest orders not linked to an account never treat a self-entered email as a verified recipient.

Each account and code is queued automatically only once. Different holders of a shared code each receive their own email. Re-running the schedule or an interrupted run does not create extra jobs. Cancelled jobs and jobs that failed five times also keep their dedupe record; the user must resend manually from My codes. Orders with a partial or full refund whose access was not revoked still count as holdings. Codes whose access was revoked, or that expired or were archived, get no new automatic jobs. Eligibility is rechecked before sending.

## Linking a guest claim to an account

After a successful anonymous claim, the user can choose "Save to my account". After signing in and verifying their email in the same browser, they return to the claim page and repeat the action. This adds the existing claim to the account. It does not allocate a new code or increase the campaign's claim count. The code then appears in My codes. If the user did not ask for an anonymous email copy, the automatic email rules above apply. If an anonymous email job already exists, linking does not send another one automatically. Without sign-in and a verified email, the original anonymous claim still works.

POST /api/claims/{claimId}/link requires a same-site Origin, a signed-in session, a verified email in the database, and the signed browser cookie that was valid at claim time. The request cannot name an account or recipient email. A missing or forged cookie does not create a new identity that can take over the old record. The first link uses a conditional update, so other accounts cannot overwrite it. Resending from the same account creates no new record. API keys and MCP cannot link on a user's behalf.

After linking, the anonymous browser/IP campaign limits stay in place, and later claims from the account count toward that record. Linking also respects the campaign's per-person limit. If the account already holds the limit, linking returns 409 `CLAIM_LINK_LIMIT_REACHED`. The record stays anonymous and is still available in the original browser. Recovering emailed codes skips campaigns where the limit is reached. Only the linked account can view the original result. After signing out of the original browser or switching accounts, the linked record cannot be read. This does not invalidate a code the user has already copied. Do not treat linking as revoking or rotating a code.

Public campaigns also support the anonymous email copy and verified-email recovery described in the next section.

## Optional email copy for anonymous campaigns

After a claim on a public campaign, if the deployment has email configured, the user can choose "Email a copy of this code". The code is still delivered on screen. Entering an email does not verify it and cannot satisfy campaign eligibility rules such as a specific email or domain. The request does not create a second claim, inventory allocation or user account.

`POST /api/claims/{claimId}/email` requires a same-site Origin, the original signed browser cookie, a trusted IP and `{"email":"recipient@example.com"}`. A new job can be created only while the anonymous claim is not linked to an account. userId, codeId and arbitrary job identifiers are not accepted. A 200 response with `{job:{id,status,attempts}}` is the claim's send record, not proof of delivery. Without email configuration, the API returns 503 and creates no job.

Each claim can have at most one send job. The recipient address is lowercased and stored encrypted, with an HMAC index for deduplication. Unverified emails are never written to claims.email. Resending the same address reuses the original job. A different address returns 409. A failed send cannot change the recipient or allocate a new code. Make sure the address is correct before submitting. The user can still keep the original code.

Each recipient address is limited to 5 per hour, and each original claim IP to 10 per hour. The database checks this atomically on insert. Only the existing IP HMAC is kept; no new plaintext IP is stored. The HTTP layer also applies the claim rate limit of 30 per minute per IP and returns 429 above that. Reusing an existing identical job does not count against the hourly limit.

`GET /api/claims/{claimId}/email` lets only the holder in the original browser read `{job:null}` or the job id/status/attempts. It never returns the recipient address, index or code. If the claim is linked to an account, the user must also be signed in to that account. API keys and MCP agents get no access to this endpoint. All responses are no-store.

The five-minute schedule handles up to 10 anonymous code emails, separate from the other mail queues. Each send waits at most 10 seconds and retries after five minutes, up to 5 times. A job can be taken over when its 60-second lease expires, and it stops after the fifth interruption. Each attempt rechecks the code, product and Stripe source. Invalid jobs are cancelled, but the original claim is not released. A job is marked sent only when the provider accepts it, which is not final delivery. A timeout may send the same code twice, but a new code is never allocated.

A claim with an email copy can be linked only to an account whose verified email is the original recipient. The user can sign in on another device, verify that email, and press "Find my emailed codes" in My codes. The existing `POST /api/email-distributions/link` recovers both administrator distributions and anonymous claims, up to 100 in total. It keeps the original anonymous subject/IP, slots and code. It does not move records that are already linked, and recovery does not trigger another automatic email. If a job failed, the user can recover it with their verified email and then resend with the regular self-service code email.

Test real delivery and email verification in your own deployment. A local email stub does not prove that sending works.

## Administrator email distribution

The "Email selected code" action in the code library assigns a code to a given email address. The recipient does not need to register first, and no account is created for them. This is separate from assigning to an existing account. The administrator must check the address, because the email contains the code. After the recipient signs in and verifies the same email, they can press "Find my emailed codes" in My codes to link the distribution. Shared license keys must be linked this way before the account can activate devices.

POST /api/email-distributions accepts productId, codeId, email, note and idempotencyKey. It requires an administrator session and a same-site Origin. New distributions are rejected when Email Sending, the sender address or the encryption key is missing. A 202 response with id/status means only that the email is queued. Resending the same request reuses the original record. The recipient address is encrypted, and the dedupe index uses an HMAC. Different content cannot share an idempotency key.

GET /api/email-distributions?productId=UUID&page=1 returns 25 records per page plus enabled. Only administrators can decrypt and view recipient addresses. Results never contain plaintext codes. The five-minute schedule handles up to 10 direct distribution emails, separate from the signed-in user queue. Each send waits at most 10 seconds, retries after five minutes and stops after five attempts. sent means the provider accepted the message, not delivery.

PATCH on the same endpoint accepts productId, id (distribution UUID), idempotencyKey and note (at least 10 characters). Manual retry is allowed only for failed jobs whose code is still valid. It keeps the original recipient, code and distribution ID, resets the attempts for this round, keeps total_attempts, increments retry_count and writes an administrator review record. Resending the same retry request does not reset the job again.

An email may have been sent before a timeout, so failed or cancelled jobs never release the code to other recipients. A retry may send the same code twice. Verify real Cloudflare sending in your own environment.

### Recipient recovery and linking

POST /api/email-distributions/link requires a signed-in session and a same-site Origin. It does not accept a recipient email or user ID. The server reads the current verified email from the database, matches the recipient HMAC, and links up to 100 unlinked records to the account per call. It returns the linked count. The call can be repeated. It does not allocate inventory and does not create new automatic email jobs.

After linking, My codes shows "Distributed by email" and supports redemption, device management and self-service resend. Linking keeps its timestamp. A linked record cannot be moved to another account. The original distribution email still goes to the address the administrator entered; it is not rewritten if the account changes its email.

## Site links in emails

Code emails use the APP_URL setting to build a My codes link. The URL never contains the code, email or sign-in credentials. Direct email distributions also include instructions to sign up or sign in with the original recipient email, verify it and recover the records. When siteFeatures.myCodes is off, the link points to the home page instead of a disabled page. A missing or invalid site origin means no link is inserted. You must still set APP_URL correctly during setup.

For signed-in account code emails, a job interrupted on its fifth attempt is marked failed once its lease expires, and later runs do not take it over. The same limit applies to administrator direct distribution emails.

## Administrator event alerts

`/dashboard/notifications` is the administrator notification center, with 25 items per page and tabs for open and resolved items. It explains explicit rejections, unknown grant results and external revocations separately. Unknown grant results link to the manual review page. Explicit rejections no longer point to a page that lists only unknown-result operations. When the user retries successfully or the administrator finishes a review, the original notification is resolved.

`siteFeatures.adminNotificationEmail` is on by default. When EMAIL, EMAIL_FROM and a valid APP_URL are set, and the administrator email in the installation record is verified, each run queues up to 25 unresolved notification versions and sends up to 10 emails. Before sending, Keydrop re-reads the current administrator and their verification status. It never uses an arbitrary configured address. If this feature is off or email is not configured, notifications are still kept in the dashboard.

Each notification occurrence is deduplicated on its own. The same version is not recreated, but a new failure count can create a new alert. If the notification is resolved or replaced by a newer version, or the administrator loses verification before sending, the old job is cancelled. A cancelled or failed version is not recreated automatically. Treat the dashboard as the source of truth.

The email contains only the event type, the operation ID and a link to the notification center (sign-in required). It never contains codes, product names, customer emails or external error bodies. Each send waits at most 10 seconds, with at least five minutes between failures, up to five times. A job can be taken over when its 60-second lease expires, and it stops when the fifth lease expires. A job is marked sent once the provider accepts it, which is not delivery. Timeouts or interrupted runs can still cause duplicate emails; exactly-once end-to-end delivery is not guaranteed.

Verify these alerts with real Cloudflare Email Sending in your own deployment.
