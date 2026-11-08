# Quick handout

Quick handout lets the administrator give codes on a phone to people without a Keydrop account, and record who received them. For example, you can send App Store promo codes to testers or press over WeChat or LINE. The page is at `/dashboard/handout`. You can open it from "Quick handout" in the sidebar, the ⌘K command palette and the console home.

## Flow

1. Pick a product and a batch (or "Any batch"). The selection is stored only in this device's browser.
2. Click **Take a code**. The server atomically picks one available unique code (from a `unique` batch). **Once taken, the code counts as handed out**, and its status changes to `assigned`. Two devices working at the same time never get the same code. The code that expires soonest is picked first, and expired codes are skipped.
3. Tap the code to copy it. Phones with system sharing also get a **Share** button. **Share as image** creates a share image (see below).
4. Recipient, channel (WeChat, LINE, X, Email, Telegram, In person) and note can all be left empty and filled in later in the handout log.
5. If you gave the wrong code, click **Return to inventory** twice to withdraw it. If the code has not been redeemed, claimed or sold, it goes back to available. A revoked code stays revoked. A withdrawn record can no longer be edited.

Only unique codes can be handed out. Keydrop never picks shared codes (`shared`), codes that are claimed, sold or assigned, codes that are currently reserved, codes from a disabled Stripe source, or codes with an external redemption in progress. Handouts share the same inventory as campaigns and sales, so a handed-out code cannot be claimed again.

## Share images

There are three templates: Paper (paper white with grid lines), Midnight (dark gradient) and Ticket. The output is a 1080×1350 PNG. You can add a one-line card message, and "Redeem before …" appears automatically when the code has an expiry date. The image is drawn in the browser with canvas, and **the code is never uploaded to any server**. **Save image** downloads it directly. **Share image** opens the system share sheet (on iOS, pick "Save Image" in the sheet to save it to Photos), and falls back to a download when sharing is not supported.

## Product icons

Each product can have an icon (product **Settings → Product icon**). The browser crops the chosen image to a centered square and resizes it to 256 × 256, then uploads WebP (PNG or JPEG when WebP is unavailable). SVG, GIF and AVIF are converted to a bitmap in the browser first, so the server only ever stores PNG, WebP or JPEG. The server checks the file header against the declared type, requires 32–1024 px per side and at most 256 KB, and stores the image in D1 (`product_icons`, migration `0045`); `products.icon_version` changes on every upload.

The icon appears on all three share-image templates (top left on Paper, centered above the title on Midnight, on the top edge of the Ticket), in the product list and product header, in the Quick handout result and log, and on the public buy and redeem pages. Share images still render without an icon if it fails to load.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products/{id}/icon?v={version}` | Public. Served with `X-Content-Type-Options: nosniff` and a `default-src 'none'; sandbox` CSP. Cached for a year when `v` matches the current version; supports `If-None-Match`. 404 when the product has no icon. |
| `PUT` | `/api/products/{id}/icon` | Administrator, same-site Origin. The body is the image itself with `Content-Type: image/png`, `image/webp` or `image/jpeg`. Returns `{version, type, width, height}`. 400 `INVALID_IMAGE`, 413 `IMAGE_TOO_LARGE`, 404 `PRODUCT_NOT_FOUND`. |
| `DELETE` | `/api/products/{id}/icon` | Administrator, same-site Origin. Removes the icon (204). |

## Add to Home Screen

The page provides `public/handout.webmanifest` (`start_url` is `/dashboard/handout`, opens full screen) and Apple Web App settings. Android/Chrome shows an install button. iOS Safari shows instructions for "Share → Add to Home Screen". The icons are static files in `public/icons/` (the Keydrop "k." mark); replace them with your own brand.

## API (administrator session, same-site Origin required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/handouts` | Take a code. `{productId, batchId?, idempotencyKey, recipient?, channel?, note?}`. Resending the same `idempotencyKey` returns the same record and takes no extra code. Returns 409 `HANDOUT_UNAVAILABLE` when no code is available. |
| `GET` | `/api/handouts` | Handout log, 20 per page. Accepts `productId`, `query` (searches recipient, channel and note), `missingRecipient=true` and `page`. Includes the raw code and is not cached. |
| `PATCH` | `/api/handouts/{id}` | Update `{recipient, channel, note}`. An empty string clears the field. Returns 404 for a withdrawn record. |
| `DELETE` | `/api/handouts/{id}` | Withdraw. |

Every response has `Cache-Control: no-store`. Handout records are stored in `code_handouts` (migration `0043`). Database triggers ensure that only the set-up administrator can hand out codes, that a code has at most one active handout at a time, and that the code and the person who handed it out cannot be changed.
