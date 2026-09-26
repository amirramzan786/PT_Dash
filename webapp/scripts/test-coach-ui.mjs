import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const component = fs.readFileSync(new URL('../src/components/CoachWorkspace.jsx', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/AppV3.jsx', import.meta.url), 'utf8')
const auth = fs.readFileSync(new URL('../src/AuthGate.jsx', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../src/lib/steelApi.js', import.meta.url), 'utf8')
const coachAdmin = fs.readFileSync(new URL('../supabase/functions/coach-admin/index.ts', import.meta.url), 'utf8')

test('Coach is a protected platform, not a member-app tab', () => {
  assert.match(app, /\['\/coach', '\/coach\/', '\/coach\/login', '\/coach-console'\]/)
  assert.match(app, /CoachWorkspace userRole=/)
  assert.match(auth, /\/coach\/login/)
  assert.match(auth, /STEEL COACH · PROTECTED WORKSPACE/)
  assert.doesNotMatch(app, /id:\s*['"]Coach['"]/)
  assert.doesNotMatch(app, /navigateToTab\(['"]Coach['"]\)/)
})

test('Coach review refresh does not return a Promise as React cleanup', () => {
  assert.match(component, /void refresh\(\)/)
  assert.doesNotMatch(component, /useEffect\(refresh/)
  assert.doesNotMatch(component, /useEffect\(\(\)\s*=>\s*refresh\(\)/)
})

test('Coach workspace restores the full Steel navigation, human Coach and AI surfaces', () => {
  assert.match(component, /coach-sidebar-nav/)
  assert.match(component, /Coach settings/)
  assert.match(component, /CHECK-IN COMMAND CENTRE/)
  assert.match(component, /INTERNAL AI COACH TESTING/)
  assert.match(component, /Coach applications/)
  assert.match(api, /rpc\('get_my_coach_relationships'\)/)
  assert.match(api, /get_coach_client_record_workflow/)
  assert.match(api, /from\('coach_applications'\)/)
  assert.match(api, /functions\.invoke\('coach-admin'/)
})

test('approved Coach invites return to the dedicated Coach route', () => {
  assert.match(coachAdmin, /redirectTo:\s*'https:\/\/app\.projectsteel\.co\.uk\/coach'/)
  assert.doesNotMatch(coachAdmin, /#Coach/)
})
