import { buildGeneratedProgramme } from '../src/lib/programmeGenerator.js'

const catalogue = [
  ['bodyweight-squat', 'Bodyweight Squat', ['Bodyweight'], 'Quads', 'Squat'],
  ['goblet-squat', 'Goblet Squat', ['Dumbbells'], 'Quads', 'Squat'],
  ['leg-press', 'Leg Press', ['Machines'], 'Quads', 'Squat'],
  ['glute-bridge', 'Glute Bridge', ['Bodyweight'], 'Glutes', 'Hip extension'],
  ['hip-thrust', 'Hip Thrust', ['Barbell', 'Machines'], 'Glutes', 'Hip extension'],
  ['seated-leg-curl', 'Seated Leg Curl', ['Machines'], 'Hamstrings', 'Knee flexion'],
  ['walking-lunge', 'Walking Lunge', ['Bodyweight', 'Dumbbells'], 'Quads', 'Single-leg squat'],
  ['push-up', 'Push-up', ['Bodyweight'], 'Chest', 'Horizontal push'],
  ['dumbbell-bench-press', 'Dumbbell Bench Press', ['Dumbbells'], 'Chest', 'Horizontal push'],
  ['machine-chest-press', 'Machine Chest Press', ['Machines'], 'Chest', 'Horizontal push'],
  ['dumbbell-row', 'Dumbbell Row', ['Dumbbells'], 'Back', 'Horizontal pull'],
  ['seated-row-machine', 'Seated Row Machine', ['Machines'], 'Back', 'Horizontal pull'],
  ['lat-pulldown', 'Lat Pulldown', ['Machines', 'Cables'], 'Back', 'Vertical pull'],
  ['prone-y-raise', 'Prone Y Raise', ['Bodyweight'], 'Upper back', 'Scapular control'],
  ['dumbbell-shoulder-press', 'Dumbbell Shoulder Press', ['Dumbbells'], 'Shoulders', 'Vertical push'],
  ['machine-shoulder-press', 'Machine Shoulder Press', ['Machines'], 'Shoulders', 'Vertical push'],
  ['db-hammer-curl', 'Dumbbell Hammer Curl', ['Dumbbells'], 'Biceps', 'Elbow flexion'],
  ['preacher-curl-machine', 'Preacher Curl Machine', ['Machines'], 'Biceps', 'Elbow flexion'],
  ['rope-tricep-pushdown', 'Rope Tricep Pushdown', ['Cables'], 'Triceps', 'Elbow extension'],
  ['plank', 'Plank', ['Bodyweight'], 'Core', 'Anti-extension'],
  ['bodyweight-calf-raise', 'Bodyweight Calf Raise', ['Bodyweight'], 'Calves', 'Plantar flexion'],
].map(([slug, name, equipment, primary_muscle_group, movement_pattern]) => ({ slug, name, equipment, primary_muscle_group, movement_pattern }))

const base = { goal: 'Train consistently', experienceLevel: 'Intermediate', availableEquipment: ['Machines'], trainingDays: 3, sessionDurationMin: 45, currentTrainingDays: 2, sleepQuality: 4, cardioPreference: 'None for now', cardioSessions: 0 }
const cases = [
  ['beginner at home', { ...base, experienceLevel: 'Beginner', availableEquipment: ['Bodyweight', 'Dumbbells'], trainingDays: 3, sessionDurationMin: 30 }, { sessions: 3, template: 'full-body-rotation', cardio: false }],
  ['intermediate gym strength', { ...base, goal: 'Get stronger', availableEquipment: ['Machines', 'Barbell', 'Dumbbells'], trainingDays: 4, sessionDurationMin: 60 }, { sessions: 4, template: 'upper-lower', cardio: false }],
  ['fitness with cycling', { ...base, goal: 'Improve fitness', availableEquipment: ['Machines', 'Dumbbells', 'Bodyweight'], trainingDays: 5, sessionDurationMin: 45, cardioPreference: 'Cycling', cardioExperience: 'Beginner', cardioSessions: 2 }, { sessions: 5, template: 'strength-hybrid', cardio: true }],
  ['reduced recovery', { ...base, experienceLevel: 'Beginner', availableEquipment: ['Bodyweight', 'Dumbbells'], sleepQuality: 1 }, { sessions: 3, template: 'full-body-rotation', cardio: false }],
  ['shoulder and knee avoidance', { ...base, availableEquipment: ['Bodyweight', 'Dumbbells'], limitations: 'shoulder, knee', exerciseAvoidances: 'shoulder press, squat, lunge' }, { sessions: 3, template: 'full-body-rotation', cardio: false }],
]

for (const [name, preferences, expected] of cases) {
  const plan = buildGeneratedProgramme({ catalogue, preferences })
  if (plan.workouts.length !== expected.sessions || plan.templateKey !== expected.template) throw new Error(`${name}: unexpected plan structure`)
  if (plan.workouts.some((workout) => workout.exercises.length < 3)) throw new Error(`${name}: unsafe short workout generated`)
  if (plan.workouts.some((workout) => new Set(workout.exercises.map((exercise) => exercise.slug)).size !== workout.exercises.length)) throw new Error(`${name}: duplicate exercise in session`)
  if (expected.cardio !== plan.workouts.some((workout) => Boolean(workout.cardio))) throw new Error(`${name}: cardio prescription mismatch`)
}

console.log(`Programme generator QA passed: ${cases.length} realistic personas.`)
