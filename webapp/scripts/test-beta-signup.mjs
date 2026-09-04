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
