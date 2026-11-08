# External eligibility

A campaign's `external` condition uses an integration ID. The deployer first registers it in `apps/web/src/custom/eligibility.ts`, and then the administrator enters that ID in the campaign conditions. Visitors and the campaign API cannot specify a URL.

## HTTP endpoints

Add an entry to `eligibilityEndpoints`:

```ts
partner: {
  url: "https://api.example.com/keydrop/eligibility",
  secretName: "PARTNER",
  shareEmail: false,
}
```

Register only production HTTPS domains that you control. IPs, internal hosts, non-standard ports, URL credentials, queries and fragments are not supported. `shareEmail` is off by default. Even when it is on, only verified emails are sent.

If you set `secretName`, put a JSON object that maps names to Bearer tokens into the Worker's `ELIGIBILITY_SECRETS` secret. Enter it interactively with `pnpm exec wrangler secret put ELIGIBILITY_SECRETS`, so the real key never ends up in the project or your shell history. For local settings, point `KEYDROP_DEV_ENV_FILE` at a secrets file outside the repository as usual.

The request is a POST with a JSON body containing `version: 1`, `campaignId`, `productId` and `identity`. The identity contains `emailVerified` and, when the visitor is signed in, `userId` (anonymous and email-verification campaigns may have no `userId`). `email` is added only when `shareEmail` is on and the email is verified. Code hooks are different: they run inside your deployment and always receive the actor's `email` together with `emailVerified`, whatever `shareEmail` says. Keydrop never sends the IP, browser identifiers, passphrases, invitation secrets or survey answers.

A successful response must be HTTP 2xx with `application/json`:

```json
{"allowed": true, "reason": "optional, up to 500 characters"}
```

`allowed` must be a boolean. The reason is never shown to the visitor directly. Responses can be at most 16 KiB. Redirects, malformed responses and extra fields are rejected. The whole condition check has a default limit of 3 seconds. Network, DNS or integration errors return a retryable "eligibility temporarily unavailable" result, and no code is issued. Your endpoint should be read-only and safe to retry. Do not charge money or consume entitlements during an eligibility check.

## Code hooks

Register an async function in `eligibilityHooks`. It receives `campaignId`, `productId`, a minimal identity `actor` and `signal`, and returns `{ allowed: boolean }`. The hook must honor the abort signal. It gets no raw IP or browser identifiers. Hook IDs and HTTP endpoint IDs must not overlap.

## Network boundary and verification

Before sending, Keydrop checks the A/AAAA records and refuses if any address is not public. It does not follow redirects. The DNS pre-check and the fetch are still two separate steps, so the pre-check does not pin the connection address. Register only endpoints that you control and whose DNS you trust. Do not offer an interface for editing arbitrary third-party URLs.

`global_fetch_strictly_public` gives public-routing semantics. It alone is not full SSRF protection. For a production deployment, also verify the DNS and fetch behavior in your actual Workers environment. Official docs: [DNS API](https://developers.cloudflare.com/workers/runtime-apis/nodejs/dns/), [Fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch/).

Explicit HTTP denials, timeouts and denials from a code hook do not create a claim or consume inventory. After all conditions pass, exactly one code is delivered, and reloading the success page does not call the eligibility endpoint again or create a second claim. Verify your own hooks, domains and proxy setup before relying on them.
