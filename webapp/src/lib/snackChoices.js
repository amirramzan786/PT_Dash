export const snackTasteOptions = ['Sweet', 'Savoury', 'Fruity', 'Crunchy', 'High protein', 'Grab-and-go']

const snackCandidates = [
  { name: 'Chocolate protein yoghurt', detail: 'Greek yoghurt · cocoa · protein · berries', calories: 285, protein: 31, carbs: 24, fat: 7, servingG: 295, ingredients: ['250g Greek yoghurt', '20g protein powder', '1 tsp cocoa', '80g berries'], instructions: 'Stir the protein powder and cocoa into the yoghurt, then top with berries.', tags: ['Sweet', 'High protein', 'Grab-and-go'] },
  { name: 'Turkey & hummus snack box', detail: 'Turkey · hummus · carrot · crackers', calories: 310, protein: 28, carbs: 27, fat: 10, servingG: 285, ingredients: ['90g sliced turkey', '40g hummus', '100g carrot sticks', '30g wholegrain crackers'], instructions: 'Pack the turkey, hummus, carrots and crackers into a snack box.', tags: ['Savoury', 'High protein', 'Grab-and-go'] },
  { name: 'Berry yoghurt crunch', detail: 'Greek yoghurt · berries · granola', calories: 295, protein: 27, carbs: 34, fat: 7, servingG: 300, ingredients: ['220g Greek yoghurt', '100g berries', '25g granola'], instructions: 'Layer the yoghurt and berries, then add the granola just before eating.', tags: ['Fruity', 'Crunchy', 'High protein'] },
  { name: 'Apple & peanut protein pot', detail: 'Apple · peanut butter · protein yoghurt', calories: 300, protein: 25, carbs: 32, fat: 10, servingG: 290, ingredients: ['1 apple', '15g peanut butter', '200g protein yoghurt'], instructions: 'Slice the apple and serve with peanut butter and protein yoghurt.', tags: ['Sweet', 'Fruity', 'High protein'] },
  { name: 'Cottage cheese rice cakes', detail: 'Cottage cheese · rice cakes · tomato', calories: 275, protein: 27, carbs: 29, fat: 6, servingG: 290, ingredients: ['200g cottage cheese', '3 rice cakes', '100g cherry tomatoes'], instructions: 'Top the rice cakes with cottage cheese and serve with tomatoes.', tags: ['Savoury', 'Crunchy', 'High protein'] },
  { name: 'Peanut protein smoothie', detail: 'Protein · banana · peanut butter · milk', calories: 325, protein: 30, carbs: 35, fat: 9, servingG: 420, ingredients: ['25g protein powder', '1 banana', '10g peanut butter', '250ml milk'], instructions: 'Blend all ingredients with ice until smooth.', tags: ['Sweet', 'Fruity', 'Grab-and-go'] },
]

export function buildSnackChoices(preferences = []) {
  const selected = new Set(Array.isArray(preferences) ? preferences : [])
  return snackCandidates
    .map((snack, index) => ({ snack, index, score: snack.tags.reduce((total, tag) => total + (selected.has(tag) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ snack }) => {
      const { tags, ...choice } = snack
      return choice
    })
}
