const normalise = (value) => String(value || '').trim().toLowerCase().replace(/s$/, '')

const goalCopy = {
  'Lose fat and gain muscle': 'Build strength while keeping your weekly routine moving.',
  'Build muscle': 'Progressive strength work with enough volume to grow.',
  'Get stronger': 'Focused strength sessions with repeatable progress.',
  'Improve fitness': 'Strength work supported by practical conditioning.',
  'Train consistently': 'Simple sessions designed to make showing up easier.',
}

function planParameters(preferences) {
  const goal = preferences.goal || 'Train consistently'
  const beginner = preferences.experienceLevel === 'Beginner' || Number(preferences.currentTrainingDays || 0) === 0
  const advanced = preferences.experienceLevel === 'Advanced'
  const lowRecovery = Number(preferences.sleepQuality || 5) <= 2
  const adjustedSets = Math.max(2, (goal === 'Get stronger' ? (advanced ? 4 : 3) : advanced ? 4 : beginner ? 2 : 3) - (lowRecovery ? 1 : 0))
  if (goal === 'Get stronger') return { sets: adjustedSets, reps: '5–7', accessoryReps: '6–10', restSeconds: 120, rpe: beginner ? '6–7' : '7–8' }
  if (goal === 'Improve fitness') return { sets: adjustedSets, reps: '10–15', accessoryReps: '12–15', restSeconds: 60, rpe: beginner ? '5–6' : '6–7' }
  if (goal === 'Train consistently') return { sets: adjustedSets, reps: '8–12', accessoryReps: '10–12', restSeconds: 75, rpe: beginner ? '5–6' : '6–7' }
  return { sets: adjustedSets, reps: '8–12', accessoryReps: '10–15', restSeconds: 75, rpe: beginner ? '6–7' : '7–8' }
}

function templateFor(preferences) {
  const requestedDays = Math.max(1, Math.min(7, Number(preferences.trainingDays) || 3))
  const beginner = preferences.experienceLevel === 'Beginner' || Number(preferences.currentTrainingDays || 0) === 0
  if (requestedDays <= 3 || beginner) return { key: requestedDays === 1 ? 'full-body' : 'full-body-rotation', label: 'Full-body rotation', sessions: Array.from({ length: requestedDays }, (_, index) => ({ type: 'full', variation: index })) }
  if (requestedDays === 4) return { key: 'upper-lower', label: 'Upper / lower', sessions: [{ type: 'upper', variation: 0 }, { type: 'lower', variation: 0 }, { type: 'upper', variation: 1 }, { type: 'lower', variation: 1 }] }
  if (requestedDays >= 5) {
    const base = [{ type: 'push' }, { type: 'pull' }, { type: 'lower' }, { type: 'upper', variation: 1 }, { type: 'lower', variation: 1 }]
    if (requestedDays >= 6) base.push({ type: 'conditioning' })
    if (requestedDays >= 7) base.push({ type: 'recovery' })
    return { key: 'strength-hybrid', label: 'Strength hybrid', sessions: base }
  }
  return { key: 'full-body-rotation', label: 'Full-body rotation', sessions: [{ type: 'full', variation: 0 }, { type: 'full', variation: 1 }, { type: 'full', variation: 2 }] }
}

function isAvoided(row, preferences) {
  const text = `${preferences.limitations || ''} ${preferences.exerciseAvoidances || ''}`.toLowerCase()
  if (!text.trim()) return false
  const exercise = `${row.slug} ${row.name} ${row.primary_muscle_group} ${(row.movement_pattern || '')}`.toLowerCase()
  if (text.split(/[;,\n]/).some((term) => term.trim().length > 2 && exercise.includes(term.trim()))) return true
  if (/shoulder/.test(text) && /(shoulder|overhead|dip|push-up|chest press)/.test(exercise)) return true
  if (/(knee|patella)/.test(text) && /(squat|lunge|leg press|leg extension)/.test(exercise)) return true
  if (/(back pain|lower back|lumbar)/.test(text) && /(deadlift|hinge|wood chop)/.test(exercise)) return true
  return false
}

function createPicker(catalogue, preferences) {
  const equipment = new Set((preferences.availableEquipment?.length ? preferences.availableEquipment : ['Machines']).map(normalise))
  const available = catalogue.filter((row) => {
    const itemEquipment = (row.equipment || []).map(normalise)
    return !isAvoided(row, preferences) && (itemEquipment.includes('bodyweight') || itemEquipment.some((item) => equipment.has(item)))
  })
  return (slugs, used) => {
    const bySlug = new Map(available.map((row) => [row.slug, row]))
    const first = slugs.map((slug) => bySlug.get(slug)).find((row) => row && !used.has(row.slug))
    if (!first) return null
    used.add(first.slug)
    return first
  }
}

const slots = {
  squat: ['goblet-squat', 'leg-press', 'bodyweight-squat', 'walking-lunge', 'leg-extension'],
  hinge: ['romanian-deadlift', 'hip-thrust', 'glute-bridge', 'seated-leg-curl'],
  singleLeg: ['walking-lunge', 'split-squat', 'leg-press', 'bodyweight-squat'],
  push: ['dumbbell-bench-press', 'machine-chest-press', 'push-up', 'incline-chest-press-machine'],
  pull: ['lat-pulldown', 'seated-row-machine', 'dumbbell-row', 'prone-y-raise', 'high-row-machine'],
  press: ['machine-shoulder-press', 'dumbbell-shoulder-press', 'lateral-raise-machine', 'lateral-raise'],
  biceps: ['db-hammer-curl', 'cable-curl', 'preacher-curl-machine'],
  triceps: ['rope-tricep-pushdown', 'overhead-cable-tricep-extension', 'assisted-dip-machine'],
  core: ['plank', 'dead-bug', 'cable-wood-chop'],
  calves: ['calf-raise-machine', 'bodyweight-calf-raise'],
}

function sessionBlueprint(session) {
  if (session.type === 'upper') return session.variation ? ['pull', 'push', 'press', 'pull', 'triceps', 'core'] : ['push', 'pull', 'push', 'pull', 'biceps', 'core']
  if (session.type === 'lower') return session.variation ? ['hinge', 'singleLeg', 'squat', 'calves', 'core'] : ['squat', 'hinge', 'singleLeg', 'calves', 'core']
  if (session.type === 'push') return ['push', 'push', 'press', 'triceps', 'core']
  if (session.type === 'pull') return ['pull', 'pull', 'biceps', 'press', 'core']
  if (session.type === 'conditioning') return ['squat', 'push', 'pull', 'hinge', 'core']
  if (session.type === 'recovery') return ['core', 'singleLeg', 'pull', 'push']
  const rotations = [
    ['squat', 'push', 'pull', 'hinge', 'press', 'core'],
    ['hinge', 'pull', 'push', 'singleLeg', 'biceps', 'core'],
    ['squat', 'push', 'pull', 'singleLeg', 'triceps', 'core'],
  ]
  return rotations[session.variation % rotations.length]
}

function sessionName(session) {
  const names = { full: 'Full-body strength', upper: 'Upper body', lower: 'Lower body', push: 'Push strength', pull: 'Pull strength', conditioning: 'Conditioning & strength', recovery: 'Recovery movement' }
  return names[session.type] || 'Strength session'
}

function cardioPrescription(preferences, index, totalSessions) {
  const requested = Math.max(0, Number(preferences.cardioSessions) || 0)
  if (!requested || preferences.cardioPreference === 'None for now' || index >= Math.min(requested, totalSessions)) return null
  const duration = Number(preferences.sessionDurationMin) >= 60 ? 20 : 10
  const modality = { Walking: 'Brisk walk', Running: 'Easy run / run-walk', Cycling: 'Steady bike ride', Machines: 'Low-impact cardio machine', Classes: 'Preferred cardio class', Sports: 'Preferred sport', 'No preference': 'Easy incline walk' }[preferences.cardioPreference] || 'Easy incline walk'
  const rpe = preferences.cardioExperience === 'Beginner' ? '5–6' : preferences.cardioExperience === 'Experienced' ? '6–7' : '6'
  return { activity: modality, durationMin: duration, rpe, note: 'Keep the effort controlled enough to recover for your next strength session.' }
}

function exercisePrescription(row, slot, parameters, index) {
  const accessory = index >= 3 || ['biceps', 'triceps', 'core', 'calves', 'press'].includes(slot)
  return {
    slug: row.slug,
    sets: accessory ? Math.max(2, parameters.sets - 1) : parameters.sets,
    reps: accessory ? parameters.accessoryReps : parameters.reps,
    rpe: parameters.rpe,
    restSeconds: accessory ? Math.max(45, parameters.restSeconds - 15) : parameters.restSeconds,
    loadGuidance: 'Use a load that leaves the target effort in reserve; increase only when every prescribed rep is controlled.',
  }
}

export function buildGeneratedProgramme({ catalogue, preferences }) {
  const template = templateFor(preferences)
  const parameters = planParameters(preferences)
  const pick = createPicker(catalogue, preferences)
  const targetExercises = Number(preferences.sessionDurationMin) <= 30 ? 4 : Number(preferences.sessionDurationMin) <= 45 ? 5 : 6
  const workouts = template.sessions.map((session, index) => {
    const used = new Set()
    const exercises = sessionBlueprint(session).map((slot, slotIndex) => {
      const row = pick(slots[slot], used)
      return row ? exercisePrescription(row, slot, parameters, slotIndex) : null
    }).filter(Boolean).slice(0, targetExercises)
    return {
      name: sessionName(session),
      focus: session.type === 'full' ? 'Balanced full-body strength' : sessionName(session),
      description: `Built for ${preferences.goal || 'consistent training'} with your available equipment and current recovery context.`,
      durationMin: Number(preferences.sessionDurationMin) || 45,
      sortOrder: index + 1,
      cardio: cardioPrescription(preferences, index, template.sessions.length),
      exercises,
    }
  }).filter((workout) => workout.exercises.length >= 3)

  if (!workouts.length) throw new Error('Steel could not match enough suitable movements to your current equipment and limitations. Update those details and try again.')
  const summary = `${template.label} · ${workouts.length} session${workouts.length === 1 ? '' : 's'} · ${preferences.sessionDurationMin || 45} min. ${goalCopy[preferences.goal] || 'A practical starting plan built from your intake.'}`
  return {
    name: 'Your personalised Steel plan',
    templateKey: template.key,
    summary,
    generationVersion: 'rules-v1',
    intakeSnapshot: { ...preferences },
    workouts,
  }
}
