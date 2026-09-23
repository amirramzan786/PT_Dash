import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('barcode camera accepts one detection and releases the stream before lookup', async () => {
  const diary = await readFile(new URL('../src/components/FoodDiary.jsx', import.meta.url), 'utf8')
  assert.match(diary, /const detectedRef = useRef\\(false\\)/)
  assert.match(diary, /if \\(detecting \\|\\| detectedRef\\.current \\|\\| !active \\|\\| !videoRef\\.current\\) return/)
  assert.match(diary, /if \\(value && !detectedRef\\.current\\)/)
  assert.match(diary, /detectedRef\\.current = true/)
  assert.match(diary, /stream\\?\\.getTracks\\(\\)\\.forEach\\(\\(track\\) => track\\.stop\\(\\)\\)/)
  assert.match(diary, /Barcode found\\. Looking it up…/)
})

test('food diary retains a manual barcode route when camera support is unavailable', async () => {
  const diary = await readFile(new URL('../src/components/FoodDiary.jsx', import.meta.url), 'utf8')
  assert.match(diary, /Camera barcode scanning is not supported in this browser/)
  assert.match(diary, /Enter the barcode number instead/)
  assert.match(diary, /inputMode=\\"numeric\\"/)
  assert.match(diary, /getNutritionFoodByBarcode/)
})
