import assert from 'node:assert/strict'
import test from 'node:test'
import { getNativeRuntime, isNativeShell } from '../src/lib/nativeBridge.js'

test('the native bridge is an inert, inspectable boundary on the web', () => {
  const runtime = getNativeRuntime()

  assert.equal(runtime.platform, 'web')
  assert.equal(runtime.isNative, false)
  assert.equal(runtime.healthBridgeAvailable, false)
  assert.match(runtime.reason, /mobile shell/i)
  assert.equal(isNativeShell(), false)
})
