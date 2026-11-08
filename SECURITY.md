# Security policy

Keydrop stores redemption codes, license keys and payment-related records, so we take security reports seriously.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**. Include the affected version or commit, steps to reproduce and the impact you expect.

We aim to acknowledge reports within a few working days and will keep you updated until a fix is released. We are happy to credit reporters who want to be credited.

## Supported versions

Keydrop is pre-1.0. Security fixes land on the `main` branch; please update to the latest commit before reporting.

## Operator responsibilities

You run Keydrop in your own Cloudflare account. Keep `CODE_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET` and other secrets in Cloudflare secrets (never in `wrangler.jsonc` or git), back up the encryption key, and use separate Stripe test and live configurations.
