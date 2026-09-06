import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { isDisposableEmail, normalizeEmail } from '../supabase/functions/_shared/email.mjs'

test('normalises and validates human email input', () => {
  assert.equal(normalizeEmail('  Founder@Example.COM '), 'founder@example.com')
  assert.equal(normalizeEmail('not-an-email'), null)
  assert.equal(normalizeEmail('a@b'), null)
  assert.equal(normalizeEmail('a..b@example.com'), null)
})

test('blocks obvious disposable mailbox domains without blocking normal aliases', () => {
  assert.equal(isDisposableEmail('person@mailinator.com'), true)
  assert.equal(isDisposableEmail('person@sub.temp-mail.org'), true)
  assert.equal(isDisposableEmail('person@icloud.com'), false)
  assert.equal(isDisposableEmail('person+steel@gmail.com'), false)
})

test('marketing bundle never paints a fake initial Founder count', async () => {
  const html = await readFile(new URL('../../marketing-site/index.html', import.meta.url), 'utf8')
  assert.match(html, /data-claimed=""/)
  assert.doesNotMatch(html, /data-claimed="0"/)
  assert.match(html, /beta-status/)
  assert.match(html, /Do not increment optimistically|paintCounter/) // source-level guard
})

test('migration contains the server-side allocation guardrails', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260904120000_founding20_beta_signups.sql', import.meta.url), 'utf8')
  assert.match(sql, /pg_advisory_xact_lock/)
  assert.match(sql, /between 1 and 20/)
  assert.match(sql, /v_plan_key constant text/)
  assert.match(sql, /steel-core-premium-founder-lifetime/)
  assert.match(sql, /on conflict \(user_id\) do update/i)
  assert.match(sql, /plan_label, status, plan_change_limit/i)
  assert.match(sql, /status = 'expired'/i)
  assert.match(sql, /revoke all on table public\.beta_signups from anon, authenticated/i)
  assert.match(sql, /interval '24 hours'/)
})

test('Alpha 20 migration keeps founder, feedback, updates and analytics private', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260905190000_alpha20_founder_experience.sql', import.meta.url), 'utf8')
  assert.match(sql, /create table if not exists public\.beta_feedback/i)
  assert.match(sql, /revoke all on table public\.beta_feedback from anon/i)
  assert.match(sql, /get_my_founder_status\(\)/i)
  assert.match(sql, /grant execute on function public\.get_my_founder_status\(\) to authenticated/i)
  assert.match(sql, /pg_advisory_xact_lock\(187421, 20\)/i)
  assert.match(sql, /admin_promote_waitlisted_signup/i)
  assert.match(sql, /protect_founder_entitlement/i)
  assert.match(sql, /verification_email_sent/i)
  assert.match(sql, /day_bucket/i)
  assert.match(sql, /v_safe_properties jsonb/i)
  assert.match(sql, /beta_signup_attempted/i)
  assert.match(sql, /old\.status = 'waitlist' and new\.status = 'approved'/i)
})

test('staged rollout controls begin safely at Alpha 20 without diluting the Founder cap', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260905200000_staged_rollout_controls.sql', import.meta.url), 'utf8')
  assert.match(sql, /default 'alpha20'/)
  assert.match(sql, /tester_target = 20/)
  assert.match(sql, /unrestricted_public_signup_enabled boolean not null default false/)
  assert.match(sql, /billing_enabled boolean not null default false/)
  assert.match(sql, /phase = 'public_launch' and tester_target is null and unrestricted_public_signup_enabled/)
  assert.match(sql, /revoke all on table public\.rollout_controls from anon, authenticated/i)
  assert.doesNotMatch(sql, /generate_series\(1, 20\)/)
})

test('post-verification Founder and waitlist emails stay server-side and idempotent', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260905210000_beta_outcome_email_delivery.sql', import.meta.url), 'utf8')
  const verify = await readFile(new URL('../supabase/functions/beta-verify/index.ts', import.meta.url), 'utf8')
  const email = await readFile(new URL('../supabase/functions/_shared/betaOutcomeEmail.ts', import.meta.url), 'utf8')
  assert.match(sql, /unique \(signup_id, kind\)/i)
  assert.match(sql, /revoke all on table public\.beta_outcome_email_deliveries from anon, authenticated/i)
  assert.match(verify, /sendBetaOutcomeEmail/)
  assert.match(email, /RESEND_API_KEY/)
  assert.match(email, /Idempotency-Key/)
  assert.match(email, /founder_confirmed/)
  assert.match(email, /waitlist_confirmed/)
  assert.doesNotMatch(email, /VITE_|NEXT_PUBLIC_|PUBLIC_/)
})

test('public client only calls constrained Alpha RPCs and never queries private founder tables', async () => {
  const api = await readFile(new URL('../src/lib/steelApi.js', import.meta.url), 'utf8')
  assert.match(api, /rpc\('get_my_founder_status'\)/)
  assert.match(api, /rpc\('record_alpha_event'/)
  assert.doesNotMatch(api, /from\('beta_signups'\)/)
  assert.doesNotMatch(api, /from\('analytics_events'\)/)
})

test('admin function keeps privileged promotion and publishing behind an authenticated admin boundary', async () => {
  const admin = await readFile(new URL('../supabase/functions/beta-admin/index.ts', import.meta.url), 'utf8')
  assert.match(admin, /role\?\.role !== 'admin'/)
  assert.match(admin, /admin_promote_waitlisted_signup/)
  assert.match(admin, /admin_revoke_founder_signup/)
  assert.match(admin, /publish_update/)
  assert.match(admin, /triage_feedback/)
  assert.match(admin, /grant_trainer_premium/)
  assert.match(admin, /admin_grant_trainer_premium/)
})

test('browser-facing endpoints require an exact allowed Origin and analytics cannot block signup', async () => {
  const http = await readFile(new URL('../supabase/functions/_shared/http.ts', import.meta.url), 'utf8')
  const signup = await readFile(new URL('../supabase/functions/beta-signup/index.ts', import.meta.url), 'utf8')
  assert.match(http, /return origin && allowedOrigins\(\)\.has\(origin\) \? origin : null/)
  assert.match(signup, /async function recordServerAnalytics/)
  assert.match(signup, /try \{[\s\S]*analytics_events[\s\S]*\} catch \{/)
  assert.match(signup, /beta_signup_attempted/)
  assert.match(signup, /allowedHostnames\.length > 0/)
})

test('Founder entitlement mismatches fail visibly rather than silently downgrading the member', async () => {
  const app = await readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8')
  assert.match(app, /Your Founding access needs a check/)
  assert.match(app, /Your Founder allocation is retained/)
})

test('membership labels are read-only, Settings-scoped, and retain Founder precedence', async () => {
  const api = await readFile(new URL('../src/lib/steelApi.js', import.meta.url), 'utf8')
  const app = await readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8')
  assert.match(api, /export async function getMyMembershipEntitlement/)
  assert.match(api, /from\('membership_entitlements'\)[\s\S]*\.select\('plan_key,plan_label,status,training_access,nutrition_access,starts_at,ends_at'\)/)
  assert.doesNotMatch(api, /membership_entitlements'\)\.(insert|upsert|update|delete)/)
  assert.match(app, /function MembershipStatusCard/)
  assert.match(app, /if \(founderStatus\?\.founder_number\) return <FounderStatusCard/)
  assert.match(app, /id="settings-membership-v5" eyebrow="MEMBERSHIP" title="Membership & access"/)
  assert.match(app, /<MembershipStatusCard founderStatus=\{founderStatus\} membershipEntitlement=\{membershipEntitlement\}\/>/)
  assert.match(app, /id="settings-alpha-feedback"/)
  assert.match(app, /<AlphaSupportPanel \{\.\.\.feedbackProps\}\/>/)
})

test('current-main Home, recovery and food-diary integration contracts remain present', async () => {
  const app = await readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8')
  const diary = await readFile(new URL('../src/components/FoodDiary.jsx', import.meta.url), 'utf8')
  assert.match(app, /<ManualSteps /)
  assert.match(app, /<ReminderSettings /)
  assert.match(app, /<HealthIntegrations\/>/)
  assert.match(app, /desktopNavCollapsed && label\) button\.setAttribute\('title', label\)/)
  assert.match(app, /tab === 'MealPlan'.*<NutritionPage/s)
  assert.match(diary, /searchNutritionFoods/)
  assert.match(diary, /getNutritionFavouriteFoods/)
  assert.match(diary, /getNutritionFoodServings/)
  assert.match(diary, /getNutritionFoodByBarcode/)
  assert.match(diary, /compact = false/)
  assert.match(diary, /await onFoodPicked\(/)
  assert.match(app, /FoodDiary compact userId=/)
  assert.match(app, /recipeSaveError/)
  assert.match(app, /saveError: recipeSaveError/)
})

test('exercise library supports combined, clearable multi-select filters', async () => {
  const app = await readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8')
  assert.match(app, /const \[muscleGroups, setMuscleGroups\] = useState\(\[\]\)/)
  assert.match(app, /const \[equipment, setEquipment\] = useState\(\[\]\)/)
  assert.match(app, /aria-pressed=\{muscleGroups\.includes\(muscle\)\}/)
  assert.match(app, /\.some\(\(item\) => equipment\.includes\(item\)\)/)
  assert.match(app, /Clear filters/)
})

test('recipe foundation upgrades the earlier production recipes shape before indexing it', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260905103543_nutrition_recipe_foundation.sql', import.meta.url), 'utf8')
  assert.match(sql, /add column if not exists active boolean not null default true/)
  assert.match(sql, /nutrition_recipes_user_meal_idx[\s\S]*active/)
})

test('programme review and PT access rules are server-enforced and preserve canonical entitlements', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260906103400_membership_plan_change_and_pt_seats.sql', import.meta.url), 'utf8')
  assert.match(sql, /plan_change_windows/)
  assert.match(sql, /greatest\(v_period_days, 1\)/)
  assert.match(sql, /pg_advisory_xact_lock/)
  assert.match(sql, /get_my_plan_change_status/)
  assert.match(sql, /seat_limit smallint not null default 10/)
  assert.match(sql, /trainer_premium_one_active_grant_per_client_idx/)
  assert.match(sql, /admin_grant_trainer_premium/)
  assert.match(sql, /steel-core-premium-founder-lifetime/)
  assert.match(sql, /grant execute on function public\.admin_grant_trainer_premium\(uuid, uuid\) to service_role/i)
  assert.match(sql, /revoke all on table public\.trainer_premium_seat_pools, public\.trainer_premium_grants from anon, authenticated/i)
})

test('two-step verification enrolls and challenges authenticator factors without exposing secrets', async () => {
  const api = await readFile(new URL('../src/lib/steelApi.js', import.meta.url), 'utf8')
  const authGate = await readFile(new URL('../src/AuthGate.jsx', import.meta.url), 'utf8')
  const app = await readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8')
  assert.match(api, /auth\.mfa\.enroll\(\{ factorType: 'totp'/)
  assert.match(api, /auth\.mfa\.challengeAndVerify/)
  assert.match(api, /auth\.mfa\.getAuthenticatorAssuranceLevel/)
  assert.match(authGate, /mfaGate === 'required'/)
  assert.match(authGate, /verifyAuthenticatorApp/)
  assert.match(app, /Set up an authenticator app/)
  assert.match(app, /SMS verification/)
  assert.match(app, /Biometric \/ passkey/)
  assert.doesNotMatch(api, /service_role|SUPABASE_SERVICE_ROLE/)
})
