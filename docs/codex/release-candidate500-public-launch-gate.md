# Project Steel — Release Candidate 500 → Public Launch Gate

**Branch:** `codex/founding20-beta-signups`
**Status:** Authoritative rollout / commercial-readiness plan
**Rollout position:** Final controlled cohort before unrestricted public launch

## Core decision

Release Candidate 500 is the **end of formal staged user-count testing** for Project Steel.

The rollout remains:

**20 Alpha → 50 Beta → 100 Extended Beta → 250 Controlled Early Access → 500 Release Candidate → Public Launch**

After Steel passes the Release Candidate 500 gate, there should be **no further artificial whole-product user caps** such as 1,000 / 2,000 / 5,000-user stages.

Future risky changes may still use feature flags, canary releases or percentage-based rollouts, but those are feature-level release controls rather than continued beta cohorting.

---

## Purpose of Release Candidate 500

This stage exists to prove that Steel is not merely a good beta product, but a product that is ready to operate as a real commercial service.

The 500-user stage should validate:

- reliable self-service onboarding;
- stable training, nutrition, recovery and progress journeys;
- production-grade authentication and account management;
- subscription and entitlement correctness;
- reliable billing lifecycle where paid validation has already been approved;
- realistic support demand;
- retention at D7 / D14 / D30 and beyond;
- meaningful usage without founder hand-holding;
- clear customer positioning;
- repeatable acquisition;
- credible willingness to pay;
- acceptable infrastructure and operating cost;
- privacy, terms, cookie/storage, fitness disclaimer and business disclosure readiness;
- launch analytics and incident visibility;
- Founder 20 protection throughout every billing and entitlement change.

The objective is not to make Steel perfect. The objective is to remove risks that could damage trust or make unrestricted growth irresponsible.

---

# RC500 user strategy

## Composition

The 500-user population should include the existing cohorts rather than replacing them:

- Founding Alpha 20;
- Beta users 21–50;
- Extended Beta users 51–100;
- Controlled Early Access users 101–250;
- approximately 250 additional Release Candidate users.

New RC users should come primarily from realistic acquisition channels rather than personal outreach.

Preference should be given to channels that could plausibly remain useful after launch, including:

- organic social;
- fitness communities;
- creator / micro-creator referrals where commercially sensible;
- search / content discovery if available;
- direct website traffic;
- referrals from existing users;
- carefully controlled paid acquisition experiments only if prior economics justify them.

Warm-friend recruitment should no longer be a meaningful source of evidence at this stage.

---

# Product readiness gate

Steel should not publicly launch while any of the following remain systemic:

- users cannot reliably create or verify accounts;
- onboarding regularly fails or creates unusable plans;
- workouts cannot be started, logged or saved reliably;
- data regularly disappears or appears under the wrong account;
- nutrition / meal-plan journeys contain serious reliability issues;
- progress / weight / check-in data cannot be trusted;
- users regularly require manual intervention to complete core journeys;
- mobile layout breaks important workflows;
- severe performance problems make the app frustrating to use;
- authentication or entitlement inconsistencies remain unresolved.

### GO condition

Core journeys are sufficiently reliable that a normal user can join, understand Steel, use it repeatedly and manage their account without founder support.

---

# Reliability and incident readiness

Before Public Launch, Steel should have a basic operating discipline for production incidents.

Minimum requirements:

1. identifiable production errors / logs;
2. ability to distinguish client, backend, database and external-service failures;
3. basic uptime / health visibility for important services;
4. a documented process for a critical incident;
5. ability to pause or disable a risky feature without corrupting user data;
6. safe database migrations and rollback thinking;
7. tested account / entitlement recovery process;
8. ability to communicate meaningful outages or material product issues to users.

Steel does not need enterprise-grade SRE infrastructure at this size, but failures must not be invisible.

### Critical launch blockers

Do not launch publicly if there is evidence of:

- cross-user data exposure;
- repeatable account takeover/security weakness;
- uncontrolled data loss;
- incorrect paid entitlement removal;
- Founding 20 lifetime entitlement loss;
- payment being taken without the correct access state;
- inability to cancel or correctly reflect cancellation where billing is live.

---

# Subscription and billing readiness

If paid subscriptions are to be available at Public Launch, billing must behave like a real product rather than a prototype.

Required lifecycle coverage:

- new subscription;
- successful payment;
- failed payment;
- payment retry / recovery where supported;
- upgrade / downgrade if multiple plans exist;
- cancellation;
- end-of-period entitlement handling;
- resubscription;
- refund / manual correction process;
- duplicate webhook / event safety;
- delayed webhook safety;
- entitlement reconciliation;
- account deletion interaction;
- customer-support recovery path.

### Founding 20 rule

The original 20 must remain permanently protected.

For a legitimate Founder:

- `Founder #XX` remains visible;
- `PREMIUM FREE FOR LIFE` remains valid;
- no payment method is required for core Steel Premium;
- no renewal charge is created;
- the Founder entitlement is not overwritten by normal paid-plan logic;
- failed billing events elsewhere must not alter the Founder entitlement;
- any entitlement mismatch must fail safely and surface for recovery.

This rule is non-negotiable unless the previously locked Founding 20 product terms themselves are deliberately changed before allocation, not retrospectively.

---

# Pricing validation gate

By RC500, Steel should have moved beyond asking only hypothetical pricing questions.

The commercial evidence should answer:

- what customers believe Steel replaces or consolidates;
- what they currently pay for alternatives;
- which Steel features drive willingness to pay;
- which features are expected as table stakes;
- what monthly and annual price ranges create acceptable conversion;
- whether one simple Premium plan is clearer than unnecessary tiering;
- whether a free tier meaningfully helps acquisition or merely weakens conversion;
- what trial structure, if any, helps conversion without creating abuse.

### Public-launch pricing rule

Do **not** lock public pricing merely because an earlier provisional figure was discussed.

The previously discussed figures (for example £7.99/month and annual options) remain hypotheses until RC evidence supports the final package.

Final launch pricing should be selected from actual behaviour and willingness-to-pay evidence gathered through the 100 / 250 / 500 stages.

---

# Commercial viability gate

Before unrestricted launch, the original Phoenix commercial validation rule must be credible:

1. **Exact paying customer** — we know who Steel is best for.
2. **Painful problem** — the user has a meaningful enough problem to adopt / pay.
3. **Pricing / monetisation** — there is behavioural evidence supporting a real model.
4. **Acquisition channel** — at least one channel can repeatedly produce relevant users.
5. **Why Steel wins** — users can explain why they choose Steel over alternatives, spreadsheets, notes or doing nothing.
6. **First real customer path** — there is a clear route from visitor → signup → activation → retained user → paid user where applicable.

Steel does not need mature unit economics before launch, but it does need evidence that monetisation is not imaginary.

---

# Acquisition readiness

RC500 should identify at least one acquisition channel that works without Amir personally recruiting every user.

Track by source:

- visitor → Request access / signup;
- signup → verified;
- verified → onboarding complete;
- onboarding → first meaningful activity;
- first meaningful activity → D7 retained;
- D7 → D30 retained;
- free / trial → paid where applicable;
- acquisition cost where money is spent;
- support burden by source;
- cancellation / churn by source.

A channel that generates large numbers of poor-fit users is not a successful acquisition channel.

---

# Retention and value gate

Public launch requires evidence that meaningful users come back because Steel is useful, not because they are being repeatedly chased for beta feedback.

Core measures:

- onboarding completion;
- first-workout completion;
- repeat workout logging;
- meaningful nutrition use where relevant;
- progress / check-in usage;
- D7 retention;
- D14 retention;
- D30 retention;
- number of active weeks;
- voluntary return frequency;
- users who would be disappointed if Steel disappeared;
- users intending to continue once the test period ends;
- paid retention / continued-payment intent where billing is enabled.

Do not obsess over a single universal retention percentage. Segment by user type and acquisition source so a strong core segment is not hidden by poorly targeted traffic.

---

# Support readiness

Before launch, Steel needs a support model that can handle growth without becoming a second full-time job.

Required:

- clear in-app Support & Feedback route;
- Beta Feedback / product feedback preserved;
- basic support categorisation;
- ability to distinguish bug / account / billing / product-question / feature-request;
- documented response approach for account or entitlement problems;
- reusable help content for repeated questions;
- acceptable number of support requests per active user;
- obvious recurring confusion fixed in-product rather than answered manually forever.

### Support escalation rule

If RC500 generates a level of manual support that would become unmanageable at 2,000+ users, **ITERATE before launch**.

---

# “You asked. We listened.” at RC500 and beyond

The in-app **You asked. We listened. / What’s New** experience remains part of Steel after beta.

During RC500 it should demonstrate:

**feedback → prioritised change → shipped improvement → visible acknowledgement**

After Public Launch it evolves into a normal lightweight product-update channel rather than a beta-only feature.

Use it for meaningful product improvements, fixes and user-requested refinements — not every internal deployment.

---

# Analytics readiness

Before launch, Steel should be able to answer the following without manually reconstructing data:

- How many visitors arrive?
- Where did they come from?
- How many start signup?
- How many verify?
- How many complete onboarding?
- How many log a first workout?
- How many return D7 / D14 / D30?
- Which major areas are actually used?
- What feedback themes are growing?
- What failures are blocking users?
- If billing is live, how many start / convert / cancel / fail payment?
- How do Founder / beta / paid cohorts differ?

Analytics must respect the privacy rules established in the Founding 20 analytics plan and must not become invasive behaviour surveillance.

---

# Legal / compliance launch gate

The draft legal pack created during pre-launch must be converted from placeholders into accurate production documents before unrestricted commercial launch.

At minimum confirm and publish as applicable:

- Privacy Policy;
- Terms of Service / Terms of Use;
- Founding 20 terms preserved for Founders;
- Cookie / local-storage / analytics disclosures;
- fitness and health disclaimer;
- company / trader identity and required website disclosures;
- contact information;
- payment / subscription / cancellation disclosures if billing is live;
- accurate processor / infrastructure disclosures where required;
- actual retention practices rather than guessed retention language.

Trademark filing is a separate legal decision. Do not represent `PROJECT STEEL` as a registered trade mark unless registration has actually occurred.

---

# Security and abuse readiness

Before Public Launch confirm:

- authentication flows do not expose obvious account-enumeration or takeover issues;
- database RLS is present and tested for user-scoped data;
- server-only operations remain server-side;
- privileged/admin tools are not accessible to normal users;
- Founding 20 allocation remains atomic and non-forgeable;
- feedback / signup endpoints have sensible abuse controls;
- secrets are not shipped to the browser or committed to the repo;
- rate limiting / Turnstile protections are functioning where designed;
- data deletion / account closure behaviour is known and tested.

A major unresolved security finding is an automatic **NO-GO**.

---

# Performance / infrastructure readiness

RC500 should provide enough real traffic to expose obvious scaling problems.

Review:

- page/app load performance;
- database query behaviour;
- Supabase quotas / cost trends;
- Edge Function reliability and latency;
- Cloudflare limits and deployment behaviour;
- third-party API limits;
- logging volume;
- storage growth;
- image/media upload behaviour;
- AI/onboarding costs if applicable;
- cost per active user.

Do not optimise prematurely for millions of users, but remove any architecture problem that is already visible at 500.

---

# Public Launch decision framework

At the end of RC500 choose exactly one primary decision.

## GO — Public Launch

Remove the overall user cap when:

- core product journeys are reliable;
- no critical security / privacy / data-integrity blockers remain;
- support burden is sustainable;
- analytics are trustworthy enough to operate the product;
- Founding 20 entitlements are protected;
- paid lifecycle is reliable if billing is launching;
- the legal launch pack is factual and published;
- the target customer and value proposition are clear;
- at least one credible acquisition channel exists;
- retention demonstrates genuine recurring value;
- willingness-to-pay evidence is credible enough for the chosen commercial model.

## ITERATE — Remain at RC500

Hold public launch when Steel basically works but one or more material issues remain, for example:

- weak D30 retention in the target segment;
- unclear pricing/package;
- support burden too high;
- recurring onboarding friction;
- billing edge cases;
- reliability problems under real use;
- poor activation from otherwise promising acquisition traffic;
- incomplete legal / operational readiness.

Fix the specific issue, publish meaningful improvements through **You asked. We listened.**, and re-test with the existing cohort. Do not recruit extra users simply to make the numbers look better.

## STOP / REPOSITION

Do not publicly scale the current proposition if evidence shows:

- most users do not return after repeated product refinements;
- the supposed target customer does not strongly value the product;
- willingness to pay remains negligible;
- acquisition depends entirely on personal relationships or unsustainable spend;
- Steel cannot explain a meaningful advantage over existing alternatives;
- operating/support cost makes the model structurally unattractive.

In this case reassess target customer, positioning, scope or commercial model before further expansion.

---

# Launch-day operating plan

Once GO is approved:

1. remove / raise the whole-product access cap;
2. preserve Founder 20 entitlements and recognition;
3. move marketing website from beta/waitlist language to accurate public-launch language;
4. activate final approved pricing / plan copy where applicable;
5. confirm production legal links;
6. confirm support/contact route;
7. verify analytics funnel in production;
8. verify billing + entitlement reconciliation if billing is live;
9. deploy with rollback path available;
10. monitor signup, onboarding, errors, support and payments closely through the first launch period.

Do not manufacture scarcity or fake launch counters once the Founding 20 promotion is complete.

---

# First 30 days after Public Launch

The product is now public, but the first month should be treated as an operating-learning window.

Review at approximately:

- Day 1: critical failures / signup / billing / support;
- Day 7: activation and early retention;
- Day 14: recurring friction and cancellation themes;
- Day 30: retention, paid conversion, churn, acquisition quality and operational burden.

These are **review points**, not new user-count gates.

Normal users continue to join during this period unless an incident requires temporary restriction.

---

# Feature rollout policy after launch

After public launch, whole-product staged testing ends.

Risky new features can use:

- internal/admin-only testing;
- Founder / opt-in preview where appropriate;
- feature flags;
- percentage rollout;
- platform-specific rollout;
- canary deployment;
- rollback switches.

This gives Steel safe engineering practice without leaving the product permanently labelled beta.

---

# Relationship to future merchandise

Founder merchandise remains parked until Steel generates enough real cash to justify it.

It should be treated as a discretionary thank-you / brand gesture, **not a current entitlement or contractual promise**.

The original Founding 20's guaranteed reward remains their lifetime core Premium access and in-app Founder recognition.

---

# Final launch principle

Steel does not launch publicly because it reached 500 accounts.

Steel launches publicly because, by the time it has been tested with roughly 500 real users, the evidence shows that:

**the product works, people come back, some are genuinely prepared to pay, the business can acquire and support them, and the service can be operated responsibly.**

After that point, stop testing the size of the audience and start operating the business.
