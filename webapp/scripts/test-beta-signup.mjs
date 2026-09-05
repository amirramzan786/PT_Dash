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
})
