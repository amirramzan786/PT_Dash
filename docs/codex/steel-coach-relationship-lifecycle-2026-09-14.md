# Steel Coach — relationship and data-ownership lifecycle

**Plane:** STEEL-71  
**Status:** design in progress; implementation follows pilot validation  
**Sprint:** 05 — Steel Coach foundation & pilot design

## Purpose

This is the lifecycle contract for a Coach–client relationship. It makes
consent and ownership explicit, prevents a relationship row from silently
granting access, and ensures that unlinking never deletes the client’s Steel
history.

The client owns their account, training, nutrition, progress, activity and
media. A Coach receives a revocable, purpose-specific view only after the
client accepts an invitation and grants Coach visibility. The public web app,
native bridges and any future AI Coach surface must obey the same contract.

## Canonical states

| State | Meaning | Client data visible to Coach? |
| --- | --- | --- |
| `invited` | An approved Coach created a time-limited invitation for a specific email/account. | No |
| `accepted_pending_consent` | The intended client accepted the invitation but has not granted Coach visibility. | No |
| `active` | The client accepted, consent is current, and the assignment is active. | Yes, only the approved Coach read surface |
| `paused` | Visibility is temporarily suspended by the client, Coach or support action. | No |
| `transfer_pending` | A client is moving to another Coach; the old relationship is paused until the new one is accepted and consented. | No old/new Coach access until the transition completes |
| `revoked` | Client, Coach or authorised support ended the relationship. | No |
| `expired` | Invitation was not accepted before its expiry or a pending transition timed out. | No |

`active` is never inferred from `trainer_client_assignments.active` alone. The
pilot migration should add a relationship record with:

- `id`, `trainer_id`, `client_id`, and a unique active relationship invariant;
- `state` and a version number for optimistic concurrency;
- invitation token hash, invited email, inviter and `invited_at`/`expires_at`;
- `accepted_at`, `consent_version`, `consented_at`, `consent_domains`;
- `paused_at`/`paused_by`, `revoked_at`/`revoked_by`, and a safe reason code;
- `transferred_from`/`transferred_to` where a switch is approved;
- `created_at` and `updated_at`.

Consent is purpose-specific. The first pilot domain is `coach_progress` and
covers the read surface documented in STEEL-69. Health-provider raw records,
AI Coach conversations, billing identifiers and private support notes are not
included unless a later, separately reviewed consent exists.

## Transition rules

| From | Action | Actor | To | Required checks |
| --- | --- | --- | --- | --- |
| — | Create invitation | Approved Coach/server | `invited` | Coach role, seat/entitlement, valid target email, no duplicate pending/active relationship |
| `invited` | Cancel invitation | Inviting Coach or server | `revoked` | Only inviter or authorised support; token becomes unusable |
| `invited` | Accept invitation | Intended client | `accepted_pending_consent` | Authenticated account email matches or explicit secure claim; one-time token; not expired |
| `accepted_pending_consent` | Grant Coach visibility | Client | `active` | Current consent copy/version, selected domains, explicit confirmation, assignment still valid |
| `accepted_pending_consent` | Decline | Client | `revoked` | No Coach read ever becomes available; invitation audit retained |
| `active` | Pause | Client, Coach or support | `paused` | Actor is a participant or authorised support; record reason and actor |
| `paused` | Resume | Client | `active` | Client confirms current consent; no silent resume by Coach |
| `active` | Revoke | Client | `revoked` | Immediate fail-closed access; preserve client data and audit |
| `active` | Request closure | Coach | `paused` | Coach loses reads immediately; client can keep or end relationship |
| `active` | Start switch | Client | `transfer_pending` | Existing Coach paused; no overlapping active Coach by default |
| `transfer_pending` | Accept new invitation + consent | Client/new Coach flow | `active` | New relationship validated; old relationship remains paused/revoked |
| Any pending state | Expiry job | Server | `expired` | Only invitation/transition records expire; no client data is removed |
| `paused`/`transfer_pending` | Revoke | Client or support | `revoked` | Idempotent; all Coach reads stop immediately |

Every transition is idempotent. Repeating an accept, pause or revoke request
returns the current state without duplicating relationships or audit events.
Requests include the relationship version; a stale version fails safely and
the caller must reload rather than overwriting a newer consent or revocation.

## Invitation and acceptance flow

1. The server validates the Coach role, active seat/entitlement and target
   address. It stores only a cryptographic token hash and a short expiry; the
   raw token is sent through the approved email path and never logged.
2. The client opens the invite while signed in or creates/signs into the
   matching account. The token is single-use and cannot reveal the Coach’s
   clients or any private data.
3. Acceptance creates `accepted_pending_consent` only. It does not add Coach
   RLS visibility and does not expose a profile preview beyond the invite
   context.
4. A separate consent screen names the exact domains, purpose, retention and
   revocation controls. The client can select `coach_progress`, decline or
   leave the flow.
5. A server transaction validates the still-active invitation, records the
   consent version/timestamp and moves the relationship to `active`. The first
   Coach read is allowed only after this transaction commits.

## Pause, switching and termination

### Pause and resume

Pause is reversible and preserves the relationship history. It immediately
   removes Coach rows from RLS reads. Only the client can resume a relationship
   after a pause; the client must confirm the current consent copy if its
   version has changed.

### Coach switching

The default pilot policy is one active Coach per client. Starting a switch
   pauses the old relationship before any new Coach is granted access. A new
   Coach becomes active only after a fresh invitation acceptance and client
   consent. The client’s plans, logs, check-ins, media and activity remain on
   the same account; only the relationship grant changes. No Coach can bulk
   copy or export the client’s history during a switch.

### Revocation and termination

Client revocation is immediate and fail-closed. Coach termination removes the
Coach view but does not delete client data. Support may revoke for safety,
abuse, legal or account reasons only through an audited server action. A
revoked relationship cannot be silently reactivated; a new invitation and
fresh consent are required.

Disconnecting a health provider or pausing AI Coach is independent of the
Coach relationship. Provider disconnect stops future imports; provider-only
deletion removes imported rows while preserving manual activity. AI Coach
consent is never implied by Coach visibility.

## Data ownership and retention

- All client tables retain `user_id` ownership. Unlinking deletes no profile,
  programme, workout, session, meal, check-in, media, weight, activity or AI
  history.
- Relationship metadata and audit events are retained as an access history,
  subject to the product retention policy. They contain actor, target,
  transition, purpose/reason code, consent version and timestamp, not raw
  health records or unnecessary message content.
- A client can request a complete export of their own data and can delete
  their own account under the existing account-deletion policy. A Coach cannot
  request deletion of a client’s data.
- Coach-visible summaries are projections of client-owned rows. They must not
  become a second, independently owned copy that survives revocation.
- Any future Coach notes or messages need their own ownership and retention
  rules; they are not stored in client check-in or health tables by shortcut.

## Server/RLS invariants

1. `auth.uid() = client_id` is required for client relationship controls;
   `auth.uid() = trainer_id` is sufficient only for invitation creation or
   Coach-initiated closure, never for granting visibility.
2. Coach data policies require `state = 'active'`, unexpired consent and the
   requested consent domain. `paused`, `transfer_pending`, `revoked` and
   `expired` return zero rows.
3. Coach policies are read-only in the pilot. All transitions, invitations,
   exports and future writes use narrow authenticated RPCs/Edge Functions.
4. Role, entitlement, assignment and consent-version writes are server-only;
   clients cannot update relationship state or `client_id` directly.
5. The one-active-Coach invariant is enforced transactionally, not by a
   client-side check. Concurrent invitations may exist, but only one
   consented active relationship may exist under the pilot policy.
6. Revocation and consent withdrawal are checked on every query or through a
   server-owned projection that is invalidated in the same transaction.
7. Audit writes are append-only for clients and Coaches; support/admin writes
   include a reason and actor and cannot be edited through the browser.

## Authorization and lifecycle test cases

1. A non-member or expired session cannot create, accept, inspect or revoke an
   invitation.
2. A Coach cannot invite themselves, another Coach, an existing active client
   without an explicit switch flow, or an address outside the approved invite
   policy.
3. A pending invitation reveals only its safe invite context and no client
   rows; replaying or using an expired token fails.
4. Acceptance produces `accepted_pending_consent` and zero Coach-readable
   rows until consent is committed.
5. Decline, pause, transfer-pending and revoke each make Coach reads return
   zero rows immediately.
6. Resume requires client authentication and current consent; a Coach cannot
   resume a paused relationship.
7. Concurrent accepts or consent submissions result in one active relationship
   and one auditable transition, not duplicate grants.
8. A stale relationship version cannot overwrite a newer pause, switch or
   revoke transition.
9. Switching Coaches pauses the old relationship before activating the new
   one; the client’s historical rows remain present and owned by the client.
10. Coach A cannot read, export or mutate Coach B’s relationship or clients,
    including via nested programmes, sessions, meals, check-ins or media.
11. A Coach cannot delete client data, provider-imported rows or manual rows;
    client/provider deletion controls remain owner-scoped.
12. Support/admin transitions require an approved role, reason and append-only
    audit event; service-role credentials never reach the browser.
13. Repeated revoke/decline/expiry calls are safe no-ops and do not duplicate
    audit events or restore access.
14. Consent-version changes require re-consent before the next Coach read;
    existing access does not silently broaden when a new domain is added.

## Pilot decisions and next action

For the first pilot, use one active Coach per client, explicit client consent,
read-only Coach access, and fail-closed revocation. Validate the wording and
switching expectations with the two pilot candidates from STEEL-70 before
implementing the relationship migration. Then convert the test cases into
Supabase policy/RPC tests and a small state-transition migration; do not expose
Coach views or native health data as part of this design-only step.
