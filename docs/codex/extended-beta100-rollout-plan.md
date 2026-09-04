# Project Steel — Extended Beta 100 rollout plan

**Branch:** `codex/founding20-beta-signups`
**Status:** Authoritative staged-rollout plan for later Codex/product execution.

## Stage objective

Extended Beta 100 exists to answer a different question from Alpha 20 and Beta 50:

> Can Steel support a broader, less curated audience while preserving activation, retention, product quality, supportability and commercial signal?

The stage should not begin until the Beta 50 GO gate is met.

## Cohort structure

Total users: **100**.

- Original Alpha 20 remain in cohort and keep Founding Member lifetime entitlement.
- Beta 21–50 remain on free Beta access.
- Add **50 new users** for Extended Beta.

The new 50 should be less hand-picked than earlier cohorts so Steel is tested against more realistic market variability.

Recommended mix:
- UK + international English-speaking users;
- beginner, returning, intermediate and advanced gym users;
- users who currently track via notes/spreadsheets;
- users who currently use competitor fitness apps;
- some nutrition-first users;
- some training-first users;
- some users less comfortable with technology;
- no requirement to be influencers, PTs or content creators.

Avoid over-indexing toward Amir's personal network.

## Offer rules

Users 51–100 do **not** receive the Founding 20 lifetime Premium promise.

Default offer at this stage:
- free Extended Beta access;
- no payment card required;
- clear disclosure that beta access is temporary and pricing may apply later;
- no accidental promise of permanent free access.

Founding 20 entitlements remain untouched.

## What this stage tests

### 1. Broader onboarding reliability

Measure:
- landing page → signup conversion;
- verification completion;
- account completion;
- onboarding completion;
- first useful action;
- first workout completion;
- nutrition interaction where relevant;
- abandonment points.

The goal is to prove the onboarding experience works without founder assistance.

### 2. Self-service usability

Users should be able to understand Steel without Amir explaining the product personally.

Track:
- support requests per active user;
- repeated questions;
- pages associated with high feedback/friction rates;
- whether users can independently find training, nutrition, progress, Settings and feedback tools;
- time-to-first-value.

### 3. Retention at larger scale

Measure cohort retention at:
- Day 1;
- Day 7;
- Day 14;
- Day 30 where the stage runs long enough.

Also track:
- repeat workout logging;
- weekly active users;
- workouts per active user;
- meaningful nutrition usage;
- progress/check-in usage;
- return after receiving a `You asked. We listened.` update.

### 4. Product breadth

Determine whether Steel's combined proposition is actually useful:

**Train → Fuel → Recover → Progress**

Do not assume every user needs every module.

Measure which combinations correlate with retention, for example:
- training only;
- training + nutrition;
- training + progress;
- full-system users.

Use this to identify Steel's true core product rather than forcing every module equally.

### 5. Reliability and scale

At 100 users, operational issues become more meaningful.

Track:
- auth failures;
- signup/verification failures;
- entitlement errors;
- database/API errors;
- slow or failed app loads;
- workout save failures;
- feedback submission failures;
- mobile/browser-specific issues;
- support incidents;
- any data isolation/RLS issue.

Any privacy, account-isolation or entitlement-security failure is a blocker regardless of otherwise strong metrics.

### 6. Feedback system quality

Use the existing in-app Beta Feedback system and `You asked. We listened.` loop.

Feedback should continue to be classified as:
- bug;
- friction/confusion;
- feature request;
- signal of value.

At 100 users, begin prioritising repeated themes over isolated requests.

Suggested rule:
- 1 report = inspect;
- 3 independent similar reports = pattern;
- repeated pattern affecting core flow = prioritise;
- requests inconsistent with Steel's positioning should not automatically become roadmap items.

## Commercial validation at 100

This is the first stage where commercial evidence should become substantially stronger.

### Pricing research

Billing should still remain OFF unless explicitly approved after evidence review.

Run structured pricing research such as:
- `Would you pay for Steel if your beta access ended?`
- `At what monthly price would Steel feel like good value?`
- `At what price would it feel too expensive?`
- compare reactions to candidate monthly and annual pricing;
- ask what currently paid tool Steel would replace or complement.

Do not treat survey intent as proof of payment.

### Stronger commercial signals

Prioritise evidence in this order:
1. users repeatedly use the product;
2. users say they would be disappointed to lose it;
3. users prefer Steel to an existing method/tool;
4. users voluntarily ask what it will cost;
5. users say they would pay a plausible price;
6. later stage users actually pay.

## Competitor displacement

For users already using products such as Hevy, Strong, MyFitnessPal, MacroFactor or spreadsheets/notes, capture:
- what they continued using alongside Steel;
- what Steel replaced;
- what Steel could not replace;
- what would make them switch fully;
- which competitor feature creates the strongest resistance to switching.

The goal is not to copy every competitor feature. It is to identify Steel's strongest differentiated reason to exist.

## Supportability threshold

Extended Beta should expose whether the product can be operated without becoming a full-time support burden.

Track:
- support requests per 100 active users;
- percentage of issues solved by product UX vs manual help;
- repeated support categories;
- mean time to acknowledge/fix high-severity issues;
- how often Amir must personally explain basic functionality.

If normal users routinely require personal guidance, the stage should ITERATE rather than grow.

## Extended Beta 100 GO / ITERATE / STOP gate

Exact numerical thresholds should be reviewed against real Alpha/Beta baselines rather than blindly fixed now, but the decision must use the following evidence categories.

### GO to Controlled Early Access 250

Move forward only when the combined evidence shows:
- onboarding and verification are reliable;
- most activated users reach a meaningful first action;
- repeat usage is healthy enough to suggest habit formation;
- Day 7/14 retention does not materially collapse compared with Beta 50;
- cold/independent users show value, not only warm users;
- recurring core UX friction has been resolved or is manageable;
- no critical privacy, entitlement or account-isolation defect exists;
- support load is operationally manageable;
- there is credible willingness-to-pay signal at realistic pricing;
- Steel has a recognisable core value proposition users can describe in their own words.

### ITERATE at 100

Stay at this stage when:
- there is clear product value but retention is inconsistent;
- one major onboarding/workout/nutrition friction pattern is suppressing adoption;
- users like Steel but cannot articulate why they would choose it over alternatives;
- pricing feedback is too weak or contradictory;
- support demand is too high;
- performance/reliability is not ready for 250 users.

Fix the highest-leverage problems, publish meaningful changes through `You asked. We listened.`, and re-measure the existing cohort before adding users.

### STOP / rethink direction

Do not continue scaling the same proposition if, after reasonable iteration:
- independent users consistently fail to activate;
- repeat usage remains weak;
- users show little disappointment at losing Steel;
- the product does not replace or materially improve an existing workflow;
- willingness-to-pay remains implausible;
- support/technical cost is structurally disproportionate to value;
- the core proposition remains unclear even after refinement.

STOP does not necessarily mean kill Project Steel. It can mean narrow the product, change target customer, alter positioning or reconsider the commercial model.

## Analytics cuts required

At 100 users, compare performance by:
- Alpha vs Beta 50 vs new Extended Beta users;
- warm vs cold acquisition;
- UK vs international;
- beginner/returning vs intermediate/advanced;
- competitor-app users vs manual trackers;
- acquisition source;
- primary usage pattern (training / nutrition / combined);
- device/browser where useful.

Avoid reporting tiny segments as statistically meaningful. Use them to spot patterns, not manufacture certainty.

## `You asked. We listened.` role

At this stage the feature becomes part of trust-building and retention.

When significant tester-driven improvements ship:
- publish a concise release note;
- identify the affected area;
- state what changed in user language;
- avoid exposing individual tester identity unless explicit permission exists;
- track whether users open/read the update and whether affected behaviour improves afterwards.

## Operational readiness before 250

Before moving to Controlled Early Access 250, Steel should have:
- dependable auth/signup/verification;
- dependable membership/entitlement state;
- in-app feedback persistence;
- usable internal feedback/release-note visibility;
- meaningful product analytics;
- basic incident/error monitoring;
- clear privacy/legal launch material progressing toward finalisation;
- support contact/process;
- documented release/deployment process;
- rollback plan for damaging releases;
- no fake counters or fake social proof.

## Billing rule

Do not automatically turn billing on at 100 users.

The 100-user stage is where pricing evidence becomes strong enough to decide **whether and how** to introduce a paid validation experiment later.

Any first paid cohort should be deliberately designed, clearly disclosed and must preserve Founding 20 lifetime access.

## Exit output

At the end of Extended Beta 100 produce a short decision memo containing:
- cohort numbers;
- acquisition sources;
- activation;
- D7/D14/D30 retention where available;
- repeated usage;
- support volume;
- top bugs/friction themes;
- strongest value signals;
- pricing evidence;
- competitor displacement evidence;
- reliability/security incidents;
- changes shipped from user feedback;
- decision: **GO / ITERATE / STOP**;
- rationale;
- top priorities before the next stage.

## Next stage

If this gate passes, move to:

**Controlled Early Access — 250 users**

That stage should focus on controlled acquisition, operational scale, stronger pricing/payment validation and proving that Steel can move toward a sustainable public product rather than merely a successful beta.