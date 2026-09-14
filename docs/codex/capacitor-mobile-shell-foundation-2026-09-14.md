# Capacitor mobile-shell foundation

**Plane:** STEEL-110
**Status:** In progress
**Depends on:** STEEL-29 — native health architecture decision

## Boundary

This foundation adds Capacitor around Steel's existing React/Vite bundle. The
web app remains the canonical and deployable client: `npm run build` continues
to produce `dist/`, while `npm run native:sync` builds that same bundle and
copies it into the tracked native shells.

No HealthKit, Health Connect or other native health plugin is included here.
The shared `src/lib/nativeBridge.js` surface is deliberately inert, so future
first-party bridges have one explicit seam without making device, permission or
health-data calls today.

## Local workflow

From `webapp/`:

1. `npm run native:doctor` checks the installed Capacitor environment.
2. `npm run native:sync` builds the existing web app and copies it to iOS and
   Android.
3. `npm run native:ios` opens the synchronised shell in Xcode.
4. `npm run native:android` opens the synchronised shell in Android Studio.

The native IDEs, platform SDKs and simulators are local developer prerequisites;
they are not installed or configured by the web build.

## Authentication and deep-link hand-off

The current web app uses the production web origin for Supabase email-confirm
and password-reset redirects. This foundation does not alter that behaviour or
the Supabase allow-list.

Before native email confirmation or recovery is enabled, a dedicated follow-up
must register a verified Project Steel mobile scheme and exact callback path in
Supabase Auth, configure the matching iOS universal link / Android app link,
and test cold-start plus warm-start token handling. Do not substitute an
unverified custom scheme or loosen the existing production redirect rules.

## Deferred from this work item

- App Store / Play registration, signing, production bundle identifiers and
  release builds.
- Health permissions, data reads or writes, background sync and provider
  integrations.
- Supabase configuration changes, database migrations and production deployment.
