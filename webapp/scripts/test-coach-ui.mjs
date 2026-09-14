import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const component = fs.readFileSync(new URL('../src/components/CoachWorkspace.jsx', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../src/lib/steelApi.js', import.meta.url), 'utf8')

test('Coach UI is a consent-led, relationship-backed preview', () => {
  assert.match(component, /Foundation preview/)
  assert.match(component, /Client-owned access/)
  assert.match(component, /Client consent is required/)
  assert.match(component, /Signals, not silent decisions/)
  assert.match(component, /Your Steel Coach/)
  assert.match(component, /Book a session/)
  assert.match(component, /Calendly or Google Calendar/)
  assert.doesNotMatch(component, /<strong>Coach messages<\/strong>/)
  assert.doesNotMatch(component, /from\(['"]coach_client_relationships/)
  assert.match(api, /rpc\('get_my_coach_relationships'\)/)
})
