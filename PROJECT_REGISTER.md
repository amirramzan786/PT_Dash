# Project Steel — master project register

Last reconciled: 12 September 2026. This is the durable product record alongside the live repository in this Project Steel folder and the operating roadmap in Plane.

## Status key

- **Delivered** — implemented in the live Steel codebase or deployed backend.
- **Active** — the current approved build work.
- **Planned** — approved direction, deliberately not represented as live functionality.
- **Deferred** — valuable, but blocked by platform, commercial or product prerequisites.

## Product decisions to preserve

- Steel is evolving from a consumer fitness app into a broader platform. The existing app remains the client layer for Train, Fuel, Recover and Progress.
- Steel Coach is the first paid platform product. Start with independent personal trainers and small coaching businesses, validate with one or two real coaches, and expand only after the core coach-client relationship proves useful and commercially viable.
- Coaches pay for operational leverage; invited clients keep ownership of their accounts and data.
- Steel is an all-in-one home for training, meals, progress and future recovery data. It should learn from category-leading diary and coaching products, while keeping its own Project Steel experience, visual identity and implementation.
- Mobile ease of use is a first-class acceptance criterion: planned meals should log quickly, food portions/ingredients stay editable, and manual work is a fallback rather than the default.
- The live Steel application is the implementation source of truth. The nutrition diary prototype remains a design/research environment only.
- Current food search uses free/provider fallback data for validation. A licensed comprehensive UK branded-food catalogue is required before making coverage promises.
- Current step and wearable panels are planning/settings foundations, not live Apple Health, Health Connect, Garmin, WHOOP or Oura synchronisation. Native apps plus the relevant partner approvals are prerequisites.
- Recovery/readiness, sleep architecture, dynamic nutrition targets and intelligent deloads are approved product directions. They must use transparent inputs, remain non-diagnostic and never imply injury prediction.
- Start on free infrastructure while validating demand; move to paid food-data, device and infrastructure services only when the product and revenue justify them.

## Delivered — foundation, identity and access

- [x] Project Steel brand migration from the original PT Dashboard / FORGE product.
- [x] Premium dark Steel interface, Spartan visual system, generated brand artwork and Steel mark.
- [x] Authenticated React application, guest demo mode and production Supabase configuration.
- [x] Account creation, sign-in, password recovery/change and role-based access controls.
- [x] Profile avatar, profile navigation, phone field, settings privacy/support area and account disclosures.
- [x] Owner onboarding reset control and guarded onboarding completion before plan creation.
- [x] Database-backed profiles, roles, private programme intakes and versioned personalised training plans.

## Delivered — home, navigation and personal data

- [x] Responsive desktop/mobile app shell with collapsible desktop navigation, mobile navigation and More sheet.
- [x] Home dashboard, welcome/training metrics, daily steps and weight cards, plus progress/weight navigation.
- [x] Consolidated Home steps and weight metrics to avoid duplicated summaries.
- [x] Daily steps API/data field, authenticated manual fallback and source-aware Home/Progress selection (one authoritative daily record; no double-counting manual and future tracker data).
- [x] Welcome dashboard card and movement/step-ring visual refinements.
- [x] Settings accordions for personal profile, training preferences, step integrations and reminders.
- [x] Desktop collapsed-navigation hover tooltips.
- [x] Configurable reminder preferences: workout, meal-completion and motivation reminders; enable/disable and time controls.

## Delivered — training, workout logging and exercise library

- [x] Personalised programme generation and onboarding-driven training preferences.
- [x] Workout plan migration, active workout experience, mobile-first guided logging, flexible set actions and saved draft progress.
- [x] Workout swapping, same-muscle alternatives, custom workout builder and persisted custom sessions/settings.
- [x] Exercise library with search, filters, exercise metadata and technique/video links.
- [x] Free workout content catalogue API and expanded exercise catalogue.
- [x] Cardio tracking and incline-cardio finisher.
- [x] Weekly check-ins with auto-fill from activity, body data/media, scheduling and hardened private media storage.
- [x] Exercise and workout QA hardening, including personalised prescription display in active sessions.

## Delivered — meal planning, recipes and nutrition diary

- [x] Meal-plan navigation, assigned recipe library and recipes connected to assigned meal data.
- [x] Meal-plan alternatives aligned to targets, collapsible recipe library, planned meal choices and flexible meal logging.
- [x] Nutrition diary prototype covering food search, barcode scan path, custom meals and itemised ingredient editing.
- [x] Live mobile nutrition diary, visible logger entry points and mobile-focus handling.
- [x] Diary foundation schema, live daily food logging and editable recipe-food details.
- [x] Planned-meal actions split into **Log** and **Edit**, allowing immediate logging or changes before logging.
- [x] Food-catalog Edge Function, provider fallback/resilience and free UK-focused catalogue experimentation.
- [x] Food catalogue database migrations, cache/upsert repair and catalogue access rules.
- [x] Meal-plan control-centre and PT workflow schema foundations.

## Delivered — platform reliability and release work

- [x] Cloudflare-ready startup/dependency compatibility and resilient client loading/retry states.
- [x] Client-render blank-screen protection and production redeploy/recovery fixes.
- [x] Supabase RLS hardening, private media storage, foreign-key indexes and plan-control grants.
- [x] Food catalogue and nutrition diary migrations deployed to Supabase.
- [x] `food-catalog` Supabase Edge Function deployed.
- [x] Live Steel production URL: `https://pt-dash.pages.dev/#Home`.

## Active — Sprint 01: steps and activity foundation

- [ ] Define a unified activity model: steps, distance, active calories, workout minutes, source, timestamp and confidence.
- [ ] Make the Settings tracker area use truthful connection states: Not connected, Connect, Connected and Sync issue.
- [~] Build the steps dashboard: Home now shows today, 30-day trend, source label and manual entry. Remaining: 7-day average and user-set daily goal.
- [x] Add manual entry as the clear fallback and use the same data source on Home; deployed and verified by user.
- [ ] Add consent, disconnect, imported-data deletion and last-sync status.
- [~] Prevent double counting between sources: deterministic priority is live for manual vs future tracker records; cross-device deduplication remains for native integrations.
- [ ] Plan native iPhone Apple Health implementation.
- [ ] Plan native Android Health Connect implementation.

## Planned — Sprint 02: diary, meal-plan completion and QA

- [ ] Device QA: diary search, barcode camera permissions, food-detail portions, ingredient editing and planned meal logging.
- [ ] Replace the free catalogue with a licensed comprehensive UK branded-food provider when commercially viable.
- [ ] Meal-plan week scheduling, meal swaps, adherence and carry-over.
- [ ] PT review, approval and controlled meal-plan revision workflow.
- [ ] Payment/subscription entitlements and plan-change limits.
- [ ] Training-day/rest-day calorie and macro targets.
- [ ] Weekly calorie/macro adherence and weight rate-of-change views.

## Planned — Sprint 03: training intelligence and product polish

- [ ] Session RPE, soreness and energy check-in.
- [ ] Transparent recommendation states: train as planned, reduce volume, or consider recovery; PT-controlled.
- [ ] Ensure every generated workout has an appropriate image instead of a generic custom-session fallback.
- [ ] Improve mobile performance by splitting the large client JavaScript bundle.
- [ ] Make “Welcome back” a time-aware daily greeting with compact steps, workout, weight and nutrition summary.
- [ ] Let users choose units, a daily step goal and preferred connected activity source.

## Deferred — recovery, wearables and health intelligence

- [ ] Sleep dashboard: duration, stages, consistency, HRV and resting heart rate.
- [ ] Steel Readiness with transparent inputs and no diagnostic/medical claims.
- [ ] Deload suggestions from long-term trends, never injury predictions.
- [ ] Closed-app notifications and scheduled background sync.
- [ ] Garmin Health integration — requires commercial partnership/API approval.
- [ ] WHOOP integration — OAuth/data scopes and production access approval.
- [ ] Oura integration — OAuth, webhook handling and production access approval.
- [ ] Heart-rate/BLE equipment support and additional connected-device data.

## Planned platform expansion — Steel Coach

- **Sprint 05 — Foundation and pilot design:** validate with one or two coaches; define roles, relationship lifecycle, consent, information architecture, pilot offer and success metrics.
- **Sprint 06 — Coach-client operations MVP:** onboarding, secure invitations, client roster, useful check-ins, messaging, programme assignment and controlled revisions.
- **Sprint 07 — Retention, communication and education:** missed-check-in automation, availability and local-time rules, progressive education, retention-risk signals and communication audit history.
- **Sprint 08 — Bookings, subscriptions and paid pilot:** diary/availability, consultations, packages, sponsored seats, payment boundaries, support runbook and paid-pilot evaluation.
- **Sprint 09 — Steel Growth:** lead CRM and AI-assisted content remain deferred until the paid pilot validates the wedge.
- **Sprint 10 — Marketplace and partnerships:** matching, reviews, integrations, partner offers and communities remain deferred behind trust and demand gates.
- **Sprint 11 — Steel Business and intelligence:** multi-coach organisations, gym dashboards, white-label, data intelligence, API/security and Steel Academy remain deferred behind repeatable economics.

## Implementation history — traceability

The webapp repository contains the detailed chronological implementation log. Material milestone commits include:

- **Product foundation and identity:** `ee0a6e7`, `19cd301`, `3768abc`, `b082cb7`, `d380eeb`, `88f0c52`, `bd11cc14`, `2a2a21d`, `6cc453c`, `71407ec`, `bd9db21`, `ab9c1ba`, `5e8bfbe`.
- **Mobile/home/settings:** `f75b852`, `89a76da`, `a7d7be0`, `b63fda8`, `5daf396`, `9c18d64`, `d17e9fc`, `1f0122f`, `b15af7e`, `14b54a1`, `7b65c4d`, `ed2d84e`, `4554d67`, `6ab7ef9`, `85ddaa0`, `125dd91`, `57437fc`.
- **Training, workouts and library:** `74224b3`, `bdbf682`, `99094d5`, `c9314f1`, `2904b50`, `5e65e53`, `11a1271`, `809d930`, `720fdec`, `68fd88f`, `a85c84a`, `cfbc76d`, `c4cbfc1`, `5c1f02c`, `ee28b42`.
- **Onboarding, personalisation and check-ins:** `dd039fb`, `121ad9c`, `adfee5e`, `d11cc14`, `ed8cd17`, `2dcded0`, `dc7ef79`, `c7bce38`, `1075d7c`, `e1a1000`, `6fc8e33`, `35a8112`, `329c791`.
- **Nutrition and recipes:** `0728639`, `340c3a1`, `942a663`, `dc4ad08`, `0d17162`, `1f97b3e`, `92edc11`, `c83f082`, `6381bc6`, `c0478c3`, `2c437a3`, `1593c91`, `4311770`, `37dd0d8`, `ba535dd`, `2e7657c`, `ad2af59`, `ba17f85`, `753e5e4`, `88b2716`.
- **Data, security and deployment:** `f464daa`, `8611054`, `5a6226f`, `7d52504`, `d4c2346`, `dff4e25`, `a5d68d2`, `979defb`, `66a5f48`.

## Operating rule

For every future Project Steel continuation, begin by reviewing this register, `ROADMAP.md` and the relevant Plane work item. Before hand-off, update the work item with scope, state, notable decision, verification result and next action. On closing a sprint, reconcile every item against the register, mark delivered work complete, carry unfinished items forward deliberately and record the next sprint. The register remains the durable product record; Plane is the operating board.
