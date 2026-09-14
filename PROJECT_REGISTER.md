# Project Steel — master project register

Last reconciled: 14 September 2026. This is the durable product record alongside the live repository in this Project Steel folder and the operating roadmap in Plane.

## Status key

- **Delivered** — implemented in the live Steel codebase or deployed backend.
- **Active** — the current approved build work.
- **Planned** — approved direction, deliberately not represented as live functionality.
- **Deferred** — valuable, but blocked by platform, commercial or product prerequisites.

## Product decisions to preserve

- Steel is evolving from a consumer fitness app into a broader platform. The existing app remains the client layer for Train, Fuel, Recover and Progress.
- Steel Coach is the first paid platform product. Start with independent personal trainers and small coaching businesses, validate with one or two real coaches, and expand only after the core coach-client relationship proves useful and commercially viable.
- Naming distinction: **Steel Coach** means the human PT/client relationship and consent-led coach workspace; **Atlas / Ask Atlas** is the current AI assistant; **Steel AI Coach** is the future paid, insight-first AI product and is not yet the human Coach workspace.
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
- [x] Authenticated mobile release QA for Home and Settings: mobile navigation,
  Founder entitlement, truthful integration states and reminder controls passed
  on the deployed app.
- [x] Native Android safe-area handling now consumes Capacitor SystemBars insets
  for the top status bar and bottom navigation, preventing the app header from
  rendering underneath the emulator/device status bar.
- [x] Android emulator WebView surfaces use an emulator-only software layer to
  prevent stale composited tiles during SPA navigation; physical devices retain
  hardware compositing.
- [x] Home’s Today’s Direction card keeps its guidance copy and gold Start
  session action inside a visible, responsive panel on narrow Android screens.
- [x] Home dashboard, welcome/training metrics, daily steps and weight cards, plus progress/weight navigation.
- [x] Consolidated Home steps and weight metrics to avoid duplicated summaries.
- [x] Daily steps API/data field, authenticated manual fallback and source-aware Home/Progress selection (one authoritative daily record; no double-counting manual and future tracker data).
- [x] Welcome dashboard card and movement/step-ring visual refinements.
- [x] Settings accordions for personal profile, training preferences, step integrations and reminders.
- [x] Desktop collapsed-navigation hover tooltips.
- [~] Configurable reminder preferences: workout, meal-completion and motivation
  reminders with enable/disable and time controls are saved. The web fallback
  uses browser alerts while Steel is open; the Capacitor iOS and Android shells
  now schedule device-local weekly reminders with OS permission handling,
  stable IDs and cancellation when preferences change. Real notification-trigger
  QA and Android exact-alarm settings remain an explicit device gate in STEEL-119.

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
- [x] Founder release security hardening: internal trigger functions are not
  Data-API callable, public avatar enumeration is blocked while public profile
  image URLs remain available, and the intentional signed-in function surface
  is documented and reviewed.
- [x] Founder release callback and Data API boundary verification: production
  Auth redirects, allowed browser origin and server-only database procedures
  were checked against the live environment.
- [x] Food catalogue and nutrition diary migrations deployed to Supabase.
- [x] `food-catalog` Supabase Edge Function deployed.
- [x] Live Steel production URL: `https://pt-dash.pages.dev/#Home`.
- [x] Hosted Coach relationship boundary: consent-gated `coach_client_relationships`
  table, fail-closed visibility helper and sanitised relationship RPCs applied to
  Supabase project `devpjwpirhhctrwizzab`; the migration created no records.

## Active — Sprint 01: steps and activity foundation

- [~] Define a unified activity model: the additive daily-record and
  connection/consent contract, deterministic source-selection policy, local
  migrations and helper tests are prepared. Owner-only connection policies,
  authenticated API grants and a non-privileged deletion function were applied
  to production on 13 September and the web client was deployed on 14 September;
  native-import implementation remains outstanding.
- [~] Make the Settings tracker area use truthful connection states: Not connected,
  Connected, Sync issue and Disconnected are rendered locally, with no provider
  presented as connected before native consent and a real provider connection.
- [~] Build the steps dashboard: Home now shows today, 30-day trend, source
  label and manual entry. The seven-day logged average, goal progress and
  member-owned daily goal are implemented locally. The profile migration was
  applied to production on 13 September; the verified web build was deployed on
  14 September.
- [x] Add manual entry as the clear fallback and use the same data source on Home; deployed and verified by user.
- [~] Add consent, disconnect, imported-data deletion and last-sync status: local
  controls show connection state and last successful sync, keep imported data on
  disconnect, and separately confirm atomic deletion of a provider’s imported
  records while preserving manual entries. The migration was applied to
  production on 13 September and the verified web controls were deployed on
  14 September.
- [~] Prevent double counting between sources: deterministic priority is live for manual vs future tracker records; cross-device deduplication remains for native integrations.
- [x] Decide native mobile architecture for health data: Capacitor will contain
  the existing React/Vite client, with narrow first-party HealthKit (Swift) and
  Health Connect (Kotlin) bridges. The decision preserves explicit consent,
  manual-data protection and a foreground-only first pilot.
- [x] Establish the Capacitor mobile-shell foundation: iOS and Android shells,
  shared build/sync commands and an inert native bridge boundary are in the
  repository. Native shells were synced and opened successfully in the iOS
  simulator and Android emulator on 14 September. Health permissions, device
  data, production package registration and mobile-auth redirects remain
  deliberately out of scope.
- [~] Design native iPhone Apple Health and Android Health Connect implementation
  (STEEL-112). The first contract is read-only steps and workout minutes with
  foreground-only consent. The design is approved for implementation, and
  STEEL-113 now contains the compiling iOS HealthKit bridge plus its fixture and
  web contract test; STEEL-116 adds the native consent panel, bounded seven-day
  activity read, owner-scoped connection persistence, and settings recovery.
  STEEL-115 now normalizes and deduplicates provider records into owner-scoped
  daily rows, preserves manual rows, and includes a reviewed RLS-hardening
  migration that is not yet applied remotely. The build launches successfully
  in the iPhone 17 Pro simulator, while real permission/revocation QA and
  remote migration review remain pending.
  The execution
  breakdown is tracked in STEEL-113 (iOS bridge), STEEL-114 (Android bridge),
  STEEL-114 now contains a read-only Android Health Connect bridge for steps
  and exercise sessions (API 26+), while STEEL-115 covers authenticated ingest
  and RLS tests and STEEL-116 covers native consent UI and revocation recovery.
  All remain in Sprint 04 pending device permission QA and remote migration
  review.

## Planned — Sprint 02: diary, meal-plan completion and QA

- [ ] Device QA: diary search, barcode camera permissions, food-detail portions, ingredient editing and planned meal logging.
- [ ] Replace the free catalogue with a licensed comprehensive UK branded-food provider when commercially viable.
- [ ] Meal-plan week scheduling, meal swaps, adherence and carry-over.
- [ ] PT review, approval and controlled meal-plan revision workflow.
- [ ] Payment/subscription entitlements and plan-change limits.
- [ ] Training-day/rest-day calorie and macro targets.
- [ ] Weekly calorie/macro adherence and weight rate-of-change views.

## Planned — Sprint 03: training intelligence and product polish

- [~] Design Steel AI Coach: a paid, evidence-led guidance layer that flags
  explainable progress patterns, asks for context and offers member-approved
  actions. It begins insight-only and remains non-diagnostic, transparent and
  fully optional.
- [~] First Steel AI Coach member slice is now implemented in Home: an
  insight-only recovery-context card reads the latest weekly check-in, explains
  the evidence and uncertainty, asks one bounded question and records no plan
  change until a later approved action workflow exists.
- [~] AI Coach aggregate read-model boundary is drafted locally: an
  owner-scoped, read-only RPC exposes only recovery metrics and coarse recent
  training, nutrition and weight counts. It is not applied to the remote
  Supabase project yet; the browser falls back safely until that migration is
  reviewed and approved.
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
- [~] Native local reminders now schedule while the iOS and Android shells are
  backgrounded or closed. Server push and scheduled background sync remain
  deferred until a later product decision.
- [ ] Garmin Health integration — requires commercial partnership/API approval.
- [ ] WHOOP integration — OAuth/data scopes and production access approval.
- [ ] Oura integration — OAuth, webhook handling and production access approval.
- [ ] Heart-rate/BLE equipment support and additional connected-device data.

## Planned platform expansion — Steel Coach

- **Sprint 05 — Foundation and pilot design:** validate with one or two coaches; define roles, relationship lifecycle, consent, information architecture, pilot offer and success metrics.
- [~] **STEEL-69 — Role and permission matrix:** the least-privilege matrix is
  drafted in [docs/codex/steel-coach-role-permission-matrix-2026-09-14.md](docs/codex/steel-coach-role-permission-matrix-2026-09-14.md).
  It distinguishes members, linked clients, coaches and administrators; makes
  client consent a prerequisite for Coach reads; and drafts the RLS,
  export/revocation and audit test cases. Relationship-state migration and
  real-coach review remain before implementation.
- [~] **STEEL-71 — Relationship and data-ownership lifecycle:** the state
  machine and transition contract is drafted in
  [docs/codex/steel-coach-relationship-lifecycle-2026-09-14.md](docs/codex/steel-coach-relationship-lifecycle-2026-09-14.md).
  It covers invitation, acceptance, consent, active, pause, switching,
  revocation and expiry; idempotency and one-active-Coach rules; durable client
  ownership; and RLS/lifecycle test cases. Pilot review and the eventual
  relationship migration remain pending. A local additive migration now
  defines the relationship table, consent-gated transition RPCs, fail-closed
  `private.is_trainer_for` enforcement and a sanitised relationship read
  function. The reviewed migration is now applied to production with RLS
  enabled and no existing relationships changed; the Supabase advisor's
  intentional closed-table/no-policy and authenticated security-definer notices
  remain recorded for follow-up.
- [~] **STEEL-74 — Coach information architecture and prototype:** the live
  app now includes a mobile-first Steel Coach workspace shell with role-aware
  overview/client/message/insight states, explicit consent guardrails and a
  client-owned access view. The client surface now presents a compact Coach
  profile with a display-portrait fallback, removes the redundant messages
  tile, and reserves one clear booking entry point. Invitations, messaging and
  bookings remain intentionally disabled until the pilot workflow is validated;
  calendar linking is tracked in deferred STEEL-120.
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
