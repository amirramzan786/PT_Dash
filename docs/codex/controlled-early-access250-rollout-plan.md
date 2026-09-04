# Project Steel — Controlled Early Access 250 Rollout Plan

**Branch:** `codex/founding20-beta-signups`
**Status:** Authoritative rollout/commercial validation plan for later execution.

## Purpose

Controlled Early Access expands Steel from 100 validated users to a maximum of **250 total users**.

This stage tests whether Steel can support a meaningfully larger, less curated audience while beginning the first controlled proof of commercial willingness-to-pay.

The goal is not to maximise user count or revenue. The goal is to prove that:
- onboarding remains self-service;
- activation and retention remain healthy as the audience broadens;
- support burden remains manageable;
- core product reliability is strong enough for paid expectations;
- users understand Steel's value proposition;
- a meaningful minority will commit money, not just say they might;
- acquisition channels begin to show repeatability;
- early pricing evidence is strong enough to design the 500-user release-candidate stage.

## Cohort structure

Maximum total cohort: **250 users**.

Carry forward the original cohorts:
- 20 Alpha founders;
- 30 additional Beta 50 users;
- 50 additional Extended Beta 100 users;
- up to 150 new Controlled Early Access users.

The Founding 20 remain permanently protected under their existing lifetime entitlement rules. Nothing in this stage changes, weakens or reinterprets the Founding 20 promise.

## Recruitment mix for users 101–250

Prioritise a broader and less hand-picked audience than previous stages.

Recommended mix:
- UK and international English-speaking users;
- beginners, returning users, intermediate and advanced trainees;
- users currently using competing fitness apps;
- users currently using notes, spreadsheets or no formal tracking system;
- users with training-first, nutrition-first and progress-tracking motivations;
- a meaningful proportion acquired through public social content rather than direct personal outreach;
- users who have no existing relationship with the founder.

Avoid over-indexing on friends, experienced lifters, highly technical users, influencers or people receiving special support.

## Access model

### Founding 20

Keep:
- `Founder #XX` status;
- core Steel Premium free for life;
- no payment method required;
- no renewal charge.

### Existing users 21–100

Do not retroactively remove access or unexpectedly charge them during a live validation cycle.

Their current beta access terms should remain clear and stable until a deliberate transition plan has been communicated.

### New users 101–250

Controlled Early Access may introduce the first **real paid validation experiment**, but only after the Beta 100 gate has passed and billing readiness has been verified.

Do not assume every user 101–250 must pay. The cohort may contain both free-control and paid-validation segments where this improves the experiment.

## Paid validation principle

Previous stages test stated willingness-to-pay. This stage may test **behavioural willingness-to-pay**.

A commercial signal is materially stronger when a user:
- reaches a real checkout;
- chooses a plan;
- enters a payment method;
- starts a paid subscription or approved paid trial;
- remains active after purchase.

Do not treat survey answers such as "I'd probably pay" as equivalent to a transaction.

## Preconditions before enabling live billing

Live billing must remain disabled unless all of the following are true:
- Beta 100 has passed its GO gate;
- no unresolved critical authentication, entitlement or data-loss issues;
- membership entitlement logic is server-authoritative;
- Founding 20 lifetime access cannot be overwritten by billing events;
- plan/pricing copy has been explicitly approved;
- cancellation and subscription-management paths exist;
- billing webhook/idempotency handling is tested;
- failed payments cannot corrupt user access state;
- relevant Terms, Privacy and billing disclosures are ready for the actual implementation;
- test/sandbox checkout has passed end-to-end QA;
- analytics can distinguish pricing-page view, checkout start, checkout completion, cancellation and retained paid use.

If these conditions are not met, run price-intent tests only and keep charging disabled.

## Pricing experiment design

Do not hard-code a final Steel price in this rollout document.

Price points must be selected from evidence gathered during Beta 50 and Extended Beta 100.

The experiment should answer:
1. What monthly price produces acceptable conversion without signalling that Steel is disposable/cheap?
2. Does an annual option materially improve commitment?
3. Which features do users believe justify Premium?
4. Is a free tier necessary, useful as acquisition, or likely to cannibalise paid conversion?
5. Is the value proposition stronger as one complete Steel system than as multiple feature-gated modules?

Recommended testing principles:
- test a small number of coherent price hypotheses, not many tiny variations;
- avoid misleading fake discounts;
- do not show different users arbitrary prices without recording cohort assignment;
- do not promise a price is permanent unless that is genuinely intended;
- record country/currency context where relevant;
- keep the Founding 20 excluded from paid conversion metrics.

## Suggested paid-validation segmentation

A practical structure for the 150 new users is:
- a free/control group to preserve product-behaviour comparison;
- one or more small paid-intent/checkout cohorts;
- only a controlled subset exposed to live billing initially.

Start small. If payment infrastructure, conversion UX or support creates unexpected problems, pause expansion rather than exposing all 150 new users.

## Commercial funnel

Track at minimum:

`Landing visit → Request access / Sign up → Verified → Account created → Onboarding completed → First meaningful action → First workout logged → Repeat use → Pricing viewed → Checkout started → Checkout completed → D7 paid-active → D30 paid-active`

Also track:
- acquisition source;
- country;
- device class;
- trainee type where voluntarily known;
- prior competitor/tool;
- free vs paid experiment cohort;
- cancellations;
- failed payments;
- refunds where applicable;
- support requests per active user;
- feedback category and severity.

## Core product metrics

Continue measuring:
- signup verification rate;
- onboarding completion;
- first-workout conversion;
- time-to-first-value;
- users completing 2+ and 3+ workouts;
- D1, D7, D14 and D30 retention;
- weekly active users;
- training, nutrition, recovery/progress feature adoption;
- crash/error rates;
- failed writes/sync issues;
- support contacts per 100 active users;
- feedback volume and repeat themes.

## Commercial metrics

Once live paid testing is enabled, additionally measure:
- pricing-page exposure rate;
- checkout-start rate;
- checkout completion rate;
- paid conversion rate by acquisition source;
- monthly vs annual preference;
- D7 and D30 paid retention;
- early cancellation rate;
- refund rate;
- failed-payment rate;
- reasons for non-purchase;
- reasons for cancellation;
- percentage of active users who say Steel has replaced or materially reduced another tracking method/app.

## Acquisition validation

At 250 users, Steel should begin proving that users can be acquired without relying primarily on the founder's personal network.

Test repeatable channels such as:
- Facebook/Instagram/Snapchat social content;
- Reddit community participation where rules permit;
- local gym/community groups;
- small creator or micro-influencer outreach;
- referrals/word of mouth measured organically, without building a reward system yet;
- direct landing-page traffic from shared content.

Do not introduce paid advertising at scale before organic/channel conversion is understood.

For each channel, track:
- visits;
- verified signups;
- activation;
- D7/D30 retention;
- paid conversion where applicable;
- support burden;
- qualitative fit.

## Founder feedback loop

Keep the in-app Beta Feedback experience active.

Continue **You asked. We listened.** as a visible product-development loop.

Each meaningful release note should be concise and preferably classify the change:
- Fix;
- UX;
- Training;
- Nutrition;
- Progress / recovery;
- Reliability;
- New capability.

Where appropriate, state that a change came from tester/user feedback without exposing private feedback or identifying the user unless explicit permission has been obtained.

## Support and operational test

At 250 users, support quality matters commercially.

Measure:
- number of support contacts per week;
- median first-response time if human support is being provided;
- repeated support topics;
- percentage resolvable through product UX or documentation;
- account/entitlement issues;
- billing issues if live payments are enabled;
- founder time spent manually rescuing users.

A product that requires extensive manual intervention for normal onboarding should not progress to 500 users.

## Reliability gate

Do not progress while any of these are materially unresolved:
- user data loss;
- cross-user data exposure;
- authentication/account takeover weakness;
- incorrect Founding 20 entitlement removal;
- recurring inability to log/save workouts;
- broken onboarding for a meaningful user segment;
- payment or cancellation state inconsistencies;
- severe mobile usability regressions;
- critical errors without observability/support evidence.

## Controlled Early Access 250 GO / ITERATE / STOP framework

Exact percentage thresholds may be refined using observed Alpha/Beta baselines, but the decision must be evidence-based.

### GO toward Release Candidate 500

Progress when the evidence collectively shows:
- strong self-service onboarding without founder handholding;
- healthy repeat workout behaviour and D30 retention relative to the Beta 100 baseline;
- no unresolved critical reliability/security/data blockers;
- support burden is sustainable and trending downward per active user;
- users acquired from more than one non-personal channel activate and retain;
- user feedback shows a clear, repeated value proposition;
- behavioural willingness-to-pay is demonstrated if live billing was enabled;
- paid users continue to use Steel after purchase rather than immediately cancelling;
- pricing evidence is coherent enough to select a release-candidate pricing model;
- Founding 20 entitlements remain correct and untouched.

### ITERATE at 250

Remain capped at 250 when:
- users like Steel but retention is inconsistent;
- onboarding still needs manual rescue;
- support burden is too high;
- one acquisition source works but others do not;
- stated willingness-to-pay is positive but checkout conversion is weak;
- paid conversion occurs but early cancellation is too high;
- recurring feedback reveals fixable product friction;
- reliability is acceptable but not release-candidate quality.

Fix the causes, publish relevant improvements through **You asked. We listened.**, then re-measure the same cohort before expanding.

### STOP / REPOSITION

Do not scale simply because the software works technically.

Reconsider positioning, commercial model or the project itself if repeated testing shows:
- users do not return after novelty wears off;
- meaningful activation/retention remains weak despite iterations;
- cold users perform materially worse than warm users across repeated cohorts;
- users consistently prefer existing tools and cannot articulate why Steel should replace them;
- willingness-to-pay disappears when a real transaction is required;
- acquisition appears prohibitively difficult for the expected subscription value;
- the support/operational cost makes the product uneconomic;
- no clear painful problem or compelling value proposition emerges.

## Definition of success for this stage

The Controlled Early Access 250 stage succeeds when Steel has evidence that it is becoming a commercially viable product, not merely a polished beta.

Before advancing to 500 we should be able to answer, with data:
- Who is Steel best for?
- What recurring problem is it solving?
- Which features create repeat use?
- Which users retain best?
- Which acquisition channels bring those users?
- What price range can convert real users?
- Can Steel onboard/support them without founder intervention?
- Can we operate it safely at larger scale?

## Non-goals

- Do not chase vanity signup numbers.
- Do not scale paid advertising prematurely.
- Do not build merchandise fulfilment.
- Do not create referral rewards purely to manufacture growth.
- Do not remove or weaken Founding 20 lifetime access.
- Do not treat survey intent as paid validation.
- Do not declare product-market fit from 250 users alone.
- Do not jump directly to public launch.

## Next stage

If the 250-user gate passes, progress to **Release Candidate 500**.

That stage should validate:
- production-grade operational readiness;
- final pricing/package hypothesis;
- real paid conversion at larger scale;
- subscription lifecycle/cancellation support;
- acquisition repeatability;
- retention/cohort economics;
- launch support and incident processes;
- final public-launch gate.
