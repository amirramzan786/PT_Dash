# Project Steel — Founding 20 in-app founder experience

**Branch:** `codex/founding20-beta-signups`
**Status:** Authoritative implementation spec for later Codex execution.

## Product decision

Project Steel should recognise Founding 20 members inside the app, in **Settings**, with a premium but restrained founder experience.

Founders should receive:
- a visible Founder badge;
- their Founder number, e.g. `Founder #07`;
- a distinct `PREMIUM FREE FOR LIFE` badge;
- a clear membership status showing lifetime founding access;
- an in-app beta feedback channel;
- recognition that feels premium and meaningful without turning Steel into a gamified rewards app.

Merchandise is explicitly **not part of this implementation**. It may be considered later once Steel is generating enough cash to justify it.

## Codex implementation prompt

Implement the Founding 20 in-app founder experience in Project Steel.

Read and treat these documents as authoritative:
- `docs/codex/founding20-product-rules.md`
- `docs/codex/founding20-in-app-founder-experience.md`
- `docs/codex/founding20-analytics-plan.md`

Inspect the existing `AppV3.jsx`, `settings.css`, `steelApi`, Supabase schema, membership entitlements and existing Settings support/feedback flow before changing anything.

Build:
1. A premium Founding Member card in Settings for eligible founders only.
2. Display `Founder #XX`.
3. Display a distinct `PREMIUM FREE FOR LIFE` badge.
4. Membership status must show:
   - Steel Premium
   - £0 — Lifetime Founding Access
   - No payment method required
   - No renewal charge
5. Founder state must come from server-backed founder/allocation + membership entitlement data, never localStorage or hard-coded values.
6. Add a dedicated `Beta Feedback` experience under Settings/Support using the existing feedback structure.
7. Feedback categories:
   - Bug / something broke
   - Confusing / hard to use
   - Feature request
   - Training
   - Nutrition
   - Progress / recovery
   - Other
8. Prompt: `What happened — or what would you change?`
9. Success copy: `Feedback received. Thank you for helping build Steel.`
10. Persist feedback safely in Supabase under the authenticated user with RLS.
11. Add optional context metadata such as current app area/page; do not collect unnecessary personal data.
12. If a founder record exists but lifetime entitlement is missing, show a recoverable support state and do not silently downgrade them.
13. Preserve the existing dark Steel UI. Founder styling should use restrained gold/bronze, premium Spartan treatment, no confetti/gamification.
14. Mobile-first. Do not create a new primary navigation item.
15. Do not build merchandise/rewards infrastructure. Merchandise is a future commercial consideration only.
16. Preserve all existing Settings, account, training, nutrition and authentication behaviour.

Add migrations/API helpers/components as appropriate. Run the webapp build/tests, inspect for regressions, and prepare a PR to `main`. **Do not merge.**

Include screenshots or a concise visual description of the finished Settings founder state in the PR, plus any migration/setup instructions.

## UX intent

The Founder card should feel like a meaningful status reward rather than a generic subscription panel. Preferred copy hierarchy:

- `FOUNDING MEMBER`
- `Founder #07`
- `PREMIUM FREE FOR LIFE`
- `Steel Premium`
- `£0 — Lifetime Founding Access`
- `No payment method required`
- `No renewal charge`

Use Steel's existing dark cinematic visual language with restrained bronze/gold accents and the established Spartan identity. Avoid novelty rewards, confetti, excessive badges, points, streaks, leaderboards or public founder ranking beyond the founder number itself.

## Feedback UX

Location: Settings → Support & feedback.

The existing `Send feedback` area can be extended/replaced with a dedicated beta feedback flow rather than introducing a new primary navigation destination.

Fields:
- category;
- free-text feedback;
- optional app context/page captured automatically where safe;
- authenticated user ID server-side.

Do not require founders to provide personal information that Steel already knows through their account.

Recommended success state:

**Feedback received. Thank you for helping build Steel.**

The experience should be quick enough to submit during normal app use.

## Eligibility rule

Only users with a valid Founding 20 allocation and the corresponding lifetime Premium entitlement should receive the full Founder card and lifetime badge.

The UI must never infer founder eligibility from:
- browser state;
- query parameters;
- localStorage;
- email domain;
- account creation date;
- client-supplied founder number.

If server records disagree, fail safely and surface a recoverable support state rather than silently removing founding access.

## Non-goals

- No merchandise fulfilment.
- No referral rewards.
- No points system.
- No founder leaderboard.
- No social/public profile requirement.
- No paid billing implementation in this work.
- No redesign of the rest of Settings.

## Later consideration

Once Steel is generating sustainable revenue, consider a physical Founder reward such as merchandise for the original 20. This is a future commercial decision and must not create a current contractual promise or entitlement.
