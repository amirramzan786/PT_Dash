# Steel Coach — role and permission matrix

**Plane:** STEEL-69  
**Status:** design complete locally; implementation deferred to the validated Coach pilot  
**Sprint:** 05 — Steel Coach foundation & pilot design

## Purpose

This is the least-privilege access contract for the first Steel Coach pilot.
It describes what a normal member, a member linked to a coach, a coach and a
Steel administrator may read, change, export or revoke. A relationship link is
not permission by itself: the client must accept the relationship and grant
Coach visibility before any Coach read is enabled.

The member remains the owner of their account and data. Core client logging and
history continue to work without a Coach, and a client can revoke visibility at
any time without deleting their account or history.

## Role definitions and relationship states

| Actor | Definition | Default access |
| --- | --- | --- |
| Unauthenticated visitor | Not signed in or session expired | Public marketing/beta surfaces only; no private data or write path |
| Member | Signed-in account without an active Coach relationship | Own data only; full member controls described below |
| Linked client | Member with an accepted, active Coach relationship and explicit Coach-visibility consent | Own data plus the narrowly scoped Coach read surface; can revoke immediately |
| Coach | Approved `trainer` role with an active assignment accepted by the client | Assigned-client read-only summaries and approved programme/check-in workflow; no broad account access |
| Administrator | Approved `admin` role used by the Steel operator team | Server-side support and safety operations only, with audit and reason capture; never a browser-held privileged key |

Relationship lifecycle:

1. `invited` — an approved Coach may create an invitation, but the Coach sees
   no client data.
2. `accepted_pending_consent` — the client has joined but has not granted
   Coach visibility; the Coach still sees no client data.
3. `active` — client consent is versioned and the assignment is active; the
   Coach may see only the approved read surface.
4. `paused` — either party temporarily stops visibility; reads return no
   client rows while paused.
5. `revoked` — the client or an authorised operator ends access; future reads
   are denied immediately. Historical client data remains with the client.

The current `trainer_client_assignments.active` field is a foundation only. A
Coach pilot implementation must add an explicit relationship status, invite
acceptance timestamp, consent version/timestamp, revoked timestamp and audit
events rather than treating `active = true` as sufficient consent.

## Permission matrix

“Read” means view in the product, “change” means create/update/delete through
an authorised product action, “export” means a deliberate data export, and
“revoke” means ending access or disconnecting a provider. A dash is denied by
default.

| Data domain | Member | Linked client | Coach | Administrator |
| --- | --- | --- | --- | --- |
| Account identity and profile | Read/change own | Read/change own | Read minimum assigned profile fields after consent; no change | Server-side support read/change only with reason and audit |
| Training intake, limitations and preferences | Read/change own | Read/change own | Read only fields explicitly shared by client; limitations are hidden unless separately shared | Server-side support read; no silent edits |
| Active programme and planned workouts | Read/change own within entitlement and controlled revision rules | Same | Read assigned plan; propose or request revisions only; no direct overwrite in the pilot | Server-side remediation only; every change audited |
| Workout sessions, set logs and cardio logs | Read/change own | Same | Read assigned summaries and detail needed for coaching; no delete or edit | Server-side support/safety access, audited |
| Body weight and progress trend | Read/change own | Same | Read assigned trend only after consent; no raw export by default | Server-side support access, audited |
| Meal plan, nutrition targets and meal logs | Read/change own | Same | Read assigned adherence summaries and client-shared detail; no edit/delete | Server-side support access, audited |
| Weekly check-ins and check-in media | Read/change/delete own | Same | Read assigned check-ins/media after consent; cannot delete or re-share | Server-side access for support/safeguarding, audited |
| Activity/health-provider connection state | Read/change own; connect, disconnect and delete imported provider data | Same | At most see connected/disconnected and last-sync state; never raw provider records or scopes unless separately shared | Server-side troubleshooting only; no routine browsing |
| Imported activity rows | Read/change/delete own imported rows through provider controls; manual rows are protected | Same | Read only aggregated assigned activity needed for coaching; no delete | Server-side support/safety access, audited |
| AI Coach conversations and insights | Read/change/delete own; pause or withdraw AI consent | Same | No access by default; a distinct, revocable client share is required later | Server-side abuse/safety support only, audited |
| Roles, relationships and entitlements | Read own role and relationship status; request or revoke a relationship | Same; revoke own Coach visibility | Read own assignment status; may request closure, never grant themselves access | Create/revoke roles, assignments and entitlements through server-only operations |
| Data export | Export own data through a scoped, authenticated request | Same | No export of client data by default; client-generated scoped share only in a later release | Controlled export only for support/legal obligation, with reason, scope, expiry and audit |
| Access revocation | Revoke Coach visibility, disconnect providers, delete own imported provider data, close account | Same | End own assignment/request closure; cannot revoke client consent or erase client data | Disable account/relationship for safety or legal reason; cannot bypass audit or client ownership |

### Coach read surface for the pilot

The first Coach dashboard should expose only the minimum needed to help a
client: display name, stated goal, active programme, recent completed-session
summary, weight trend, weekly check-in answers, client-shared notes, meal-plan
adherence summary and activity summary. It must not expose authentication
metadata, private support notes, provider raw records, health scopes, AI
conversations, billing identifiers or another Coach’s clients.

Coach writes should be command-based and reviewable: invite client, propose a
programme revision, add a coaching message or record a review outcome. The
browser must not receive generic table write access. A client-approved change
must show the before/after diff, effective date and undo/reversion path.

## Server and RLS rules

- Every private table remains owner-first: `auth.uid() = user_id` for member
  reads and writes.
- Coach reads use an active assignment **and** a separate accepted consent
  record. Assignment alone is not a grant.
- Coach policies are `SELECT` only for the pilot. Programme revisions,
  messages, invitations and relationship transitions use narrow authenticated
  RPCs or Edge Functions that validate the actor, entitlement and state.
- Role, assignment and entitlement writes are server-only. Never grant a
  browser client permission to insert/update `user_roles`, assignments,
  seat-pools or membership entitlements.
- Admin support operations run server-side with a declared reason, actor,
  target, fields and expiry. The existing `private.is_admin()` broad-read
  policies must be reviewed and narrowed before a real Coach pilot; admin is
  not a reason to expose all client rows in the normal browser UI.
- Provider bridges return bounded, provider-neutral summaries. Raw HealthKit or
  Health Connect records never become a coach-visible table by default.
- Export is a separate capability from read. Each export is scoped to a data
  domain, recipient, expiry and audit event.
- Revocation is fail-closed: a revoked or paused relationship returns zero
  Coach rows immediately, while member access and manual data remain intact.

## RLS and authorization test cases

1. Anonymous sessions cannot read or write profiles, programmes, sessions,
   check-ins, meals, activity, roles, assignments or entitlements.
2. Member A cannot select, insert, update or delete Member B rows; update
   attempts that change `user_id` fail the `WITH CHECK` predicate.
3. A Coach with an invitation but no acceptance sees zero client rows.
4. A client who accepted but has not granted Coach visibility still yields zero
   Coach rows.
5. An active assignment with consent permits only the documented Coach read
   surface; Coach inserts, updates and deletes are denied by table policy.
6. Pausing or revoking consent makes the same Coach query return zero rows
   without waiting for a session refresh.
7. Coach A cannot see Coach B’s assignments or clients, including through
   nested workout/session/media relationships.
8. A client can revoke visibility, disconnect a provider and delete imported
   provider rows without deleting manual activity rows.
9. A Coach export request is denied unless a later, explicit scoped-share
   capability is present; a member export contains only that member’s rows.
10. Admin-only role, assignment, entitlement and support actions reject
    authenticated non-admin callers and create an audit event for admins.
11. No client bundle, Edge Function request or mobile bridge contains a
    service-role key or arbitrary table/query selector.
12. Relationship transitions are idempotent: repeated accept, revoke or pause
    requests do not restore access or duplicate audit events.

## Pilot gate and next action

This matrix is the review baseline, not a claim that the full Coach dashboard
already exists. Before Sprint 06 implementation, confirm the relationship
states and client-facing consent copy with one or two real coaches and clients,
then turn the cases above into Supabase/RLS tests and a narrow relationship
migration. Do not add Coach visibility to native health data or AI Coach
conversations as part of the first operations MVP.
