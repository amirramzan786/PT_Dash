export const workouts = [
  {
    id: 'back-biceps',
    name: 'Back + Biceps',
    duration: '~45 min',
    finisher: '5–10 min incline walk',
    exercises: [
      { id: 'lat-pulldown', name: 'Lat Pulldown', equipment: 'Machine / Cable', sets: 3, reps: '8–12' },
      { id: 'seated-row-machine', name: 'Seated Row Machine', equipment: 'Machine', sets: 3, reps: '8–12' },
      { id: 'high-row-machine', name: 'High Row Machine', equipment: 'Machine', sets: 3, reps: '10–12' },
      { id: 'preacher-curl-machine', name: 'Preacher Curl Machine', equipment: 'Machine', sets: 3, reps: '10–12' },
      { id: 'cable-curl', name: 'Cable Curl', equipment: 'Cable', sets: 3, reps: '10–12' },
      { id: 'db-hammer-curl', name: 'Dumbbell Hammer Curl', equipment: 'Dumbbells', sets: 2, reps: '10–12' },
    ],
  },
  {
    id: 'chest-triceps',
    name: 'Chest + Triceps',
    duration: '~45 min',
    finisher: '5–10 min incline walk',
    exercises: [
      { id: 'machine-chest-press', name: 'Machine Chest Press', equipment: 'Machine', sets: 3, reps: '8–12' },
      { id: 'incline-chest-press-machine', name: 'Incline Chest Press Machine', equipment: 'Machine', sets: 3, reps: '8–12' },
      { id: 'pec-deck', name: 'Pec Deck', equipment: 'Machine', sets: 3, reps: '10–15' },
      { id: 'rope-tricep-pushdown', name: 'Rope Tricep Pushdown', equipment: 'Cable', sets: 3, reps: '10–12' },
      { id: 'overhead-cable-tricep-extension', name: 'Overhead Cable Tricep Extension', equipment: 'Cable', sets: 3, reps: '10–12' },
      { id: 'assisted-dip-machine', name: 'Assisted Dip Machine', equipment: 'Machine', sets: 2, reps: '8–12' },
    ],
  },
  {
    id: 'shoulders-legs',
    name: 'Shoulders + Legs',
    duration: '~45 min',
    finisher: '5–10 min incline walk',
    exercises: [
      { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', equipment: 'Machine', sets: 3, reps: '8–12' },
      { id: 'lateral-raise-machine', name: 'Lateral Raise Machine', equipment: 'Machine', sets: 3, reps: '10–15' },
      { id: 'leg-press', name: 'Leg Press', equipment: 'Machine', sets: 3, reps: '8–12' },
      { id: 'leg-extension', name: 'Leg Extension', equipment: 'Machine', sets: 3, reps: '10–15' },
      { id: 'seated-leg-curl', name: 'Seated Leg Curl', equipment: 'Machine', sets: 3, reps: '10–15' },
      { id: 'calf-raise-machine', name: 'Calf Raise Machine', equipment: 'Machine', sets: 3, reps: '12–15' },
    ],
  },
]

export const exerciseLibrary = [
  ...workouts.flatMap((workout) => workout.exercises),
  { id: 'cable-face-pull', name: 'Cable Face Pull', equipment: 'Cable', sets: 3, reps: '10–15' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', equipment: 'Dumbbells', sets: 3, reps: '8–12' },
  { id: 'chest-supported-db-row', name: 'Chest-Supported Dumbbell Row', equipment: 'Dumbbells', sets: 3, reps: '8–12' },
]
