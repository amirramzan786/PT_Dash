import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('mobile shell reserves the system status-bar safe area', async () => {
  const [indexHtml, appCss, capacitorConfig] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/app-v2.css', import.meta.url), 'utf8'),
    readFile(new URL('../capacitor.config.ts', import.meta.url), 'utf8'),
  ])

  assert.match(indexHtml, /name="viewport"[^>]+viewport-fit=cover/)
  assert.match(appCss, /--steel-safe-top:\s*var\(--safe-area-inset-top/)
  assert.match(appCss, /\.steel-screen\s*\{[^}]*var\(--steel-safe-top\)/)
  assert.match(appCss, /body::before\s*\{[^}]*height:\s*var\(--steel-safe-top\)/)
  assert.match(capacitorConfig, /insetsHandling:\s*'css'/)
  assert.match(capacitorConfig, /initialViewportFitValueHint:\s*'cover'/)
  assert.match(capacitorConfig, /style:\s*'DARK'/)
})
