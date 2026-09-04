# Project Steel — Alpha 20 Codex Master Execution Brief

**Branch:** `codex/founding20-beta-signups`  
**Purpose:** One authoritative execution brief for implementing the complete Alpha 20 foundation in one coordinated Codex run.  
**Delivery rule:** Prepare a PR to `main`. **Do not merge. Do not deploy production. Do not apply production migrations without explicit human approval.**

---

## Paste this into Codex

Implement the complete Project Steel **Alpha 20 launch foundation** on branch `codex/founding20-beta-signups`.

Do not begin by coding blindly. First inspect the current repo, existing Steel app architecture, Supabase migrations/functions/schema conventions, `AppV3.jsx`, `AuthGate.jsx`, `settings.css`, `steelApi`, current membership entitlement handling, existing feedback/support code, and any version-controlled marketing-site source.

Then read the authoritative documents below **in this order** and treat them as the product contract for this implementation:

1. `docs/codex/founding20-product-rules.md`
2. `docs/codex/founding20-beta-signups.md`
3. `docs/codex/founding20-email-journey.md`
4. `docs/codex/founding20-in-app-founder-experience.md`
5. `docs/codex/founding20-analytics-plan.md`
6. `docs/codex/founding20-beta-feedback-framework.md`
7. `docs/codex/alpha20-commercial-gate.md`
8. `docs/codex/alpha20-launch-runbook.md`

Also use existing repository conventions and GitHub issue #2 as implementation context.

### Conflict precedence

If documents appear to conflict, use this precedence:

1. `founding20-product-rules.md` for Founder allocation, entitlement, scarcity, account-linking and campaign rules.
2. `founding20-in-app-founder-experience.md` for Founder UI, feedback and `You asked. We listened.` behaviour.
3. `founding20-email-journey.md` for email/callback/resend/verification UX.
4. `founding20-beta-signups.md` for technical architecture/security defaults.
5. analytics / feedback / launch-runbook documents for measurement and operational requirements.

A legitimate Founding place is secured by **successful email verification + atomic server-side allocation**. Manual approval is not required. Admin review is abuse/remediation only.

Internally this first cohort is now called **Alpha 20**. Do not unnecessarily rename stable database/API concepts such as `beta_signups` if doing so creates churn. User-facing Founding 20 copy remains governed by the existing product rules.

---

# Required outcome

At the end of this work, Steel must have a production-ready code path for:

**Marketing visitor → Turnstile-protected request access → email verification → atomic Founder #1–20 or waitlist allocation → real public counter → Steel account linking → permanent Founder Premium entitlement → in-app Founder recognition → structured feedback → `You asked. We listened.` updates → analytics → admin remediation tools.**

The implementation must preserve existing Steel functionality and visual identity.

No billing in this sprint.

---

# Phase 1 — Architecture audit

Before modifying code, document in the PR:

- current auth/signup flow;
- current `membership_entitlements` schema and access logic;
- current Supabase migration naming/conventions;
- current Edge Function conventions;
- current Settings / Support & feedback implementation;
- current analytics/event infrastructure, if any;
- whether the marketing site source is already version-controlled;
- any existing admin-role mechanism (`user_roles` or equivalent);
- any material conflict between this brief and current architecture.

Prefer extending existing systems rather than creating parallel identity, entitlement, feedback or admin systems.

---

# Phase 2 — Database and server rules

Implement migrations necessary for the Founding 20 / Alpha 20 system.

## Signup records

Create/complete the secure signup model described in the technical brief, including normalised unique email, verification state, Founder number, waitlist state, source, timestamps and account linking.

Requirements:

- RLS enabled;
- no anonymous direct read/write access to raw signup rows;
- unique normalised email;
- Founder number unique and constrained to 1–20;
- pending verification expires safely after 24 hours;
- no public PII exposure;
- no durable raw-IP collection;
- migrations backward-compatible with existing Steel users.

## Atomic Founder allocation

Build a transaction-safe server-side allocation mechanism.

It must guarantee:

- pending users consume zero slots;
- successful verification attempts allocate the next valid Founder number 1–20;
- concurrent verification around slot #20 can never create 21 Founders or duplicate #20;
- #21+ becomes waitlist;
- client cannot supply or influence Founder number;
- allocation is idempotent for repeated callbacks.

## Lifetime entitlement

Use `public.membership_entitlements` rather than a second entitlement system.

A legitimate Founder must receive an explicit permanent core Steel Premium entitlement that:

- is tied to authenticated `user_id`;
- has no expiry;
- requires no payment provider;
- survives logout/device/browser/password changes;
- cannot later be overwritten accidentally by ordinary paid-plan logic;
- can be reconciled safely if Founder allocation exists but entitlement is missing.

Do not grant access through localStorage, cookies, query parameters, account creation date or client-supplied values.

---

# Phase 3 — Public signup security and Edge Functions

Implement the public signup functions using the existing Supabase Edge Function conventions.

Required capabilities:

### `beta-signup` (name may follow existing convention)

- validates origin;
- validates Cloudflare Turnstile server-side;
- validates and normalises email;
- rejects obvious disposable email providers while allowing legitimate aliases/privacy-forwarders;
- enforces signup/resend cooldown/rate limiting;
- safely creates or refreshes pending state;
- initiates email verification through the approved Supabase-compatible journey;
- does not expose service-role credentials;
- avoids leaking unnecessary account-existence information.

### Public counter

Return aggregate only:

```json
{
  "capacity": 20,
  "claimed": 7,
  "remaining": 13,
  "full": false
}
```

Counter must derive from real allocated Founder records. No fake or optimistic counts.

### Verification completion

Implement the callback/completion path described by the email journey.

It must:

- prove email ownership;
- be idempotent;
- atomically allocate Founder or waitlist state;
- link the Steel account when possible;
- grant/reconcile Founder entitlement when linked;
- render the correct Founder/waitlist success state;
- never trust callback/client data for Founder status.

---

# Phase 4 — Marketing-site integration

Preserve the current Steel marketing design.

Wire both public signup entry points to the same secure backend behaviour:

- hero request-access form;
- lower beta/Alpha signup form.

Add Cloudflare Turnstile using the public site key only.

Implement the exact states/copy locked in `founding20-product-rules.md` and `founding20-email-journey.md`, including:

- Request access;
- Check your email;
- duplicate pending + resend;
- duplicate Founder;
- duplicate waitlist;
- disposable/invalid email;
- Turnstile failure;
- cooldown/rate limit;
- Founder full → waitlist remains available;
- Founder verification result;
- waitlist verification result.

Display the real counter in the established restrained Steel style:

`7 CLAIMED · 13 REMAINING`

Do not redesign the website.

If marketing source is not version-controlled, import/recover the current deployed source as described in the technical brief rather than recreating the design from memory. If exact recovery is impossible, document the blocker instead of inventing a new page.

---

# Phase 5 — Founder experience inside Steel

Extend the existing Settings experience rather than creating a new primary navigation area.

For eligible Founders only, add a premium restrained Founder card showing:

- `FOUNDING MEMBER`
- `Founder #XX`
- `PREMIUM FREE FOR LIFE`
- `Steel Premium`
- `£0 — Lifetime Founding Access`
- `No payment method required`
- `No renewal charge`

Use Steel's existing dark cinematic visual language and restrained bronze/gold treatment. No confetti, points, leaderboards, gimmicks or merchandise promises.

Founder status must be server-backed.

If Founder allocation exists but entitlement is missing, show a recoverable support state and expose the mismatch to admin/reconciliation logic. Do not silently downgrade the user.

---

# Phase 6 — Beta/Alpha feedback

Extend Settings → Support & feedback with the structured Alpha feedback experience.

Categories:

- Bug / something broke
- Confusing / hard to use
- Feature request
- Training
- Nutrition
- Progress / recovery
- Other

Prompt:

**What happened — or what would you change?**

Success:

**Feedback received. Thank you for helping build Steel.**

Persist feedback securely against the authenticated user with RLS and only safe/contextual metadata needed for triage.

Do not require users to re-enter personal data Steel already knows.

Support the feedback framework's operational classification:

- bug;
- friction;
- feature request;
- signal of value.

If internal/admin metadata is needed for triage status/severity, implement it without exposing admin fields publicly.

---

# Phase 7 — “You asked. We listened.” / What’s New

Implement the lightweight product-update loop specified in the Founder experience document.

Location: Settings / Support & feedback area.

Requirements:

- small `You asked. We listened.` or `What’s New` entry point;
- short dated release-note entries;
- ability to indicate when an improvement came from tester feedback;
- optional safe categories such as Training / Nutrition / Progress / UX / Fix;
- restrained unread/new indicator;
- no disruptive modal spam;
- no public roadmap promises;
- release notes stored in a maintainable/server-backed structure, not scattered hard-coded JSX;
- admin-authorised publishing path appropriate to current Steel architecture.

This should remain useful after beta as Steel's lightweight What's New channel.

---

# Phase 8 — Analytics required for Alpha 20

Implement the minimum privacy-conscious events and backend data needed by `founding20-analytics-plan.md` and `alpha20-commercial-gate.md`.

At minimum Steel must be able to measure:

- marketing visit/source where consent/storage rules allow;
- request-access attempt/accepted submission;
- verification completed;
- Founder vs waitlist outcome;
- account completed/linked;
- onboarding completed;
- first meaningful workout/action;
- repeat meaningful use;
- D7 and D14 return/retention derivation;
- feedback submitted + category;
- source/channel and country only where appropriately and lawfully captured;
- warm vs cold/test cohort metadata only where operationally appropriate and non-invasive.

Do not create invasive session replay or excessive behavioural surveillance.

Do not put arbitrary source/client fields into entitlement/security decisions.

---

# Phase 9 — Admin and remediation

Using the existing admin/role model, provide the minimum secure admin capability required by the product rules.

Admin must be able to inspect relevant signup/feedback state and safely handle abuse/remediation, including:

- signup email;
- creation/verification status;
- Founder number/waitlist;
- linked user ID;
- resend when permitted;
- reject/revoke confirmed abuse;
- export signups where appropriate;
- deliberate safe waitlist promotion after a legitimate pre-launch Founder revocation;
- Founder entitlement mismatch/reconciliation visibility;
- feedback triage;
- What's New publishing if implemented as admin-managed content.

Normal users/anon visitors must never gain these permissions.

Do not turn manual approval into a prerequisite for legitimate Founder allocation.

---

# Phase 10 — Testing and security acceptance

Add automated tests where practical and document any manual tests.

The PR must demonstrate, at minimum:

1. valid human email + valid Turnstile → pending;
2. pending does not increment counter;
3. verification → unique Founder allocation;
4. malformed email rejected;
5. disposable email rejected;
6. invalid Turnstile rejected;
7. duplicate normalised email creates no duplicate Founder;
8. resend cooldown works;
9. 24-hour pending expiry works safely;
10. concurrency at Founder #20 results in exactly one #20 and one waitlist;
11. no Founder #21;
12. counter returns 20 claimed / 0 remaining when full;
13. public counter leaks no PII;
14. anonymous Supabase access cannot read/write raw signup records;
15. Founder entitlement persists across sessions/devices;
16. existing sign-in/signup still works;
17. existing training/nutrition/progress/settings flows still work;
18. both marketing forms behave identically at backend level;
19. mobile and desktop marketing states are usable;
20. Founder card is not forgeable client-side;
21. Founder-entitlement mismatch fails safely;
22. feedback RLS isolates users;
23. What's New publishing is admin-protected;
24. no secrets/service-role keys/Turnstile secret appear in frontend, git, logs or response bodies.

Run the available build, lint and test commands before finalising.

---

# Phase 11 — Manual configuration checklist

Do not invent or commit secrets.

Produce a concise setup document/checklist for the human operator covering at least:

- Cloudflare Turnstile site creation;
- production + local allowed domains;
- public Turnstile site key placement;
- `TURNSTILE_SECRET_KEY` Supabase secret;
- any rate-limit hashing secret if needed;
- Supabase Auth redirect/callback URLs;
- marketing/app production origins;
- email sender/template configuration;
- required Supabase migration order;
- Edge Function deployment commands;
- any cron/cleanup setup for expired pending records;
- any analytics configuration/consent requirements;
- smoke-test procedure using real external email addresses;
- rollback/remediation procedure for accidental allocation.

Do not deploy or alter production as part of this Codex run unless explicitly instructed in a later step.

---

# Phase 12 — PR delivery

Prepare one reviewable PR from `codex/founding20-beta-signups` to `main`.

PR description must contain:

- architecture summary;
- files/components/functions/migrations added or changed;
- security model;
- RLS summary;
- Founder allocation/concurrency strategy;
- account-linking/entitlement strategy;
- feedback + What's New implementation;
- analytics implemented;
- tests run and results;
- manual configuration still required;
- migration/deployment order;
- screenshots or concise visual description of marketing states + Founder Settings state;
- known limitations / deliberate deferrals;
- rollback notes.

**Do not merge the PR.** Stop and return the PR for senior review.

---

# Hard non-goals

Do not implement:

- Stripe/billing/paid checkout;
- public-launch pricing;
- referral rewards;
- Founder leaderboard/points;
- social/public Founder profiles;
- merchandise/fulfilment;
- phone/ID verification;
- unrelated redesigns;
- fake counters/testimonials/scarcity;
- a second identity system;
- a second entitlement system.

Do not weaken existing auth/RLS to make implementation easier.

---

# Definition of done for this Codex run

The code is ready for human review when all implementation work that can be completed safely in-repo is finished, builds/tests pass or failures are fully explained, production-only configuration is isolated into a manual checklist, and the unmerged PR clearly demonstrates that Steel can support the Alpha 20 flow end-to-end once the approved secrets/configuration/migrations are applied.

After the PR is produced, stop. The next step is **senior PR review before merge or deployment**.
