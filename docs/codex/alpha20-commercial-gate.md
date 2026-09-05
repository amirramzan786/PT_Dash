# Project Steel — Alpha 20 Commercial Gate

**Branch:** `codex/founding20-beta-signups`
**Status:** Authoritative product/commercial gate for Alpha 20 → Beta 50.

## Purpose

Steel must not widen from the first 20 Alpha users to a 50-user Beta simply because the first cohort exists. Expansion happens only when the product demonstrates enough activation, usage, retention, value and stability to justify a larger cohort.

This gate is deliberately evidence-led. The outcome after Alpha 20 is one of:

- **GO** — expand to Beta 50.
- **ITERATE** — remain capped at 20 while fixing material issues, then re-measure.
- **STOP / REASSESS** — pause expansion and reconsider product positioning, target user, core value or build direction.

## Alpha 20 evaluation window

Primary evaluation window: first **14 days after each tester activates**.

Where cohort timing is staggered, report both:
- cohort-relative metrics measured from each user's activation date; and
- an overall Alpha snapshot once at least 15 of the 20 have had a full 14-day opportunity to use Steel.

Do not judge the cohort from signups alone.

## Core Alpha metrics

### 1. Verified Alpha allocation
Target:
- 20 legitimate, verified Alpha members allocated.
- no duplicate/fake allocation problem.
- founder/lifetime entitlement integrity confirmed.

This is a prerequisite, not a product-success metric.

### 2. Activation
Definition: a verified Alpha member completes onboarding and performs at least one meaningful core action in Steel.

Meaningful core actions include:
- completing or logging a workout;
- using a personalised plan;
- logging nutrition/meal activity;
- completing a progress/weight/check-in action.

**GO threshold:** >= 75% activation.
**ITERATE:** 50–74%.
**STOP / REASSESS:** < 50%, unless a clear technical blocker explains the result.

### 3. First-workout conversion
Definition: percentage of activated Alpha members who complete/log at least one workout.

**GO:** >= 70%.
**ITERATE:** 45–69%.
**STOP / REASSESS:** < 45%.

This is one of Steel's strongest early indicators because training is a central product job-to-be-done.

### 4. Repeat usage
Definition: percentage of activated members who return and complete a meaningful core action on at least 3 separate days within their first 14 days.

**GO:** >= 60%.
**ITERATE:** 35–59%.
**STOP / REASSESS:** < 35%.

### 5. Day-7 return
Definition: percentage of activated members who return to Steel around day 7, using an acceptable 5–9 day window.

**GO:** >= 50%.
**ITERATE:** 30–49%.
**STOP / REASSESS:** < 30%.

### 6. Day-14 retained usage
Definition: percentage of activated members who perform at least one meaningful action during days 10–14.

**GO:** >= 40%.
**ITERATE:** 20–39%.
**STOP / REASSESS:** < 20%.

Alpha is too small for statistical certainty; use this as directional evidence, not a vanity KPI.

## Value / product-market signal

### 7. "Would you be disappointed if Steel disappeared tomorrow?"
Ask around day 14 using the feedback framework.

Responses:
- Very disappointed
- Somewhat disappointed
- Not disappointed

**Strong GO signal:** >= 40% of respondents select **Very disappointed**.
**Promising / ITERATE:** 20–39%.
**Weak:** < 20%.

Do not use this question alone to make the expansion decision.

### 8. Clear value statement
At least 50% of active testers should be able to identify a specific reason Steel is useful, such as:
- keeping training/nutrition/progress together;
- making workouts easier to follow/log;
- reducing app-switching;
- clearer progress visibility;
- useful personalisation.

Generic praise such as "looks nice" does not count as a value signal.

### 9. Organic continuation intent
Ask: **"Would you keep using Steel after this test if your access stayed available?"**

**GO:** >= 60% yes.
**ITERATE:** 40–59%.
**STOP / REASSESS:** < 40%.

## Commercial signal

Alpha Founders already receive core Premium free for life, so willingness-to-pay must be measured hypothetically and carefully rather than charging them.

Ask near the end of Alpha:

**"If you were not a Founding Member, would Steel feel worth paying for once it is fully refined?"**

Answer choices:
- Definitely
- Probably
- Unsure
- Probably not
- Definitely not

**GO commercial signal:** >= 50% Definitely + Probably, with at least some "Definitely" responses from cold/independent testers.
**ITERATE:** 30–49% positive.
**STOP / REASSESS:** < 30% positive.

Do not announce or hard-code pricing from this alone. Pricing validation happens in later cohorts.

## Quality and reliability gate

Steel must not expand if the app is materially unreliable even when users like the concept.

Before Beta 50:

- no unresolved P0 / critical data-loss, security, auth or entitlement bugs;
- no repeatable P1 issue blocking onboarding, login, starting/saving workouts or core navigation;
- founder allocation and Premium entitlement reconciliation tested;
- feedback submission working;
- mobile experience usable on representative Android and iOS/mobile-browser sizes;
- no recurring crash or app-freeze pattern affecting >10% of active testers;
- no known privacy/security defect that should block expansion.

Any unresolved critical issue forces **ITERATE**, regardless of engagement metrics.

## Feedback quality gate

Before expansion, review all Alpha feedback and classify it as:

- bug;
- friction/confusion;
- feature request;
- value signal.

### GO expectations

- no unresolved repeated high-severity friction affecting a core flow;
- top recurring Alpha complaints have either been fixed or deliberately accepted with documented reasoning;
- "You asked. We listened." contains genuine Alpha-driven improvements, not filler release notes;
- at least one material product improvement has been made from Alpha feedback where feedback justifies it.

## Warm vs cold tester check

Warm users can over-index positively because they know the founder. Therefore:

- report warm and cold cohorts separately;
- cold-user activation, retention and value signals must not collapse relative to warm users;
- at least 3 cold/independent testers should reach meaningful repeated usage before declaring a strong GO.

If warm testers love Steel but cold testers barely use it, default to **ITERATE / REASSESS positioning** rather than GO.

## UK vs international check

Report UK and international users separately when sample size allows.

Do not block Beta 50 because one geography has too few users to infer anything, but record:
- onboarding issues;
- terminology/localisation issues;
- nutrition/unit expectations;
- time/date/format problems;
- materially different usage behaviour.

## Decision matrix

### GO → Beta 50
Proceed when all are broadly true:

- >= 75% activation;
- >= 70% first-workout conversion;
- >= 60% repeat meaningful usage;
- >= 50% Day-7 return;
- >= 40% Day-14 retained usage;
- >= 40% "Very disappointed" among respondents OR equivalent strong qualitative value evidence;
- >= 60% intend to keep using Steel;
- >= 50% show positive hypothetical willingness-to-pay;
- cold-user evidence is credible;
- no critical reliability/security blockers;
- repeated high-severity friction is resolved or materially reduced.

Not every metric has to hit the exact number if the overall evidence is unusually strong, but any override must be documented with the reason.

### ITERATE → remain at Alpha 20
Choose ITERATE when:

- users see value but activation/retention is below target;
- a core flow is creating repeated friction;
- product quality is suppressing usage;
- feedback indicates a fixable positioning/onboarding problem;
- warm and cold cohorts diverge materially;
- commercial signal is weak but usage/value signal is promising.

Action:
1. prioritise the top 1–3 root causes;
2. ship fixes;
3. publish relevant changes in "You asked. We listened.";
4. re-measure affected Alpha users;
5. repeat the gate.

Do not recruit users 21–50 merely to compensate for poor Alpha engagement.

### STOP / REASSESS
Trigger a serious reassessment when several of these are true after core bugs are removed:

- < 50% activation;
- < 45% first-workout conversion;
- < 35% repeat meaningful usage;
- < 20% Day-14 retained usage;
- users cannot articulate a specific value proposition;
- < 30% positive hypothetical willingness-to-pay;
- cold users show little interest despite appropriate recruitment;
- repeated feedback suggests Steel does not solve a painful enough problem.

STOP does **not** automatically mean abandon Steel. It means do not scale the current proposition. Revisit target customer, problem, positioning, core workflows or commercial model first.

## Founder entitlement protection

The Alpha commercial gate must never be used to retrospectively remove valid Founding 20 lifetime Premium access. Once legitimately allocated under the locked Founding 20 rules, that entitlement remains subject only to the separate abuse/remediation rules already defined.

## Alpha dashboard / review output

At Alpha review, produce one concise decision report containing:

- verified / allocated count;
- activated count and rate;
- first-workout conversion;
- repeat-usage rate;
- Day-7 and Day-14 retention;
- warm vs cold comparison;
- UK vs international observations;
- top 5 bugs/friction points;
- top 5 value signals;
- feature requests by frequency;
- "Very disappointed" result;
- continuation intent;
- hypothetical willingness-to-pay;
- critical open defects;
- Alpha changes shipped via "You asked. We listened.";
- final decision: GO / ITERATE / STOP;
- rationale;
- next 3 actions.

## Relationship to staged rollout

This is the first gate in:

**Alpha 20 → Beta 50 → Extended Beta 100 → Controlled Early Access 250 → Release Candidate 500 → Public Launch**.

Later gates should become stricter and progressively add:
- scalability;
- support burden;
- pricing validation;
- conversion to paid plans;
- churn;
- acquisition economics;
- infrastructure cost;
- operational readiness.

The Alpha gate is primarily about proving: **people activate, use Steel repeatedly, derive real value, and want it to continue.**
