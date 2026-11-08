# Contributing to Keydrop

Thanks for helping! Bug reports, translations and focused pull requests are all welcome.

## Before you start

- For anything larger than a small fix, open an issue first so we can agree on the approach.
- Keydrop is intentionally a **single-administrator, self-hosted** template. Features that turn it into a multi-tenant hosted service are out of scope.

## Setup

The app lives in `apps/web`. See the [README](README.md#run-locally) for local setup. Use Node.js 24+ and pnpm.

## Making changes

- Run `pnpm run lint`, `pnpm run typecheck` and `pnpm test` in `apps/web` before pushing. CI runs the same checks plus a production Worker build.
- Business rules (limits, stock, ownership) are enforced in SQL triggers and conditional writes, not only in TypeScript. If you change a rule, add a new migration in `apps/web/migrations` — never edit a migration that has already shipped — and add a test that runs against the real migrations (`tests/d1.ts`).
- All UI copy goes into `apps/web/messages/en.json`; add the same key to every other locale file (the English text is an acceptable placeholder until a translator updates it). `tests/messages.test.ts` fails if keys or ICU placeholders drift.
- Components under `src/components/motion` and `src/components/charts` are copied from [beUI](https://beui.dev). Prefer composing them over editing them, so they can be updated from upstream.
- Never commit secrets, real codes or customer data. Local secrets belong in a file outside the repository (see `scripts/create-local-env.mjs`).

## Translations

Improving a translation only needs a change to `apps/web/messages/<locale>.json`. Keep `{placeholders}` and ICU `plural` / `select` structures exactly as in English.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
