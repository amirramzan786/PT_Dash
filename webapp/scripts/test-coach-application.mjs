import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const page = fs.readFileSync(new URL('../../marketing-site/coach/apply/index.html', import.meta.url), 'utf8')
const endpoint = fs.readFileSync(new URL('../supabase/functions/coach-application/index.ts', import.meta.url), 'utf8')

test('public Coach application is a four-step onboarding journey', () => {
  assert.equal((page.match(/class="step(?: active)?"/g) || []).length, 4)
  assert.match(page, /Build the standard/)
  assert.match(page, /A person at Steel reviews every application/)
  assert.match(page, /Coach workspace/)
  assert.match(page, /Application received/)
})

test('application page and server agree on submission contract', () => {
  assert.match(page, /\/functions\/v1\/coach-application/)
  assert.match(page, /action:'coach_application'/)
  assert.match(page, /source='coach-apply-onboarding'/)
  assert.match(endpoint, /result\.action === 'coach_application'/)
  assert.match(endpoint, /from\('coach_applications'\)\.insert/)
  assert.match(endpoint, /consume_beta_rate_limit/)
})
