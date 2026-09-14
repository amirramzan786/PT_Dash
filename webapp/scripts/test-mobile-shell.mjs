import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('mobile shell reserves the system status-bar safe area', async () => {
  const [indexHtml, appCss] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/app-v2.css', import.meta.url), 'utf8'),
  ])

  assert.match(indexHtml, /name="viewport"[^>]+viewport-fit=cover/)
  assert.match(appCss, /\.steel-screen\s*\{[^}]*env\(safe-area-inset-top/)
})
