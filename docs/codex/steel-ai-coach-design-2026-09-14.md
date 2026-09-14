# Steel AI Coach — adaptive guidance design

**Plane:** STEEL-111
**Status:** Design in progress
**Priority:** High, Sprint 03

## Product promise

Steel AI Coach is an optional paid guidance layer. It helps a member make the
next useful decision by identifying *explainable* patterns in their own Steel
data, asking for context, and offering bounded, member-approved next steps.

It is not a clinician, injury detector, emergency service, or a replacement for
a human coach. It must never shame a member, invent a cause, or silently change
a programme, target, meal plan or subscription.

## V1: insight before automation

The first release is deliberately an **insight-and-conversation product**:

1. A deterministic rules layer identifies a candidate pattern from recent,
   member-owned data.
2. Steel shows the relevant evidence and its confidence level.
3. The member can answer a short, situation-specific check-in, dismiss the
   insight, or say the data is wrong.
4. Steel offers a small set of safe options. Nothing changes until the member
   explicitly approves one.
5. Every shown insight, answer, proposed action, acceptance, rejection and
   resulting change is recorded for the member to review or delete.

Generative AI may turn the approved signal and options into warm, concise copy
or follow-up questions. It must not be the source of truth for calculations,
entitlements, permissions, health claims or applied plan changes.

## Signals eligible for the first pilot

| Signal | Minimum evidence | What Steel says | Initial action boundary |
| --- | --- | --- | --- |
| Training consistency | 2 missed planned sessions in 14 days, with a current programme | “Two planned sessions were not logged. Was time, energy, pain, or the plan itself the main barrier?” | Offer reschedule, reduced-session template, or no change. |
| Exercise drop-off | The same exercise is removed or skipped in 2 of its last 3 scheduled appearances | “This exercise has been skipped twice recently.” | Offer to keep, swap from an approved same-pattern list, or flag for review. |
| Load/volume decline | 3 comparable completed appearances and a sustained reduction beyond a conservative threshold; exclude first week, exercise swaps and missing logs | “Your completed work on this movement has been lower recently.” | Ask about fatigue, pain, equipment and confidence; recommend hold/reduce only, never force progression. |
| Low recovery context | Latest weekly check-in reports low energy/sleep or high stress/soreness | “Your recent check-in suggests recovery may be limited.” | Keep existing transparent daily guidance; offer recovery session or reduced-volume option. |
| Weight-trend stall | At least 21 days of valid, comparable weigh-ins and stated goal context; no conclusion during insufficient data | “Your trend has been stable for three weeks.” | Ask about adherence, tracking consistency, cycle/illness context and goal; offer review, not an automatic calorie change. |
| Nutrition consistency | At least 7 days with active meal logging plus a member-defined target or planned meal baseline | “Logging has become less consistent recently.” | Offer simpler logging, planned-meal review or a check-in. Do not label foods as ‘bad’ or infer intent. |

The system must use “not enough information” when data is sparse, conflicted or
not comparable. “Off-plan meal” is a member-owned adherence category, never a
judgement inferred from a single food or calorie total.

## Conversation design

Each prompt has four fixed parts:

1. **Observation:** date range, comparison and source data.
2. **Uncertainty:** what Steel cannot know from logs alone.
3. **Question:** no more than two relevant questions at a time.
4. **Choice:** safe actions plus “not now”, “this is wrong”, and “pause AI Coach”.

Example:

> I noticed your last three logged squat sessions used less total work than the
> three before them. I can’t tell why from the log alone. Has fatigue, pain,
> equipment access, or confidence been getting in the way?

If pain, injury, eating-disorder concerns, severe fatigue, or self-harm language
is entered, Steel stops plan-adjustment dialogue, encourages appropriate
professional support, and records no health conclusion. These safeguarding
responses need separately reviewed copy before release.

## Member approval and action rules

- **Insight only (pilot):** see, answer, dismiss, correct, or pause.
- **Assisted actions (later):** member may approve a one-session reduction,
  approved exercise substitution, or temporary schedule adjustment.
- **Controlled plan revision (later):** requires an explicit diff, effective
  date, undo path, and reversion to the previous programme version.
- **Human-coach context (future):** no AI insight, response or data is visible
  to a coach unless the member grants a distinct, revocable permission.

No action may write directly to `sessions`, `set_logs`, `meal_logs`, daily
activity, programme data, or health-provider data. Applied actions use a
dedicated, owner-scoped command that validates the approved action type,
records the before/after state, and performs one atomic change.

## Data and architecture

Existing useful sources are `sessions`, `set_logs`, `cardio_logs`,
`weekly_checkins`, `meal_logs`, daily activity, weights and the active programme.
V1 needs a read model rather than broad client access to raw tables.

Proposed server-owned concepts, to be designed in a later migration:

- `ai_coach_entitlements` — trial/paid status, expiry and member pause.
- `ai_coach_consents` — versioned consent, allowed data domains and deletion
  request state.
- `ai_coach_insights` — signal version, evidence snapshot, confidence,
  lifecycle and dismissal/correction state.
- `ai_coach_conversations` — bounded questions and member answers, excluding
  unnecessary raw health text from model prompts.
- `ai_coach_action_proposals` and `ai_coach_action_events` — reviewed proposal,
  explicit approval, applied diff, undo and audit record.
- A server-side feature evaluator / Edge Function that reads only the member’s
  authorised aggregate data, applies versioned deterministic rules, and makes a
  narrowly scoped model call only when eligible.

The browser must never hold an AI-provider secret or be permitted to choose an
arbitrary database query. Supabase RLS remains owner-first, and any future
coach access is a separately constrained relationship policy.

## Paid-access boundary

Core logging, history and basic progress remain free. Steel AI Coach receives a
time-limited trial only after its consent screen is complete. Paid access gates
the proactive insight/conversation layer, not access to a member’s own data.

Before charging, define trial length, price, cancellation, grace period,
entitlement-source-of-truth, support/refund rules, and what happens to existing
insights after expiry. Do not build billing into the signal evaluator.

## Evaluation and release gates

The pilot needs a fixed evaluation set with synthetic and consented test cases:

- sparse logs must produce no false stagnation claim;
- an exercise swap must not look like a performance decline;
- a planned recovery week must not look like non-adherence;
- manual activity records must not double count against future imports;
- a member rejection/correction suppresses the same insight until new evidence;
- every applied action has evidence, approval, diff and undo;
- the model cannot propose an out-of-policy action;
- entitlement expiry stops new proactive coaching but preserves member access to
  their own history and deletion controls.

Release sequence: internal synthetic-data review → consented founder test with
insight-only mode → measure usefulness, false-positive rate, dismissal rate and
support burden → limited paid trial → only then opt-in assisted changes.

## Work split after this design

1. Define aggregate signal contracts and test fixtures. **In progress:** the
   first owner-scoped `ai-coach-aggregate-v1` read model is drafted locally and
   covers latest recovery context plus coarse recent activity counts; it does
   not expose free text or write any insight state.
2. Define consent, deletion, audit and entitlement schema.
3. Build the server-side deterministic insight evaluator on top of the approved
   aggregate boundary.
4. Build the member insight/check-in interface in insight-only mode.
5. Add evaluation, safety review and staged feature flag.
6. Consider approved action proposals only after the pilot meets reliability
   and trust gates.
