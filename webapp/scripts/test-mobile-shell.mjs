import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('mobile shell reserves the system status-bar safe area', async () => {
  const [indexHtml, appCss, appJsx, capacitorConfig] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/app-v2.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8'),
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

test('home direction card stays visible on narrow screens', async () => {
  const [appCss, appJsx] = await Promise.all([
    readFile(new URL('../src/app-v2.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/AppV3.jsx', import.meta.url), 'utf8'),
  ])

  assert.match(appJsx, /className="home-direction-signal"/)
  assert.match(appCss, /\.home-direction-card\s*\{[^}]*display:\s*grid/)
  assert.match(appCss, /\.home-direction-card\s*\{[^}]*border:\s*1px solid rgba\(217,173,85,\.46\)/)
  assert.match(appCss, /\.home-direction-actions\s*\{[^}]*justify-content:\s*flex-end/)
  assert.match(appCss, /@media \(max-width: 520px\) \{[\s\S]*?\.home-direction-actions\s*\{[^}]*width:\s*100%/)
})

test('authenticated product surface is lazy-loaded after the auth shell', async () => {
  const authGate = await readFile(new URL('../src/AuthGate.jsx', import.meta.url), 'utf8')
  assert.match(authGate, /const AppV3 = lazy\(\(\) => import\('\.\/AppV3'\)\)/)
  assert.match(authGate, /<Suspense fallback=/)
})
