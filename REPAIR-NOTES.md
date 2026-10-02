# Speed Fit dashboard repair candidate

Status: local source changes only. Not uploaded, deployed, or tested with a real trainer/client account. This replaces the earlier unsafe `speed-fit-dashboard-fixed.zip`; do not deploy that earlier ZIP.

## Changes

- Restore Firebase email/password login and password-reset support. Retire the email-only custom-token endpoint and the legacy endpoint that could reset passwords from stored profile values or a shared default password.
- Preserve the authenticated UID and email when linking an old profile. Keep existing canonical profile data instead of overwriting it with an old duplicate or Google display name.
- Reject ambiguous duplicate matches and require a verified email for claiming a legacy profile. Provide email verification and retry controls for recovery.
- Do not open dashboards with a missing/unreadable user profile; show a recoverable error. Preserve the authenticated identity when reading a profile.
- Treat populated legacy profiles without the onboarding flag as existing profiles, while still onboarding new/empty profiles and profiles explicitly marked incomplete.
- Do not overwrite an already-assigned trainer ID when another trainer opens their dashboard.
- Remove the forced cache-clearing page reload during sign-in initialization.

The Firebase Authentication skill guided use of Firebase sign-in, recovery, and identity verification instead of an email-only login shortcut.

## Verification performed

- `npm run lint` passed (TypeScript).
- `npm run test:dashboard` passed: 12 isolated regression tests with mocked Firebase. No live database reads/writes in these tests.
- `node build-verify.mjs` passed with production assets and PWA generation. This uses the equivalent Vite settings programmatically; normal Vite config loading is blocked by this machine's sandbox parent-directory permission issue.
- Local API health check returned 200. Both retired authentication endpoints returned 410.
- Local signed-out `/dashboard` redirected to the login screen. Empty-email password recovery showed a validation message without sending an email. No browser console errors on those checks.
- Public URL loaded its login screen. No real trainer/client login or dashboard data synchronization has been verified.

## Before applying to the live app

1. Confirm whether the reported issue is failed login, a missing/blank dashboard, or records not syncing. Capture the actual error without sharing passwords.
2. Confirm the intended database. The supplied old backup uses project `speed-fit-build-to-transform`; the current export uses `gen-lang-client-0529098210`. Both also have different named databases. No database config has been changed or records migrated by this repair.
3. Back up the intended database and test sign-in with one trainer and one client in a non-production environment. Existing trainer-triggered record migration code still needs integration testing; the isolated tests are not a full security audit.
4. Verify Firebase Auth providers, authorized domains, deployed rules, and records in the intended project. File changes alone do not update those cloud settings.
5. Review against any newer edits in AI Studio before importing. Uploading this archive to Google AI Studio requires the owner's explicit approval. No upload has been performed.

The private service-account key included in the original backup must be rotated by the owner. It is not included in this candidate. The Firebase browser configuration is included because the app needs it; it is not a service-account credential.

No live users, passwords, client data, or cloud settings were changed during this repair.
