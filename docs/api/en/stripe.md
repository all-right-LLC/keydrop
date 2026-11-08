# Stripe payment integration

Keydrop includes Checkout, webhooks, purchase and order pages, product sales settings, inventory schedules and access review after refunds. Test everything in Stripe test mode before you accept live payments. Rare payment paths, such as every kind of delayed payment method, are not all handled specially; check the ones your customers use.

## Setup

Each deployment connects to one Stripe account. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as Worker secrets. Never put them in the repository, the browser or public environment variables. Free claims and redemption do not need Stripe.

The webhook URL is `https://<domain>/api/stripe/webhook`. Subscribe to at least:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- charge.refunded
- refund.created, refund.updated, refund.failed

Use a Stripe API version compatible with the SDK. Test in test mode first, then set live mode credentials. Do not mix test and live signing secrets.

When Keydrop creates a regular Checkout, it explicitly passes `managed_payments.enabled=false` and `automatic_tax.enabled=false`. This keeps an account default of Managed Payments from changing the seller of record, product tax code requirements and the existing amount checks. Keydrop does not change global Stripe account settings. Managed Payments and tax settlement are not implemented, so you cannot simply turn them on and keep this fulfillment flow. Existing orders keep their original Checkout request snapshot; code updates do not rewrite idempotent parameters that were already sent.

## Sales and claims

The administrator sets `{ "batchId": "batch UUID" }` with `PUT /api/products/<id>/sales`. Pass null to stop sales. The batch must belong to the same product. A product without a sales batch is not opened for purchase just because it has a price.

`POST /api/checkout` accepts `productId` and a UUID `idempotencyKey`. It requires a same-site Origin. The identity comes from the signed-in session or a signed browser cookie. The first anonymous request returns 428 and sets the cookie; retry with the same idempotency key. Do not use a new key, which would create a duplicate reservation.

The server sets the product price, currency, quantity of one and return URLs. It never accepts an amount from the frontend. An order is first reserved for 35 minutes, and the Checkout expires one minute before the reservation ends. After the Checkout is created, the reservation is extended to 3 days after the Session expires (covering Stripe webhook retries), so a last-minute payment or a late webhook does not find the code already released. Abandoned orders are released as soon as `checkout.session.expired` arrives. Async payments (Session completed but funds not yet received) are held for up to 14 days and released on `checkout.session.async_payment_failed`.

Each buyer can have at most 2 unpaid orders created within 35 minutes, and each network (IPv4 address or IPv6 /64) at most 5. Above that the API returns 429 `ORDER_PENDING_LIMIT`, so anonymous requests cannot lock up a whole batch. Creation parameters are saved as a snapshot and use a fixed Stripe idempotency key, so renaming the product later does not affect retries.

Each product uses only its configured currency. Checkout explicitly passes `adaptive_pricing.enabled=false`, so an account default of automatic currency conversion cannot make the charged currency differ from the order checks. Currency conversion within an order is not supported.

Checkout returns `orderId` and the Stripe `url`. A closed session returns a null URL. Both success and cancel return to `/orders/<id>`. That page polls the order every three seconds for up to one minute, and also offers manual refresh and continue payment. Landing on the success page is not proof of payment.

`GET /api/orders/<id>` allows access only from the buyer's session or the original signed browser. After an anonymous purchase, the user can still view the order with the original cookie after signing in. The order does not become an account's order just because the email matches.

## Payments and refunds

Webhooks verify the signature over the raw body with the official SDK's Web Crypto, up to 256 KiB. Event IDs are deduplicated. Processing uses a five-minute lease with a per-lease identifier. On failure, the lease is released so Stripe can retry. Concurrent requests are not treated as completed.

After a notification, Keydrop fetches the Checkout Session and PaymentIntent from Stripe again and checks the order identifier, session, price, currency, successful payment status and amount received. Delayed payments stay unpaid until the success notification, and only then is the code issued.

Refund totals add up only refunds with status succeeded. pending and failed refunds do not count as complete. When inventory runs out and the policy is automatic refund, Keydrop requests a refund of the remaining amount with a fixed idempotency key. A failed or cancelled refund is flagged for manual review by the administrator. After a full refund succeeds, the product snapshot decides whether controllable codes are revoked. External platform codes are only marked as refunded.

If a refund notification arrives before the payment notification, Keydrop also re-reads the latest state from Stripe. A fully refunded order gets no code. An older notification cannot lower the refund amount already confirmed locally.

Amounts are converted as integers. Regular zero-decimal, two-decimal and three-decimal currencies are supported, including the ISK/UGX compatibility units. Amounts that cannot be represented exactly are rejected, not silently rounded. Whether a currency and minimum amount can be charged is decided by your Stripe account.

## Order management and account linking

Available: the purchase page, the order page, sales batch settings, purchased code and device records, and `/dashboard/orders` with paging and filters, Stripe reconciliation and manual fulfillment.

An anonymous order can be linked from the order page with "Link to my account" after signing in from the original browser. `POST /api/orders/<id>/link` checks both the signed-in session and proof of the original purchase browser, and accepts only paid orders not owned by another account. After linking, only that account can view the order; the original cookie alone no longer grants access. An order is never claimed just because the email matches. Built-in entitlements from an anonymous purchase can be redeemed to the account only after linking.

Three inventory shortage policies are available: automatic full refund, manual fulfillment by the administrator after restocking, and automatic delivery to the original order by the Cloudflare schedule after restocking. Unpaid orders that time out are also cleaned up by the schedule. Not every delayed payment method or external platform revocation capability is covered.

For optional email delivery and Stripe Coupon/Promotion Code sync, see the [email docs](email.md) and the [discount docs](stripe-discounts.md).

Official references: [Stripe Node SDK](https://github.com/stripe/stripe-node), [Fulfillment](https://docs.stripe.com/checkout/fulfillment), [Currencies and amount units](https://docs.stripe.com/currencies).

## Checkout promotion codes and amount paid

The product sales settings can turn on `allowPromotionCodes` (off by default), which is passed to Stripe Checkout as `allow_promotion_codes`. The switch is saved in the order's Checkout request together with the other creation parameters. Later product changes affect only new Checkouts.

The order's `amount_minor` keeps the list price. `charged_minor` stores the amount paid as verified with Stripe, and cannot change after settlement. Payment checks cover the list subtotal, discount, total, currency and Session/order ownership. Tax and shipping are not enabled; non-zero tax or shipping blocks automatic settlement. Orders with a positive amount must still match the PaymentIntent's success status, the order metadata and the amount received. Refunds use the amount paid as the full-refund threshold and can never exceed it.

A 100% discount is delivered only when the Session is `complete`, its payment status is `paid` or `no_payment_required`, the total is zero and there is no PaymentIntent, with the original subtotal and a full discount verified. Zero-amount completed orders in a real Stripe sandbox may return `paid`. Following [Stripe's no-cost orders guide](https://docs.stripe.com/payments/checkout/no-cost-orders?ui=full-page), these orders are handled through the Checkout completed event and do not rely on a PaymentIntent. Zero amount is not a refund. If the shortage policy is refund, the order moves to manual handling because there is no payment to refund. The manual and restock policies work as usual.

The consumer order response's `amountMinor` shows the amount paid (or the list price before settlement), and `listAmountMinor` keeps the list price. Refund events include both amounts. The sales settings PUT accepts `{batchId,allowPromotionCodes}`. Omitting the switch keeps the current setting.

By default, Checkout uses inline product data. In the sales settings you can enter a valid Product ID from the same Stripe account and mode, to use Coupons restricted to that product. Keydrop still uses its own price snapshot; the Stripe product does not set the amount. Before creating a Checkout, Keydrop checks that the source product is still active. The product link is also fixed in the request snapshot, so retries do not follow later setting changes. Stripe decides applicability, customer eligibility and redemption counts. Verify this in Stripe test mode in your own deployment.

The sales settings PUT also accepts `stripeProductId` (a `prod_` ID or null). Omitting it keeps the current setting, and null clears it. The format is validated on save. At checkout, the same Stripe client reads the product. If it does not exist, is deleted, is inactive, belongs to another account or cannot be accessed, Checkout creation is rejected with 503 `STRIPE_PRODUCT_UNAVAILABLE`. The link never creates or changes products in Stripe.

## Partial refunds and manual access review

When a delivered order receives a successful partial refund, the order dashboard shows "Review refund access". The administrator enters a review note of at least 10 characters, then confirms one of these decisions:

- Keep access: keeps the current access and only resolves the pending flag for this cumulative refund amount. Later refunds still follow the original product snapshot.
- Revoke access: revokes this order's access. A unique code is revoked itself. A shared code does not affect other holders. Matching redemptions are reclaimed under the original reclaimOnRevoke rule; consumed parts still need checking. External entitlements only get a revocation job for the original grant; this does not guarantee the receiver has reclaimed it.
- Acknowledge review: for external platform codes or already revoked orders, only acknowledgement is allowed. For external codes such as App Store codes, check the platform status yourself first. This does not invalidate the external code and does not restore revoked access.

Review never creates, cancels or changes Stripe refunds. Orders that are undelivered, have a failed refund or are still waiting for a refund do not offer these access decisions; resolve the payment or fulfillment issue first. The dashboard shows the current revocation status and the latest review's administrator, time, reviewed amount and note. The full history is stored in order_refund_reviews.

POST /api/admin/orders/{id} accepts action=review-refund, refundedMinor (the cumulative successful refund integer when the page loaded), decision (retain/revoke/acknowledge), note (10–2000 characters) and a UUID idempotencyKey. It allows only an administrator session and a same-site Origin. The administrator identity comes from the session.

In one transaction, the database checks the refund amount, pending status, delivery and code status, writes the record and applies the decision. If reclaiming entitlements fails, everything rolls back. Each order and refund amount allows only one decision. The same idempotent request returns the original receipt. The same key with different content, a stale amount or an already handled decision returns 409. A new successful refund amount triggers the original refund rules again. Replaying an old receipt cannot clear a new pending flag.

Verify other reclaim scenarios against your own deployment's configuration.
