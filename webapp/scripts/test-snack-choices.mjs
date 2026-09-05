import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSnackChoices } from '../src/lib/snackChoices.js'

test('snack choices are a compact set of three defaults', () => {
  const choices = buildSnackChoices()
  assert.equal(choices.length, 3)
  assert.equal(new Set(choices.map((choice) => choice.name)).size, 3)
})

test('snack choices prioritise the tastes a member selects', () => {
  const choices = buildSnackChoices(['Savoury', 'Crunchy'])
  assert.equal(choices[0].name, 'Cottage cheese rice cakes')
  assert.ok(choices.some((choice) => choice.name === 'Turkey & hummus snack box'))
})
