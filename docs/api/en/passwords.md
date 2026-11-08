# Passwords and account recovery

The administrator manages the account at `/dashboard/security` (from the account menu at the bottom of the sidebar or ⌘K); regular users use `/account/security` (linked from "My codes"). When email is configured, the sign-in screen links to `/reset-password` for forgotten passwords. These pages are not indexed by search engines.

## Display name

The same page has a **Profile** section where anyone signed in can change their own display name (the admin's name appears in the dashboard sidebar). The form calls Better Auth's `POST /api/auth/update-user` with `{"name": "…"}`. A server-side hook in `src/lib/server/auth.ts` trims the name, collapses repeated spaces, and accepts 1–100 characters without control or format characters such as bidirectional overrides; anything else returns 400 `INVALID_NAME`. The same rule applies to the name entered during first-time setup and registration. Avatars are not supported, so writing `image` returns 400 `IMAGE_NOT_SUPPORTED`. The email address cannot be changed here.

## First-time setup and changes

- Account without a password (`POST /api/account/password` with `{"newPassword": "…"}`): the email must be verified, and the session must have been created within the last 15 minutes. If it is older, sign in again first. Enter the new password twice; it must be 12–128 characters.
- Account with a password: enter the current password and the new one. On success, other sessions are revoked, and Better Auth refreshes the current session.
- Better Auth hashes the password. The API does not let you target another user. The first-time setup endpoint requires a same-site Origin, a JSON body and your own valid session. Each account can try at most 3 times per minute, and the endpoint cannot overwrite an existing password.

When an existing account with an unverified email signs in with Email OTP for the first time, Better Auth removes its existing password link and old sessions. This keeps the email owner from inheriting an unknown sign-in method created earlier by someone else. It also applies to a set-up administrator whose email is not yet verified: after the first OTP sign-in, set the password again on the account security page. Do not disable this protection, restore an old password hash directly, or mark the email as verified during setup.

The regular password sign-up page uses a separate email verification flow and keeps the original password after verification. Setting a new password does not turn off OTP sign-in. Before you turn off email, make sure the administrator can sign in with a password.

## Forgotten passwords

1. Enter the account email and request a reset code. The page shows the same message whether or not the account exists. No email is sent for accounts that do not exist.
2. On the same page, enter the reset code and the new password twice. The email clearly says it is for a password reset. Sign-in codes cannot be used to reset a password.
3. On success, all existing sessions become invalid. Sign in again with the new password. A code works only once. Wrong, expired or replayed codes are rejected.

Without an EMAIL binding and EMAIL_FROM, the forgotten-password form is not offered, and the OTP reset endpoint is disabled. Users who know their current password can still change it. Users who cannot sign in must contact the deployment's administrator. The setup secret is not a back door for resetting existing accounts.

For private campaigns, the return destination stays in the URL fragment. After the allowed-path check, it is carried back to the sign-in page. It is never sent to the reset API or the email service.

## Test coverage

The local tests use the real Better Auth handler with SQLite. They cover clearing unverified credentials, first-time setup, rejecting cross-origin, signed-out and stale sessions, races and rate limits, current-password checks, keeping reset codes separate from sign-in codes and single-use, revoking old sessions, and behavior when email is not configured. The tests use a stand-in for email sending, so they do not replace checking real email recovery in your own deployment.

References: [Better Auth Email OTP](https://www.better-auth.com/docs/plugins/email-otp), [Email and password sign-in and reset](https://www.better-auth.com/docs/authentication/email-password).
