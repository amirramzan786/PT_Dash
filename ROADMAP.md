# Project Steel roadmap

For the complete delivered/active/planned record and implementation traceability, see [PROJECT_REGISTER.md](PROJECT_REGISTER.md).

## Delivery sequence and gates

1. **Stabilise the current product and Git baseline.** Validate the Founder 20 beta-signup branch, merge or deliberately close it, restore a clean production path, and reconcile active Plane items.
2. **Finish the client activity foundation.** Complete the unified activity model, truthful tracker states, 7-day average and goal, consent/disconnect/deletion/last-sync behaviour, and cross-source deduplication design.
3. **Run Steel Coach discovery (Sprint 05).** Work with one or two real coaches; confirm the painful jobs, role/permission model, data lifecycle, privacy controls, prototype, pricing hypothesis, and measurable pilot success criteria.
4. **Build only the validated operations MVP (Sprints 06–07).** Deliver secure invitations, roster and progress overview, check-ins, messaging, programme control, missed-check-in automation, availability rules, education journeys, and explainable retention signals.
5. **Prove willingness to pay (Sprint 08).** Add booking and subscription essentials, define payment and support boundaries, run a small paid pilot, and make an evidence-based continue/pivot/stop decision.
6. **Unlock expansion only after the pilot gates pass.** Steel Growth (Sprint 09), marketplace/integrations (Sprint 10), and business/white-label/intelligence (Sprint 11) stay deferred until activation, retention, coach time saved, client outcomes, safety, and unit economics support investment.

## Pilot success gates

- Coaches activate without founder-led setup and successfully invite real clients.
- Clients consent, join, check in, and communicate without avoidable confusion or privacy concerns.
- Coaches can identify the next useful action faster than with their existing workflow.
- The product demonstrates repeat weekly usage and credible willingness to pay.
- Support load, safeguarding risk, data handling and payment operations remain manageable.
- Expansion work does not begin on enthusiasm alone; the decision is recorded in Plane with evidence.

## Immediate priority — activity and steps

- [ ] Define a single activity data model for steps, distance, active calories, workout minutes, source, timestamp and confidence.
- [ ] Add a **Connect activity tracker** area in Settings with clear statuses: Not connected, Connect, Connected and Sync issue.
- [ ] Build the steps dashboard: today, 7-day average, weekly goal, trend and source label.
- [x] Add manual step entry as a fallback; deployed and user-verified.
- [x] Make the Home-page steps card use this same source of truth, with an authenticated manual fallback and tracker-source priority.
- [ ] Add consent, disconnect, imported-data deletion and last-sync status.
- [ ] Build Apple Health integration for iPhone.
- [ ] Build Android Health Connect integration for Android.
- [~] Prevent duplicate counting across sources: manual versus future tracker priority is complete; native cross-device deduplication remains.
- [ ] Add Garmin after API partnership and commercial terms are approved.
- [ ] Add WHOOP and Oura afterward, initially for activity/recovery data only.

## Next — daily experience

- [ ] Add time-aware “Welcome back” greeting on Home.
- [ ] Show steps, workout status, weight trend and nutrition status in a compact daily summary.
- [ ] Add activity reminders based on the user’s chosen step goal.
- [ ] Let users choose units, daily step goal and preferred connected source.

## Training and nutrition intelligence

- [ ] Introduce workout-day and rest-day nutrition targets.
- [ ] Add weekly calorie and macro adherence views.
- [ ] Show weight rate-of-change rather than day-to-day judgement.
- [ ] Add session RPE, soreness and energy check-in.
- [ ] Recommend “train as planned”, “reduce volume” or “consider recovery”, with PT approval controls.

## Later — recovery and sleep

- [ ] Build sleep dashboard: duration, stages, consistency, HRV and resting heart rate.
- [ ] Build Steel Readiness with a transparent explanation of its inputs.
- [ ] Offer deload suggestions from trends, never injury predictions.
- [ ] Deliver closed-app notifications and scheduled background sync.

## Existing platform work still required

- [ ] Mobile/device QA for diary, planned meals, ingredient editing and barcode camera flow.
- [ ] Replace free food data with a licensed, comprehensive UK branded-food catalogue.
- [ ] Add meal-plan week scheduling, swaps, adherence and carry-over.
- [ ] Build PT review, approval and controlled plan-revision workflow.
- [ ] Enforce subscriptions, plan-change limits and payment entitlements.
- [ ] Ensure every generated workout has an appropriate image.
- [ ] Split the large JavaScript bundle to improve mobile loading.
