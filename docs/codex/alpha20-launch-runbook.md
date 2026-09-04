# Project Steel — Alpha 20 Launch Runbook

**Branch:** `codex/founding20-beta-signups`  
**Status:** Authoritative operational playbook for the first live Alpha cohort  
**Cohort:** 20 users total, including the Founding 20 offer  

## Purpose

This runbook turns the existing Founding 20, recruitment, feedback, analytics and commercial-gate plans into one practical operating sequence.

The goal is to launch Alpha 20 safely, collect useful evidence quickly, fix meaningful problems, and decide whether Steel is ready to move to Beta 50.

This document does **not** replace:
- `founding20-product-rules.md`
- `founding20-beta-signups.md`
- `founding20-email-journey.md`
- `founding20-analytics-plan.md`
- `founding20-recruitment-plan.md`
- `founding20-beta-feedback-framework.md`
- `alpha20-commercial-gate.md`
- `founding20-in-app-founder-experience.md`

Those remain authoritative where they define specific product rules.

---

# 1. Alpha launch objective

By the end of Alpha 20, Steel should have evidence answering five questions:

1. Can a real user discover Steel, sign up, verify and access the app without founder intervention?
2. Can they complete onboarding and understand what to do next?
3. Can they repeatedly use the core workout / nutrition / progress experience without serious friction?
4. Do they return voluntarily because Steel is useful?
5. Is the product strong enough to justify inviting the next 30 users?

Alpha is not about making Steel perfect. It is about finding the highest-impact reasons a genuine target user would stop using it.

---

# 2. Pre-launch hard blockers

Do not invite the Alpha cohort until all of the following are true.

## Signup / Founder system

- Founding 20 signup backend implemented.
- Cloudflare Turnstile active.
- email verification flow active.
- duplicate / disposable-email protection active.
- rate limiting / cooldown active.
- atomic Founder #1–20 allocation tested.
- #21+ verified users route to waitlist if the 20 places are already taken.
- real claimed / remaining counter is server-backed.
- no fake static counter remains on the marketing site.
- verification window behaviour is tested.
- Founder lifetime Premium entitlement is created reliably.
- duplicate founder / pending / waitlist states behave correctly.

## App

- authenticated account creation works.
- onboarding works on the real production path.
- user receives a usable plan or safe fallback.
- workout start / logging / save works.
- nutrition / meal-plan core path does not contain a known blocker.
- progress / weight / check-in data remains scoped to the correct user.
- Settings loads reliably.
- Founder recognition is visible for legitimate Founders only.
- `Founder #XX` and `PREMIUM FREE FOR LIFE` state is server-backed.
- in-app Beta Feedback works.
- `You asked. We listened.` / What’s New route is available or safely ready for the first shipped Alpha update.

## Production / legal minimum

- marketing site points to the real signup flow.
- public copy accurately describes Alpha / Founding 20 status.
- Privacy / Terms / Founding 20 / health-disclaimer links are present in factual pre-launch form where required.
- support contact route exists.
- production errors can be investigated.
- no known critical security or cross-user data issue exists.

If any critical item above fails, Alpha launch status = **HOLD**.

---

# 3. Final pre-flight QA

Run this immediately before inviting the first real Alpha user.

## Signup test accounts

Test at minimum:

1. new legitimate email → accepted → verification → Founder allocation;
2. pending duplicate signup;
3. verified Founder duplicate;
4. disposable / blocked email;
5. Turnstile failure;
6. excessive attempts / cooldown;
7. expired verification attempt;
8. resend verification;
9. Founder slot #20 concurrency test;
10. verified user after the Founder cap is full → waitlist.

## Account linking / entitlement

Confirm:

- verified Founder can create / finish Steel account;
- correct Founder number follows the user account;
- lifetime Premium entitlement exists;
- no billing provider or expiry is required;
- sign-out / sign-in preserves Founder state;
- password/account changes do not remove entitlement;
- a deliberately simulated entitlement mismatch fails safely and provides a recovery path.

## Device QA

At minimum verify:

- current Android phone viewport;
- iPhone-sized mobile viewport;
- desktop browser;
- portrait mobile navigation;
- Settings / Founder card / feedback form;
- marketing-site signup on mobile.

---

# 4. Recruitment sequence

Do not release all 20 slots blindly at once if we can learn safely from a small initial wave.

Recommended operational sequence:

## Wave A — first 5

Use the strongest warm A-tier testers first.

Purpose:
- production smoke test;
- verify signup / entitlement / onboarding with real people;
- catch obvious problems before wider social promotion.

Do not artificially reserve Founder numbers. They still secure their place only through the locked verified-email allocation rules.

Run Wave A for roughly 24–72 hours depending on issue severity.

If there is a critical blocker, pause promotion, fix it, and re-test.

## Wave B — next 5

Add the remainder of the warm cohort / deliberately varied user types.

Purpose:
- widen usability coverage;
- test less technical / beginner / returner / competitor-app behaviour.

## Wave C — public / cold recruitment

Once the first 10 can use Steel without major founder intervention, publish the prepared social campaign across suitable channels such as:

- Facebook;
- Instagram;
- Snapchat;
- Reddit where community rules allow;
- relevant organic fitness communities.

Use the same public Founding 20 rules. Do not manually promise a Founder number before verification.

---

# 5. Alpha tester expectations

Founder entitlement is **not conditional on activity** once legitimately allocated.

However recruitment should make clear that we are looking for people who intend to genuinely test Steel.

Working tester expectation:

- complete onboarding;
- use Steel for approximately 2–4 weeks;
- log real workouts where possible;
- explore relevant nutrition / progress features;
- submit useful feedback when something breaks or feels confusing;
- respond to lightweight Alpha pulses where practical.

Avoid pressuring testers into daily usage merely to improve metrics.

---

# 6. Alpha operating rhythm

## Day 0 / signup day

Check:

- signup accepted;
- verification rate;
- founder allocation correctness;
- account completion;
- onboarding completion;
- first meaningful app action;
- first-workout initiation where applicable;
- immediate support questions.

Collect the Day 0 first-impression pulse from the feedback framework.

## First 72 hours

Focus almost entirely on blockers and friction.

Priority questions:

- Did anyone fail signup / verification?
- Did anyone need manual help to complete onboarding?
- Did any user receive broken or clearly unsuitable content?
- Did workout logging fail?
- Did navigation confuse multiple people?
- Did anyone believe they had lost Founder status?
- Are multiple users asking the same support question?

## After approximately 3 workouts

Trigger / request the 3-workout feedback pulse.

Focus on:

- workout logging speed;
- exercise flow;
- substitutions / editing friction;
- clarity of sets / reps / completion;
- whether users naturally return to Steel for the next session.

## Around Day 7

Review:

- D7 return;
- number of active Alpha users;
- workout recurrence;
- nutrition / progress adoption;
- support volume;
- recurring confusion;
- top value signals;
- users who have effectively abandoned the app.

Run the Day 7 feedback questions defined in the feedback framework.

## Around Day 14

Review:

- D14 retention;
- voluntary return behaviour;
- whether Steel is replacing notes / spreadsheet / another app for anyone;
- what users would miss if Steel disappeared;
- continuation intent;
- hypothetical willingness to pay as research only.

Do not activate billing during Alpha 20.

## Weeks 3–4

Only extend Alpha if useful evidence is still developing or material fixes need re-testing.

Do not leave Alpha open indefinitely because it is comfortable.

---

# 7. Daily owner check

During active Alpha, review once per day rather than obsessively monitoring individual users.

The daily view should eventually answer:

- total verified Alpha users;
- Founders allocated;
- remaining Founder places;
- onboarding completions;
- users completing first meaningful action;
- workouts logged in the last 24 hours;
- active users in the last 24h / 7d;
- new feedback submissions;
- open critical / high-priority issues;
- signup / verification failures;
- entitlement inconsistencies;
- support requests requiring action.

Do not surface private health / nutrition details in an admin view unless operationally necessary.

---

# 8. Feedback triage

Every meaningful feedback item gets one primary classification:

- **BUG** — something is broken or produces an incorrect result;
- **FRICTION** — technically works but is confusing / slow / awkward;
- **FEATURE REQUEST** — desired capability that does not exist;
- **VALUE SIGNAL** — evidence about why Steel is useful / not useful.

Then assign severity / importance.

## P0 — critical

Examples:
- security / cross-user data issue;
- users cannot sign in;
- widespread inability to save workouts;
- Founder entitlement incorrectly removed;
- data loss.

Action: pause expansion immediately.

## P1 — high

Examples:
- major core journey repeatedly fails;
- onboarding produces unusable result for multiple target users;
- mobile UI blocks a key task;
- common signup / verification problem.

Action: fix before the next recruitment wave where possible.

## P2 — medium

Examples:
- repeated confusion;
- awkward navigation;
- workflow requires unnecessary taps;
- important but non-blocking content problem.

Action: prioritise during Alpha based on frequency / impact.

## P3 — low / enhancement

Examples:
- polish;
- personal preference;
- edge-case convenience;
- non-core feature request.

Action: record; do not derail Alpha.

---

# 9. Prioritisation rule

Do not implement every Alpha request.

Prioritise using:

**Severity × frequency × target-user relevance × impact on activation / retention**

A feature requested by one enthusiastic user is not automatically more important than a confusing step that causes five quiet users to leave.

Do not turn Alpha into bespoke software for the loudest Founder.

---

# 10. “You asked. We listened.” operating rule

Use the in-app update channel to visibly close the loop on meaningful Alpha improvements.

Good entry format:

**You asked:** Workout substitutions were hard to find during a live session.  
**We listened:** Exercise replacement is now available directly inside the active workout flow.

Keep entries short, dated and user-facing.

Use it for:

- meaningful fixes;
- repeated usability improvements;
- requested features that materially improve Steel;
- major Alpha refinements.

Do not publish every deployment, internal refactor or invisible backend change.

---

# 11. Alpha issue-fix-retest loop

For each P0/P1 or repeated P2 issue:

1. reproduce it;
2. identify affected users / path without over-collecting user data;
3. implement the smallest safe fix;
4. run regression tests;
5. deploy safely;
6. confirm the original path now works;
7. ask affected tester(s) to retry where useful;
8. record outcome;
9. publish a `You asked. We listened.` entry if the change is meaningful to users.

Do not recruit additional users to compensate for unresolved failures.

---

# 12. Alpha evidence dashboard

The eventual internal Alpha decision view should group evidence into:

## Acquisition / signup
- source;
- request-access conversion;
- accepted signup;
- verification;
- Founder allocation / waitlist;
- account completion.

## Activation
- onboarding completion;
- first meaningful action;
- first workout started;
- first workout completed / saved.

## Engagement
- repeat workouts;
- active days;
- nutrition use where relevant;
- progress / check-in use;
- voluntary return frequency.

## Retention
- D7;
- D14;
- active weeks;
- continuation intent.

## Qualitative value
- disappointed-if-Steel-disappeared response;
- features users value most;
- alternatives Steel replaces;
- key reasons for abandoning / continuing.

## Operations
- bugs by severity;
- support requests per active user;
- repeated friction themes;
- entitlement / signup incidents.

Always compare warm vs cold where the sample allows it.

---

# 13. Alpha 20 exit review

Run a formal review once enough users have had approximately 14–28 days to use Steel.

Use `alpha20-commercial-gate.md` as the authoritative metric / decision framework.

The outcome must be one of:

## GO → Beta 50

Proceed only if:

- core journeys are stable enough;
- cold users show genuine value, not just mates supporting the project;
- repeat usage exists;
- retention / continuation signals are promising;
- support burden is manageable;
- no unresolved critical security / data / entitlement problem exists.

Then recruit users 21–50 under the Beta 50 plan.

## ITERATE → stay at Alpha 20

Hold the cohort if:

- product value looks promising but friction remains;
- onboarding / workout flow still loses too many users;
- important bugs remain;
- retention is ambiguous;
- support burden is too high.

Fix specific issues and re-test the existing cohort before adding more users.

## STOP / REPOSITION

Do not move to Beta 50 if repeated refinements still produce weak usage and weak value evidence.

Reassess the target customer / proposition / scope rather than continuing to scale a weak product.

---

# 14. What Amir personally needs to do during Alpha

Keep the founder workload deliberately small.

Primary responsibilities:

1. recruit / invite suitable testers;
2. watch the high-level Alpha dashboard;
3. respond to genuine support / entitlement problems;
4. discuss important product feedback here and decide priorities;
5. approve meaningful fixes before deployment when needed;
6. publish / approve `You asked. We listened.` updates;
7. run the Alpha exit review.

Avoid manually coaching every tester through Steel. If users need constant personal guidance, that is product evidence and should be fixed in the app.

---

# 15. Immediate sequence from current project state

Before Alpha can start, complete these in order:

1. Run Codex against the Founding 20 implementation pack on `codex/founding20-beta-signups`.
2. Review the Codex PR here before merge.
3. Apply / verify Supabase migrations and Edge Functions.
4. Configure Turnstile and required production secrets.
5. Connect the marketing signup form to the real backend.
6. Replace the static Founder counter with the real aggregate counter.
7. Implement / verify Founder card, lifetime badge, Beta Feedback and What’s New experience.
8. Run the pre-flight QA in this runbook.
9. Deploy the production build.
10. Invite Wave A — the first 5 strong testers.

Do **not** start social promotion before steps 1–8 are complete.

---

# Final operating principle

Alpha 20 is not a marketing milestone.

It is Steel’s first real product test.

The objective is to learn fast enough that, by the time we consider users 21–50, the product is measurably easier to adopt, more reliable to use, and more valuable than it was for user #1.
