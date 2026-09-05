# Project Steel — Founding 20 analytics & conversion funnel

**Status:** Authoritative product analytics specification for the Founding 20 beta flow.
**Scope:** Marketing site → beta signup → verification → founder/waitlist allocation → Steel account activation → early product engagement.

This document is intended to guide Codex implementation and later launch measurement. It does **not** authorise invasive tracking, advertising pixels, fingerprinting, or unnecessary personal-data collection.

---

## 1. Product question this analytics plan must answer

The goal is not to collect as many metrics as possible. The goal is to answer:

1. Are visitors interested enough in Steel to request beta access?
2. Do submitted users successfully verify their email?
3. How quickly are Founding 20 places being claimed?
4. Do verified users actually create/finish their Steel account?
5. Do those users reach a meaningful first-use milestone?
6. Do they return during the first week?
7. Which signup source converts best?
8. Where are users dropping out of the funnel?

If a metric does not help answer one of these questions, it should not be collected during the Founding 20 phase.

---

## 2. North-star funnel

The core funnel is:

`landing_view`
→ `beta_cta_click`
→ `beta_signup_submitted`
→ `beta_signup_accepted`
→ `email_verified`
→ `founder_allocated` OR `waitlist_allocated`
→ `steel_account_completed`
→ `activation_milestone`
→ `day_7_return`

### Primary conversion rates

Track these as the launch dashboard minimum:

- **Visitor → CTA:** `beta_cta_click / unique_landing_visitors`
- **Visitor → valid signup:** `beta_signup_accepted / unique_landing_visitors`
- **Signup → verification:** `email_verified / beta_signup_accepted`
- **Verified → account completed:** `steel_account_completed / email_verified`
- **Account completed → activated:** `activation_milestone / steel_account_completed`
- **Activated → D7 return:** `day_7_return / activation_milestone`

Founders and waitlist users must be separable in aggregate reporting.

---

## 3. Founder campaign metrics

The public campaign counter remains independent of behavioural analytics and must always derive from authoritative server-side founder allocation data.

Required operational metrics:

- Founding capacity: `20`
- Claimed founders: authoritative count of valid `founding_number`
- Remaining founders: `max(20 - claimed, 0)`
- Pending verification count
- Verified waitlist count
- Expired pending count
- Rejected/revoked count
- Median time from signup accepted → email verified
- Median time from verified → Steel account completed

Do **not** make the public claimed counter depend on client analytics events.

---

## 4. Event catalogue

### 4.1 Marketing events

#### `landing_view`
Purpose: top-of-funnel audience size.

Properties:
- `page`: fixed safe identifier such as `marketing-home`
- `referrer_group`: optional coarse category only, e.g. `direct`, `search`, `social`, `referral`, `other`
- `utm_source`, `utm_medium`, `utm_campaign`: optional only where explicitly present in the URL; sanitise and length-limit values

Do not store full referrer URLs where they may contain personal/query data.

#### `beta_cta_click`
Properties:
- `source`: `hero` | `beta-section` | other allow-listed UI source
- `cta`: `request-access`

#### `beta_form_started`
Fire only once the user meaningfully interacts with the form, not on page render.

Properties:
- `source`: allow-listed source

#### `beta_signup_submitted`
Means the user submitted the form client-side.

Properties:
- `source`

This event alone does **not** mean the signup was accepted.

#### `beta_signup_accepted`
Server-confirmed valid pending signup.

Properties:
- `source`
- `result`: `pending`

Never include raw email.

#### `beta_signup_rejected`
Server-confirmed non-sensitive rejection category.

Allow-listed `reason` values only:
- `invalid_email`
- `disposable_email`
- `turnstile_failed`
- `rate_limited`
- `duplicate_pending`
- `duplicate_founder`
- `duplicate_waitlist`
- `other`

Do not log implementation details, deny-list content, IP addresses, Turnstile tokens or submitted email addresses in the analytics event.

---

### 4.2 Verification events

#### `verification_email_sent`
Server-side operational event.

Properties:
- `source`
- `send_type`: `initial` | `resend` | `reminder`

#### `email_verified`
Fire only after server-confirmed successful ownership verification.

Properties:
- `signup_outcome`: `founder` | `waitlist`
- `founding_number`: integer 1–20 **only for internal authenticated/admin analytics**, not public/client analytics

#### `verification_expired`
Properties:
- `source`

#### `founder_allocated`
Authoritative server-side event emitted only after successful atomic allocation.

Properties:
- `founding_number`: integer 1–20

This event must be idempotent. Replays must not double-count a founder.

#### `waitlist_allocated`
Authoritative server-side event after successful verification where no Founding 20 place is available.

---

### 4.3 Account activation events

#### `steel_account_started`
Occurs when a verified beta user begins the Steel account completion/onboarding path.

#### `steel_account_completed`
Occurs when the authenticated account is ready for normal Steel use.

Properties:
- `beta_status`: `founder` | `waitlist` | `none`
- `plan_key`: coarse entitlement key only

Never place entitlement decisions on client event data. The database remains authoritative.

---

### 4.4 Product activation

For the Founding 20 beta, Steel needs one clear activation milestone.

**Recommended activation definition:**
A user completes at least **one meaningful tracked action inside Steel after account setup**, preferably one of:

- logs/completes their first workout; OR
- records their first nutrition entry; OR
- completes whichever onboarding action is explicitly defined as the first value-bearing Steel interaction at implementation time.

Do not count login, opening the dashboard or navigation as activation.

Emit:

#### `activation_milestone`
Properties:
- `activation_type`: allow-listed value such as `first_workout` | `first_nutrition_log` | `first_core_action`
- `beta_status`: `founder` | `waitlist` | `none`

The implementation should avoid duplicate activation events for the same user; first-ever activation should be recorded once.

---

## 5. Retention metrics

For beta, use simple behavioural retention rather than vanity session counts.

### Required

- **Day 1 return:** user performs a meaningful Steel action on the calendar day after activation
- **Day 7 return:** user performs a meaningful Steel action within the D7 reporting window

Suggested event/derived metric:

#### `meaningful_return`
Properties:
- `day_bucket`: `d1` | `d7`
- `beta_status`: `founder` | `waitlist` | `none`

Prefer deriving retention server-side from existing product activity timestamps if reliable rather than creating unnecessary duplicate events.

### Do not overbuild yet

No complex cohort engine is required for Founding 20. A simple admin/report query is enough if it can reliably show:

- activated founders
- D1 retained founders
- D7 retained founders
- activated waitlist/beta users
- D1/D7 retention percentages

---

## 6. Source attribution

The signup system already permits safe source identifiers.

Authoritative initial values:
- `hero`
- `beta-section`
- `marketing-site`

Rules:
- source values are analytics metadata only
- source must never affect founder eligibility, rate limits, permissions or entitlement
- unknown source values should map to `other` rather than be trusted verbatim
- keep source taxonomy deliberately small during beta

For campaign URLs, optional UTM values may be captured at landing and associated only at a coarse analytics level. Do not build cross-device identity resolution.

---

## 7. Identity and privacy rules

### Public/marketing analytics

Prefer anonymous or pseudonymous aggregate measurement.

Do not send these into behavioural analytics:
- email address
- name
- full IP address
- verification token
- Turnstile token
- Supabase access/refresh token
- password/password-reset data
- raw user-agent unless genuinely needed for short-lived security troubleshooting
- nutrition/workout content that is unnecessary for funnel analysis

### Authenticated product analytics

Where linking events to an account is necessary for activation/retention, use a stable internal pseudonymous identifier such as an application analytics ID or authenticated user UUID within the controlled backend/reporting environment.

Do not expose identifiable user analytics through public endpoints.

### Separation of concerns

Keep three concepts separate:

1. **Product database truth** — signup status, founder number, entitlement.
2. **Security/abuse logs** — short-lived operational data required for protection.
3. **Product analytics** — aggregate funnel/activation measurement.

Do not use analytics as the source of truth for access, entitlement or Founder allocation.

---

## 8. Analytics implementation preference

For Founding 20, optimise for low cost, privacy and simplicity.

Preferred order:

1. Use authoritative Supabase data and existing product activity tables to derive as many metrics as possible.
2. Add a small first-party event table/API only for funnel events that cannot reliably be derived.
3. Introduce a third-party analytics platform only if it materially improves decision-making and its privacy/cookie implications are understood and reflected in the legal pack.

Do not add Google Analytics, Meta Pixel, TikTok Pixel or advertising trackers by default.

If Cloudflare Web Analytics is considered for aggregate site traffic, review its current behaviour/privacy characteristics at implementation time before enabling it and update the cookie/privacy documentation accordingly.

---

## 9. Suggested first-party analytics schema

If a dedicated event table is needed, suggested shape:

`public.analytics_events`

- `id uuid primary key`
- `event_name text not null`
- `occurred_at timestamptz not null default now()`
- `anonymous_session_id text null`
- `user_id uuid null references auth.users(id)`
- `signup_id uuid null references public.beta_signups(id)`
- `source text null`
- `properties jsonb not null default '{}'::jsonb`

Security rules:
- public clients must not receive arbitrary SELECT access
- event names/properties must be validated server-side or through a narrow RPC/Edge Function
- sensitive keys must be stripped/rejected
- impose property-size limits
- do not let arbitrary JSON become an unbounded logging sink
- authenticated users may emit only the small allow-listed event set relevant to product usage
- admin/reporting access only for raw events

This schema is optional. Codex should prefer deriving metrics from existing authoritative records where feasible.

---

## 10. Launch dashboard

A minimal internal dashboard/report should show:

### Acquisition
- unique landing visitors
- CTA clicks
- form starts
- accepted signups
- visitor → accepted signup conversion

### Verification
- pending
- verified total
- verification rate
- median verification time

### Founding 20
- claimed / 20
- remaining
- founder allocation rate by day
- waitlist count

### Activation
- accounts completed
- activation milestones
- account → activation conversion

### Retention
- D1 retained
- D7 retained
- D1 %
- D7 %

### Source comparison
For each allow-listed source:
- visits/CTA where available
- accepted signups
- verified
- founders
- account completed
- activated

Do not optimise the product based on tiny-sample percentage differences without also showing raw counts.

---

## 11. Commercial validation thresholds

These are **working decision thresholds**, not promises or industry benchmarks. They exist to prevent us from rationalising weak traction.

### Stage A — signup interest
Once at least ~100 qualified landing visits have been accumulated from intentional outreach:
- **Strong:** ≥10% accepted signup conversion
- **Promising:** 5–9.9%
- **Weak:** <5%

Traffic quality must be considered; friends/family curiosity is not equivalent to target-user traffic.

### Stage B — email verification
- **Strong:** ≥75% of accepted signups verify
- **Watch:** 50–74%
- **Problem:** <50%

A low verification rate may indicate deliverability/UX problems rather than weak product demand, so diagnose before judging demand.

### Stage C — account completion
- **Strong:** ≥70% of verified beta users complete their Steel account
- **Watch:** 50–69%
- **Problem:** <50%

### Stage D — activation
- **Strong:** ≥60% of completed accounts reach activation
- **Watch:** 40–59%
- **Problem:** <40%

### Stage E — D7 meaningful return
For the first small beta cohort:
- **Strong early signal:** ≥40%
- **Promising:** 25–39%
- **Weak:** <25%

Do not make a final business decision from 20 users alone. These thresholds are directional signals used to decide what to investigate next.

---

## 12. First-20 success criteria

The Founding 20 campaign is successful enough to expand into the next 25–50-user beta if:

1. 20 legitimate founders are allocated without security/data integrity failures.
2. Verification and account completion are not showing major friction.
3. At least 12 of 20 founders reach the activation milestone.
4. At least 5 of those activated founders demonstrate meaningful D7 return.
5. At least 8 founders provide usable qualitative feedback or behavioural evidence that Steel solves a real workflow/problem for them.
6. No critical privacy, entitlement, authentication or data-loss issue remains unresolved.

These are working beta gates. They may be revised after seeing real behaviour, but revisions should be recorded rather than silently moving the goalposts.

---

## 13. Feedback data

Quantitative analytics alone are insufficient for Founding 20.

After users have had enough time to use Steel, capture a small feedback set:

- What were you using before Steel?
- Which Steel feature is most useful?
- What feels confusing or unnecessary?
- What would make you stop using it?
- If Steel disappeared tomorrow, how disappointed would you be? (`very`, `somewhat`, `not disappointed`)
- Would you realistically pay for Steel after beta? If yes, what feels reasonable?

Do not ask pricing questions before the user has actually experienced the product.

Store feedback separately from public testimonials. Nothing becomes marketing/social proof without explicit permission.

---

## 14. Event QA requirements

Before production launch, validate:

1. Page refreshes do not produce obviously inflated unique visitor counts where avoidable.
2. CTA events identify hero vs beta-section correctly.
3. A rejected signup never generates `beta_signup_accepted`.
4. A pending signup does not generate `email_verified`.
5. Verification generates exactly one authoritative founder/waitlist outcome.
6. Replaying verification does not double-count founder allocation.
7. Founder #20 concurrency test yields exactly one #20 allocation event.
8. Public counter matches database truth, not analytics totals.
9. Existing-account founders link correctly without duplicate activation identities.
10. Client analytics contain no email, auth tokens or sensitive form values.
11. Analytics failures never block signup, verification, authentication or normal Steel use.
12. Ad blockers/script blocking do not break the product.
13. Admin/report metrics can be reconciled against source database records.

---

## 15. Analytics failure policy

Product functionality must always win over analytics.

If analytics collection fails:
- signup must still work
- verification must still work
- founder allocation must still work
- account creation/login must still work
- workout/nutrition functionality must still work

Analytics calls should fail safely and should not create user-facing errors unless the error relates to the actual product action rather than measurement.

---

## 16. Non-goals

Not part of the Founding 20 analytics scope:
- advertising attribution networks
- ad retargeting
- behavioural profiling
- session replay
- heatmaps
- device fingerprinting
- cross-site tracking
- cross-device identity stitching
- complex BI warehouse
- machine-learning user scoring
- automated churn prediction

These can be reconsidered only if there is a clear later business need.

---

## 17. Codex implementation instruction

When implementing GitHub issue #2, treat this file together with:

- `docs/codex/founding20-beta-signups.md`
- `docs/codex/founding20-product-rules.md`
- `docs/codex/founding20-email-journey.md`

as the authoritative Founding 20 product specification.

Do **not** expand analytics scope merely because a third-party SDK makes extra tracking easy.

If implementation needs a new analytics table/function, keep it backwards-compatible, RLS-secured, privacy-minimised, and document the final event catalogue and any retention rules in the PR/setup documentation.

---

## 18. Decision locked for beta

For the Founding 20 beta, Steel will measure a deliberately small funnel:

**Visit → Request access → Accepted signup → Verified → Founder/Waitlist → Account completed → Activated → D7 return.**

The purpose is to answer whether Steel attracts the right users, gets them to first value and gives them a reason to return — not to maximise tracking.