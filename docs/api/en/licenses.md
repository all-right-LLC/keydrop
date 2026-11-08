# Online software licenses

Create a code batch of type `license` and set the device count and, optionally, a fixed expiry date (`expiresAt`). With a unique code, holding the code is enough to activate. A shared code also requires a named holder relationship, and the device limit is counted separately for each account. Treat both license keys and activationToken as credentials. A device ID by itself is not proof of a license.

## Common endpoint

POST `/api/licenses` with Content-Type `application/json`. Native apps or servers can omit Origin. Browsers are accepted only from this instance's Origin. Each IP can make at most 30 requests per minute; above that, it gets 429. Never write requests or responses to your product's logs.

Activate:

```json
{"action":"activate","input":{"productId":"product UUID","code":"license key","deviceId":"stable device ID from your product","label":"device name the user recognizes"}}
```

The response contains `activationId`, `activationToken` and `expiresAt`. Retrying with the same device returns the same valid credential. The maximum device count is checked inside a database transaction. The raw device ID is used only to compute an HMAC and is not stored in the database. Credentials are stored encrypted, with a separate digest for validation.

Validate or release:

```json
{"action":"validate","input":{"productId":"product UUID","activationToken":"token returned by activate","deviceId":"same device ID"}}
```

`validate` returns `valid`, `activationId` and `expiresAt`. Change the action to `release` to unbind the device. You must provide the correct product, credential and device ID together. A device ID alone cannot release a device. Activating again after a release issues a new credential, and the old one stops working.

Revoking the code, expiry, releasing the device or archiving the product makes validation fail. After a code is restored, existing devices that were not released and have not expired become valid again. This is online validation and gives no offline license guarantee. Your product should choose a sensible re-validation interval and how to handle temporary offline use.

## Web holders and administrators

Users who claimed a code while signed in can view and release its devices in "My codes". Call DELETE `/api/license-devices` with the body `{ "activationId": "UUID" }`. It must pass session and Origin checks. A regular user must be the claiming holder of that code. The administrator can release any device. An anonymous claim is not transferred to a signed-in account automatically. Its devices can still be released with the device credential in the product.

For a shared code, the device list and self-service release are based on each device's own account. Two people holding the same code cannot see or act on each other's devices. The administrator, or a product-scoped API token with licenses:manage, can list and release devices within its scope.

## Activating shared codes

A shared license campaign requires claiming with a signed-in account. Even if the campaign was set to anonymous mode, the public page still says sign-in is required. A guest buyer can purchase first, then sign in on the order page in the original browser and link the order. Only a signed-in account with a valid claim or purchase can activate. Knowing the shared code is not enough.

Integration options:

1. Same-site session on the Keydrop site: call activate on `/api/licenses` as above. The server takes the account from the Better Auth session. input does not accept userId.
2. Delegation from your product backend: call POST `/api/v1/operations` with an API key stored on your server that has licenses:manage and product permission. Send `{action:"licenses.activate",productId,userId,code,deviceId,label}`. Your backend must first verify its own user and map it to a Keydrop account. Never put the backend token in a client, and never accept an unverified userId.
3. The MCP tool `activate_license_device` takes the same input and also requires mcpWriteEnabled. It returns an activationToken, so keep agent and tool logs confidential.

Without a valid holder relationship, the response is LICENSE_OWNER_REQUIRED. After activation succeeds, a native product can call validate/release with activationToken plus deviceId. It does not need to keep a sign-in session or an admin token. The same device ID under different accounts forms separate bindings and credentials. The device HMAC uses clearly separated account, code and device data.

On a full refund with revocation turned on, an account that loses its last valid holding source has its devices released. Other holders are not affected. If the account still has a free claim or another valid purchase, its devices are kept. If the account regains holder status after a refund and activates again, a new token is issued, so the old token cannot come back to life through a repurchase. Existing devices on unique codes do not need to be bound to an account later.

## Device management in the dashboard

The License devices entry on the product page shows a paged device list, up to 50 per page, which you can filter by Code ID. Desktop uses a table, and narrow screens use cards. It shows the device label, activation ID, code ID, named account (if any), binding and code status, and last activation time. It never returns the raw device ID, device hash or activation credential.

GET `/api/admin/license-devices?productId=UUID&page=1&codeId=UUID`. codeId is optional. Only an administrator session can call it. The response contains devices, page and hasMore, and must not be cached.

DELETE on the same endpoint takes the JSON `{ "productId": "UUID", "activationId": "UUID" }`. It requires an administrator session and a same-site Origin, and the product and device must match. Resending the same release keeps the original release time. The interface asks you to confirm the device and refreshes the list on success. A release invalidates only that device's activation credential. It does not revoke the code or affect other devices. If the code is still valid and has free slots, the holder can activate again and get a new credential.

## Limits

Requests to the license endpoint must be JSON and at most 4 KiB. Keydrop identifies the caller by the `cf-connecting-ip` header that Cloudflare adds; if it is missing (for example when the Worker is called without Cloudflare in front), the endpoint returns 503 `LICENSE_IDENTITY_UNAVAILABLE`.
