# Project Steel — Founding 20 product rules and UX

This document locks the product decisions for GitHub issue #2. Codex should treat these rules as authoritative unless a security or platform constraint makes one impossible; in that case, document the deviation clearly in the PR.

## 1. Core offer
- The first **20 verified beta members** receive **core Steel Premium free for life**.
- “Free for life” means £0 for the lifetime of that user account for the core Premium feature set available at public launch.
- Separate future products, coaching, marketplaces, services, or major add-ons may be excluded.
- The Founding 20 offer closes permanently once 20 legitimate founders have been allocated.
- #21 and beyond may still join the beta/waitlist, but do not receive the lifetime Premium promise.

## 2. What secures a place
A Founding place is secured **on successful email verification plus atomic server-side allocation**.

Manual approval is **not** required for a legitimate user to secure a place. Manual admin review exists only for abuse/remediation.

Rules:
- Unverified submissions do not consume places.
- Duplicate submissions for the same normalised email do not create extra places.
- The browser never chooses a founder number.
- Founder numbers are unique integers 1–20.
- If the twentieth place is taken before a verification completes, that verified user becomes waitlisted.

## 3. Reservation behaviour
- A submitted but unverified email has a 24-hour verification window.
- Because pending users do **not** consume a Founding slot, do not show them as “reserved” in the public counter.
- After 24 hours, pending records may move to `expired` and can be cleaned up/restarted safely.
- A previously expired email may submit again and receive a fresh verification attempt.

## 4. Public counter
The counter must represent actual allocated founders only.

Display format:
`7 CLAIMED · 13 REMAINING`

Rules:
- Capacity is fixed at 20 for this campaign.
- `claimed = count(valid founding_number)`.
- `remaining = max(20 - claimed, 0)`.
- Pending/unverified signups do not change the number.
- The frontend must fetch the count from a public aggregate endpoint.
- Never expose names, emails, user IDs, IPs, or timestamps through the public counter endpoint.
- Do not animate an optimistic increment before the server confirms verification/allocation.

## 5. Signup UX copy
### Initial state
Primary CTA: **Request access**
Support text near the form:
**First 20 verified beta members keep core Steel Premium free for life. No card required.**

### After valid submission
Heading/message:
**Check your email.**
Body:
**Verify your email to confirm your beta signup. A Founding 20 place is only secured after verification.**

### Duplicate pending
**You’re already pending verification. Check your inbox or resend the verification email.**

### Duplicate verified founder
**You’re already in. Your Founding place is secured.**
If available, show:
**Founder #07 of 20**

### Duplicate verified waitlist
**You’re already on the beta waitlist.**

### Successful verification — founder
**You’re Founder #07 of 20.**
**Your core Steel Premium access is locked at £0 for the lifetime of your account.**
CTA: **Create / finish your Steel account**

### Successful verification — full/waitlist
**You’re verified and on the Steel beta waitlist.**
**The 20 lifetime Premium places have now been claimed.**

### Founding 20 already full before submission
The signup form remains available.
Replace Founding offer emphasis with:
**Founding 20 is full. Join the beta waitlist.**
Do not hide the form.

### Invalid/disposable email
**Use a valid personal email address to join the beta.**
Do not identify the deny-list implementation.

### Turnstile failure
**We couldn’t verify this request. Please try again.**

### Rate limit / resend cooldown
**Too many attempts. Please wait a little before trying again.**
Where safe, include a retry time/countdown.

## 6. Email ownership and account linking
Steel already uses Supabase Auth. Extend it; do not create a separate identity/password system.

Preferred behaviour:
- Verification proves ownership of the signup email.
- The verified signup is linked to the corresponding Supabase `auth.users.id` as soon as practical.
- If the beta verification flow creates/identifies an Auth user, the user should later complete/sign into Steel using the same verified email.
- If the user already has a Steel account with that verified email, link the founding record to that existing account safely.
- Lifetime Premium follows the authenticated user account, not a browser, cookie, device, or localStorage value.

## 7. Entitlement rule
Use the existing `public.membership_entitlements` model.

For Founder #1–20:
- grant or upsert a permanent Steel Premium entitlement against `user_id`;
- mark it clearly as a founding/lifetime entitlement so future billing logic cannot accidentally overwrite it;
- no expiry date;
- no payment provider required;
- entitlement survives logout, new devices, browser changes, password resets, and future migrations.

If the existing schema needs extra metadata/fields to represent this safely, add them through a backwards-compatible migration.

## 8. Abuse-prevention policy
Required controls:
- Cloudflare Turnstile on both public marketing signup forms.
- Turnstile token validated server-side.
- Unique normalised email constraint.
- Disposable-domain deny-list/helper.
- Sensible resend and signup cooldowns.
- Server-side rate limiting.
- No long-term raw-IP storage. If abuse tracking needs persistence, use a keyed hash and short retention.
- Do not block normal privacy-forwarding/alias providers solely because they are aliases.
- Manual admin revoke/reject exists for obvious fraud/abuse.

## 9. Admin capabilities
Minimum admin-only view/actions:
- list signup email;
- created date;
- pending / verified / founder / waitlist / rejected / expired status;
- founder number;
- linked Steel user ID;
- resend verification when allowed;
- reject/revoke obvious abuse;
- export signups;
- if a founder is revoked before beta launch, allow a deliberate admin promotion from waitlist using safe server-side allocation.

Do not make public RLS policies for this data.

## 10. Source tracking
Each signup should record a safe source identifier, e.g.:
- `hero`
- `beta-section`
- `marketing-site`

This is for conversion analysis only. Do not let an arbitrary source value drive permissions or entitlement logic.

## 11. Data retention
- Pending expired attempts may be cleaned up after an appropriate retention period.
- Verified founder/waitlist records should be retained while required for the beta programme, entitlement evidence, and legitimate business/legal purposes.
- Do not collect extra personal data beyond what is needed for beta access at this stage.

## 12. Acceptance scenarios
Codex must test or demonstrably validate all of these:

1. User A submits valid email + valid Turnstile -> pending, counter unchanged.
2. User A verifies -> Founder #1, counter becomes 1 claimed / 19 remaining.
3. Same email resubmits -> no duplicate signup/founder.
4. Same email with different case/whitespace -> same record.
5. Invalid Turnstile -> rejected, no row/founder allocation.
6. Disposable email -> denied.
7. Pending resend inside cooldown -> blocked politely.
8. Pending verification after 24h expiry -> handled safely without consuming a place.
9. Nineteen founders exist; two users verify concurrently -> exactly one receives #20; the other becomes waitlist.
10. Founding 20 full -> counter is 20 claimed / 0 remaining, form remains available for waitlist.
11. Public counter endpoint returns aggregate values only.
12. Anon client cannot directly read/write `beta_signups` through Supabase Data API.
13. Founder later signs into Steel with same verified identity -> lifetime Premium entitlement exists.
14. Founder logs in on a different device -> entitlement still exists.
15. Existing Steel users/auth flows remain unaffected.
16. Marketing hero form and lower beta form produce the same secure backend behaviour.
17. Mobile and desktop states remain visually consistent with current Steel design.
18. No secret keys appear in generated frontend code, git history, logs, or network responses.

## 13. Non-goals for this sprint
- No Stripe or other billing integration.
- No paid subscription checkout.
- No referral programme.
- No social login requirement.
- No redesign of the current marketing site.
- No phone-number or identity-document verification.
- No fake testimonials or fake signup numbers.

## 14. Launch gate
Do not treat this system as production-ready until:
- Turnstile production site key/secret are configured;
- allowed origins/redirect URLs are set correctly;
- verification email delivery is tested on real external addresses;
- RLS/security checks pass;
- concurrency test around Founder #20 passes;
- live counter is confirmed against the database;
- privacy/beta terms reflect the actual implemented data flow;
- a rollback/remediation path for accidental founder allocation is documented.
