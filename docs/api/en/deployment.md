# Deployment and backups

This document goes with the [Web setup guide](../../../apps/web/README.md). It covers deploying Keydrop to your own Cloudflare account, its settings, D1 backups, restore drills and scheduled jobs. Verify the flows you rely on in your own environment before going live.

## Deployment settings

`apps/web` is a standalone app. It contains package.json, the lockfile, SQL migrations, the Wrangler configuration and a template with the required secret names. The deploy button's source URL should point to `tree/main/apps/web` in the public repository. The repository the button creates uses that subdirectory as its root and does not include the outer docs.

| Setting | Purpose |
| --- | --- |
| APP_URL | Production HTTPS origin without a trailing slash; used for sign-in, same-site checks and email links |
| ADMIN_EMAIL | Email of the only administrator, created during setup |
| BETTER_AUTH_SECRET | Sign-in, tokens and holder index; at least 32 characters; keep it long term |
| SETUP_SECRET | One-time setup credential; at least 32 characters; after setup succeeds, no second administrator can be created |
| CODE_ENCRYPTION_KEY | 64 hexadecimal characters; protects codes and recipient addresses; keep it long term |
| DB | D1 binding name; you can rename the database, but do not remove this binding |

Optional settings turn on extra features. Add them as Worker secrets (or bindings) when you need them:

| Setting | Type | Purpose |
| --- | --- | --- |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | secret | Paid sales through Stripe Checkout; see [Stripe checkout](stripe.md) |
| STRIPE_SYNC_BATCH_SIZE | var | How many Stripe discount objects each sync run handles; see [Stripe discounts](stripe-discounts.md) |
| EMAIL binding + EMAIL_FROM | binding / var | Cloudflare Email Sending for sign-in codes, code emails and admin alerts; see [Email delivery](email.md) |
| WEBHOOK_SECRETS | secret | Signing secrets for outgoing webhooks; see [Event webhooks](webhooks.md) |
| ELIGIBILITY_SECRETS | secret | Bearer tokens for your eligibility endpoints; see [External eligibility](eligibility.md) |
| EXTERNAL_REWARD_SECRETS | secret | HMAC keys for external reward receivers; see [External entitlements](external-rewards.md) |

Generate each required secret separately. Do not reuse example values, and do not change the encryption key or identity index secret on a whim. The settings template contains only names. Keep real values in a private secret manager and in Cloudflare Secrets.

`pnpm run deploy` applies remote migrations after the build succeeds and before publishing. Migrations target `DB` and do not depend on the database name you chose. Migrations that already ran are not run again. The deploy script syncs `WORKER_SELF_REFERENCE` with the Worker name and regenerates types.

[Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fall-right-LLC%2Fkeydrop%2Ftree%2Fmain%2Fapps%2Fweb) creates a private copy of the source, a new D1 database and a Worker. The deployer fills in APP_URL, the administrator email and the three separate secrets. The administrator password is set after deployment, on the `/setup` page.

## Separating local and production

Locally, `pnpm run db:migrate` touches only the simulated D1 in `.wrangler`. In production, `pnpm run db:migrate:remote` touches the remote DB that Wrangler points to. Do not copy production secrets or production data into public fixtures. Test new versions with a separate database, Stripe test account settings and sender settings.

`pnpm run preview` uses the Workers runtime. `pnpm dev` uses the Next.js dev server. Passing local tests with the former still does not replace remote verification.

## Data backups

Run this from the Web root and write the output to a private directory. The export contains accounts, emails, orders and encrypted data. Never commit it to Git.

```sh
pnpm exec wrangler d1 export DB --remote --output /absolute/private/keydrop-backup.sql
```

Back up the deployment's secrets and external service settings separately; the SQL does not include Cloudflare Secrets. Record the code version, migration version, backup time and source database ID. If you need a consistent business snapshot, first stop site writes, scheduled jobs and external event handling, and confirm that no issuance or payment is in progress. Then back up.

## Restore drills

The preparation tool has its own tests: run `pnpm run test:restore` (Python 3) after changing it.

Never overwrite the production database directly. First create a separate empty D1 database and point DB in an isolated test configuration at it. Use the Python 3 preparation tool to build a new import file, then import it:

```sh
python3 scripts/prepare-restore.py /absolute/private/keydrop-backup.sql /absolute/private/keydrop-restore.sql
pnpm exec wrangler d1 execute DB --remote --file /absolute/private/keydrop-restore.sql
```

Stop writes and scheduled jobs on the source site first, then import the latest backup into a new empty D1 database. Compare table row counts, schema objects, the migration history and the number of codes and claims, run SQLite's foreign key and integrity checks, and use the original secrets to confirm that sample codes and device credentials decrypt correctly.

Keydrop's foreign keys may point to tables that come later in the export. Importing the raw Wrangler SQL directly fails with "no such table". The preparation tool first lists every CREATE TABLE, then keeps the data inserts in order, and finally restores indexes, views and triggers, so loading data does not fire issuance, payment or ledger side effects. It does not run SQL, does not modify the original file, does not overwrite an existing output, and refuses unsupported statements. Use it only on Wrangler exports you trust.

A full SQL backup already contains the schema and the migration history. Do not apply all migrations to the empty target before importing. Use the original code version and its secrets, and check administrator sign-in, decryption of the original codes, holder records, the credit ledger and device ownership. Keep Stripe, email, webhooks and scheduled jobs disabled in the drill environment, so pending work in the backup does not replay external actions. Plan the production cut-over and reconnect external services only after every check passes.

Rolling the database back to an earlier point does not roll back Stripe payments or external entitlements. Before a cut-over, reconcile all external events after the backup time. For Cloudflare Time Travel retention and limits, see your account plan.

To rehearse a cut-over, temporarily bind an isolated Worker to the restored database with the original code and secrets. Give it no external integration secrets, remove the email binding and disable scheduled jobs, so the rehearsal cannot send email or call your services. Such a test does not cover disaster-recovery reconciliation of external events that happened after the backup. A production cut-over still requires checking external state as described above.

References: [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/), [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

## Scheduled jobs

On each Cron trigger, the Worker runs these jobs in order: Stripe discount refresh, external operation isolation, order maintenance (release expired reservations, issue codes after restock), administrator notification emails, code email queuing and sending, email distribution, guest code emails, outgoing webhooks, and external revocations. Each job isolates its own errors. If one job fails (for example, a malformed `EMAIL_FROM` or a temporarily unavailable external service), Keydrop logs only the job name and error message, and the following jobs still run. After all jobs finish, the run is marked as failed, so you can see `scheduled task <name> failed` in the Cron events and Workers Logs in the Cloudflare dashboard.
