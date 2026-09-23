import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { SteelHealthConnect, SteelHealthKit, getNativeRuntime, isNativeShell } from '../src/lib/nativeBridge.js'

test('the native bridge is an inert, inspectable boundary on the web', () => {
  const runtime = getNativeRuntime()

  assert.equal(runtime.platform, 'web')
  assert.equal(runtime.isNative, false)
  assert.equal(runtime.healthBridgeAvailable, false)
  assert.equal(runtime.healthConnectBridgeAvailable, false)
  assert.match(runtime.reason, /mobile shell/i)
  assert.equal(isNativeShell(), false)
})

test('the web HealthKit fallback is explicit and never reads device data', async () => {
  const availability = await SteelHealthKit.isAvailable()

  assert.equal(availability.available, false)
  await assert.rejects(() => SteelHealthKit.readActivity({}), /native iOS app/i)
})

test('the web Health Connect fallback is explicit and never reads device data', async () => {
  const availability = await SteelHealthConnect.isAvailable()

  assert.equal(availability.available, false)
  await assert.rejects(() => SteelHealthConnect.readActivity({}), /native Android app/i)
})

test('the native activity fixture matches the provider-neutral ingest contract', async () => {
  const fixtureUrl = new URL('../ios/App/App/HealthKitFixtures/sample-activity.json', import.meta.url)
  const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'))

  assert.equal(fixture.source, 'apple_health')
  assert.equal(fixture.records.length, 2)
  assert.deepEqual(
    fixture.records.map((record) => record.metric),
    ['steps', 'workout_minutes'],
  )

  for (const record of fixture.records) {
    assert.equal(record.source, 'apple_health')
    assert.match(record.source_record_id, /^apple_health:\d{4}-\d{2}-\d{2}:(steps|workout_minutes):v1$/)
    assert.match(record.time_zone, /^[A-Za-z_]+\/[A-Za-z_]+$/)
    assert.match(record.observed_at, /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(typeof record.value, 'number')
  }
})

test('the Android bridge stays read-only and limited to the approved activity scopes', async () => {
  const bridge = await readFile(new URL('../android/app/src/main/java/uk/co/projectsteel/mobile/SteelHealthConnectPlugin.java', import.meta.url), 'utf8')
  assert.match(bridge, /READ_STEPS/)
  assert.match(bridge, /READ_EXERCISE/)
  assert.match(bridge, /source_record_id/)
  assert.match(bridge, /time_zone/)
  assert.doesNotMatch(bridge, /WRITE_STEPS|WRITE_EXERCISE|READ_SLEEP|READ_HEART_RATE|READ_HEART_RATE_VARIABILITY/)
})

test('a completed provider sync refreshes the visible activity totals immediately', async () => {
  const app = await readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8')
  assert.match(app, /async function handleConnectActivityProvider\(\{ provider, status, scopes, records \}\) \{[\s\S]*saveImportedActivityRecords\(user\.id, provider, records \|\| \[\]\)[\s\S]*await refreshSteps\(\)[\s\S]*setActivityConnections/s)
})
