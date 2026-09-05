import { supabase, supabaseConfigured } from './supabase'
import { localDay, validateSteps, preferredSteps, dailyStepHistory } from './steps'
import { normalizeReminders } from './reminders'

function requireSupabase() {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getCurrentUser() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') throw error
  return data?.user ?? null
}

export async function loadUserRole(userId) {
  const client = requireSupabase()
  const { data, error } = await client.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.role || 'user'
}

export async function signIn(email, password) {
  const client = requireSupabase()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password) {
  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw error
  return data
}

function getAuthRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_APP_URL
  if (configuredUrl) return configuredUrl
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return window.location.origin
  return 'https://pt-dash.pages.dev'
}

export async function sendPasswordReset(email, redirectTo = getAuthRedirectUrl()) {
  const client = requireSupabase()
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function updatePassword(password) {
  const client = requireSupabase()
  const { data, error } = await client.auth.updateUser({ password })
  if (error) throw error
  return data.user
}

export async function signOut() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function sendOnboardingAiMessage({ conversationId, messages, aiDataConsent }) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('steel-ai-onboarding', {
    body: { conversationId: conversationId || null, messages, aiDataConsent: aiDataConsent === true },
  })
  if (error) {
    let detail = null
    try { detail = await error.context?.json?.() } catch { /* Use the SDK fallback message. */ }
    const nextError = new Error(detail?.error || error.message || 'Atlas is unavailable right now.')
    nextError.code = detail?.code || 'AI_UNAVAILABLE'
    throw nextError
  }
  return data
}

export function onAuthChange(callback) {
  const client = requireSupabase()
  const { data } = client.auth.onAuthStateChange((event, session) => callback(session?.user ?? null, event))
  return () => data.subscription.unsubscribe()
}

export async function getActiveGeneratedProgramme(userId) {
  const client = requireSupabase()
  const { data, error } = await client.from('training_programmes').select('id,name,summary,template_key,generation_version,created_at').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function loadGeneratedProgramme(userId) {
  const client = requireSupabase()
  const plan = await getActiveGeneratedProgramme(userId)
  if (!plan) return []
  const { data: workoutRows, error: workoutError } = await client.from('programme_workouts').select('id,name,focus,description,duration_min,sort_order,cardio').eq('programme_id', plan.id).order('sort_order')
  if (workoutError) throw workoutError
  const workoutIds = (workoutRows ?? []).map((row) => row.id)
  if (!workoutIds.length) return []
  const { data: links, error: linkError } = await client.from('programme_workout_exercises').select('id,programme_workout_id,sort_order,sets,rep_target,rpe_target,rest_seconds,load_guidance,exercise_catalog(id,slug,name,primary_muscle_group,secondary_muscle_groups,equipment,movement_pattern,difficulty,instructions,video_url,thumbnail_url,coaching_cues,safety_notes,video_source,active)').in('programme_workout_id', workoutIds).order('sort_order')
  if (linkError) throw linkError
  return (workoutRows ?? []).map((workout) => ({
    id: workout.id,
    source: 'programme',
    programmeId: plan.id,
    planSummary: plan.summary,
    templateKey: plan.template_key,
    name: workout.name,
    focus: workout.focus,
    description: workout.description,
    duration: workout.duration_min ? `~${workout.duration_min} min` : '~45 min',
    finisher: workout.cardio ? `${workout.cardio.activity} · ${workout.cardio.durationMin} min · RPE ${workout.cardio.rpe}` : 'Optional easy cardio finisher',
    cardio: workout.cardio || null,
    exercises: (links ?? []).filter((link) => link.programme_workout_id === workout.id && link.exercise_catalog?.active !== false).map((link) => ({
      id: link.exercise_catalog?.id,
      programmeId: link.id,
      source: 'catalog',
      name: link.exercise_catalog?.name ?? 'Exercise',
      equipment: (link.exercise_catalog?.equipment ?? []).join(' / ') || 'Gym',
      muscleGroup: link.exercise_catalog?.primary_muscle_group ?? null,
      secondaryMuscleGroups: link.exercise_catalog?.secondary_muscle_groups ?? [],
      movementPattern: link.exercise_catalog?.movement_pattern ?? null,
      difficulty: link.exercise_catalog?.difficulty ?? null,
      instructions: [
        link.exercise_catalog?.instructions,
        link.rpe_target ? `Target effort: RPE ${link.rpe_target}.` : null,
        link.rest_seconds ? `Rest ${link.rest_seconds} seconds between sets.` : null,
        link.load_guidance || null,
      ].filter(Boolean).join(' ') || null,
      coachingCues: link.exercise_catalog?.coaching_cues ?? [],
      safetyNotes: link.exercise_catalog?.safety_notes ?? null,
      youtubeUrl: link.exercise_catalog?.video_url ?? null,
      thumbnailUrl: link.exercise_catalog?.thumbnail_url ?? null,
      sets: link.sets,
      reps: link.rep_target,
      rpe: link.rpe_target,
      restSeconds: link.rest_seconds,
      loadGuidance: link.load_guidance,
      startWeightKg: 0,
    })),
  }))
}

export async function replaceGeneratedProgramme(plan) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('replace_generated_programme', { p_plan: plan })
  if (error) throw error
  return data
}

export async function loadWorkouts(userId) {
  const client = requireSupabase()
  const generatedProgramme = await loadGeneratedProgramme(userId)
  const { data: workoutRows, error: workoutError } = await client.from('workouts').select('id,name,sort_order,active').eq('user_id', userId).eq('active', true).order('sort_order')
  if (workoutError) throw workoutError
  if (!workoutRows?.length) return generatedProgramme.length ? generatedProgramme : loadWorkoutCatalog(client)
  const workoutIds = workoutRows.map((row) => row.id)
  const { data: links, error: linkError } = await client.from('workout_exercises').select('id,workout_id,exercise_id,sort_order,sets,rep_target,start_weight_kg,exercises(id,name,equipment,youtube_url,active)').in('workout_id', workoutIds).order('sort_order')
  if (linkError) throw linkError
    const { data: catalogueRows } = await client.from('exercise_catalog').select('name,primary_muscle_group,secondary_muscle_groups,movement_pattern,difficulty,instructions,video_url,thumbnail_url,coaching_cues,safety_notes,video_source,active').eq('active', true).eq('is_free', true)
  const catalogueByName = new Map((catalogueRows ?? []).map((row) => [row.name.trim().toLowerCase(), row]))
  const userWorkouts = workoutRows.map((workout) => ({
    id: workout.id,
    name: workout.name,
    duration: '~45 min',
    finisher: '5–10 min incline walk',
    exercises: (links ?? []).filter((link) => link.workout_id === workout.id && link.exercises?.active !== false).map((link) => ({
      id: link.exercise_id,
      programmeId: link.id,
      name: link.exercises?.name ?? 'Exercise',
      equipment: link.exercises?.equipment ?? 'Gym',
      muscleGroup: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.primary_muscle_group ?? null,
      secondaryMuscleGroups: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.secondary_muscle_groups ?? [],
      movementPattern: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.movement_pattern ?? null,
      difficulty: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.difficulty ?? null,
      instructions: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.instructions ?? null,
      coachingCues: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.coaching_cues ?? [],
      safetyNotes: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.safety_notes ?? null,
      youtubeUrl: link.exercises?.youtube_url ?? catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.video_url ?? null,
      thumbnailUrl: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.thumbnail_url ?? null,
      sets: link.sets,
      reps: link.rep_target,
      startWeightKg: link.start_weight_kg ?? 0,
    })),
  }))
  return generatedProgramme.length ? [...generatedProgramme, ...userWorkouts] : userWorkouts
}

async function loadWorkoutCatalog(client) {
  const { data: workoutRows, error: workoutError } = await client.from('workout_catalog').select('id,slug,name,description,focus,goal_tags,equipment,difficulty,duration_min,is_free,active').eq('active', true).eq('is_free', true).order('name')
  if (workoutError) throw workoutError
  if (!workoutRows?.length) return []
  const workoutIds = workoutRows.map((row) => row.id)
  const { data: links, error: linkError } = await client.from('workout_catalog_exercises').select('id,workout_id,exercise_id,sort_order,sets,rep_target,rest_seconds,exercise_catalog(id,slug,name,primary_muscle_group,secondary_muscle_groups,equipment,movement_pattern,difficulty,instructions,video_url,thumbnail_url,coaching_cues,safety_notes,video_source,active)').in('workout_id', workoutIds).order('sort_order')
  if (linkError) throw linkError
  return workoutRows.map((workout) => ({
    id: workout.id,
    source: 'catalog',
    name: workout.name,
    focus: workout.focus,
    goalTags: workout.goal_tags ?? [],
    equipment: workout.equipment ?? [],
    difficulty: workout.difficulty,
    duration: workout.duration_min ? `~${workout.duration_min} min` : '~45 min',
    finisher: '5–10 min incline walk',
    exercises: (links ?? []).filter((link) => link.workout_id === workout.id && link.exercise_catalog?.active !== false).map((link) => ({
      id: link.exercise_id,
      programmeId: link.id,
      name: link.exercise_catalog?.name ?? 'Exercise',
      equipment: (link.exercise_catalog?.equipment ?? []).join(' / ') || 'Gym',
      muscleGroup: link.exercise_catalog?.primary_muscle_group ?? null,
      secondaryMuscleGroups: link.exercise_catalog?.secondary_muscle_groups ?? [],
      movementPattern: link.exercise_catalog?.movement_pattern ?? null,
      difficulty: link.exercise_catalog?.difficulty ?? null,
      instructions: link.exercise_catalog?.instructions ?? null,
      coachingCues: link.exercise_catalog?.coaching_cues ?? [],
      safetyNotes: link.exercise_catalog?.safety_notes ?? null,
      youtubeUrl: link.exercise_catalog?.video_url ?? null,
      thumbnailUrl: link.exercise_catalog?.thumbnail_url ?? null,
      sets: link.sets,
      reps: link.rep_target,
      restSeconds: link.rest_seconds,
    })),
  }))
}

export async function loadExerciseCatalog({ muscleGroup, limit = 100 } = {}) {
  const client = requireSupabase()
  let query = client.from('exercise_catalog').select('id,slug,name,primary_muscle_group,secondary_muscle_groups,equipment,movement_pattern,difficulty,instructions,video_url,thumbnail_url,coaching_cues,safety_notes,video_source,is_free,active').eq('active', true).eq('is_free', true).order('name').limit(limit)
  if (muscleGroup) query = query.eq('primary_muscle_group', muscleGroup)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function saveCustomWorkout({ userId, workout }) {
  const client = requireSupabase()
  const { data: latest } = await client.from('workouts').select('sort_order').eq('user_id', userId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const { data: workoutRow, error: workoutError } = await client.from('workouts').insert({ user_id: userId, name: workout.name, sort_order: (latest?.sort_order ?? -1) + 1 }).select('id,name').single()
  if (workoutError) throw workoutError
  const exerciseRows = []
  for (const exercise of workout.exercises) {
    const { data: existing, error: existingError } = await client.from('exercises').select('id').eq('user_id', userId).eq('name', exercise.name).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existingError) throw existingError
    if (existing?.id) { exerciseRows.push({ id: existing.id, exercise }) ; continue }
    const { data: created, error: exerciseError } = await client.from('exercises').insert({ user_id: userId, name: exercise.name, equipment: exercise.equipment, youtube_url: exercise.youtubeUrl ?? null }).select('id').single()
    if (exerciseError) throw exerciseError
    exerciseRows.push({ id: created.id, exercise })
  }
  const { error: linkError } = await client.from('workout_exercises').insert(exerciseRows.map(({ id, exercise }, index) => ({ workout_id: workoutRow.id, exercise_id: id, sort_order: index + 1, sets: exercise.sets, rep_target: exercise.reps, start_weight_kg: Number(exercise.startWeightKg) || 0 })))
  if (linkError) throw linkError
  return workoutRow
}

export async function updateCustomWorkout({ userId, workout }) {
  const client = requireSupabase()
  const { error: workoutError } = await client.from('workouts').update({ name: workout.name }).eq('id', workout.id).eq('user_id', userId)
  if (workoutError) throw workoutError
  const { data: existingLinks, error: linksError } = await client.from('workout_exercises').select('id,exercise_id,start_weight_kg').eq('workout_id', workout.id)
  if (linksError) throw linksError
  const resolved = []
  for (const exercise of workout.exercises) {
    const { data: existing, error: existingError } = await client.from('exercises').select('id').eq('user_id', userId).eq('name', exercise.name).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existingError) throw existingError
    if (existing?.id) { resolved.push({ id: existing.id, exercise }); continue }
    const { data: created, error: createError } = await client.from('exercises').insert({ user_id: userId, name: exercise.name, equipment: exercise.equipment, youtube_url: exercise.youtubeUrl ?? null }).select('id').single()
    if (createError) throw createError
    resolved.push({ id: created.id, exercise })
  }
  for (const [index, { id, exercise }] of resolved.entries()) {
    const existingLink = (existingLinks ?? []).find((link) => link.exercise_id === id)
    const values = { workout_id: workout.id, exercise_id: id, sort_order: index + 1, sets: exercise.sets, rep_target: exercise.reps, start_weight_kg: Number(exercise.startWeightKg) || 0 }
    const result = existingLink ? await client.from('workout_exercises').update(values).eq('id', existingLink.id) : await client.from('workout_exercises').insert(values)
    if (result.error) throw result.error
  }
  const keepIds = new Set(resolved.map(({ id }) => id))
  for (const link of existingLinks ?? []) if (!keepIds.has(link.exercise_id)) {
    const { error } = await client.from('workout_exercises').delete().eq('id', link.id)
    if (error) throw error
  }
  return workout
}

export async function getDashboardStats(userId) {
  const client = requireSupabase()
  const [weightResult, sessionResult, recentResult, sessionRowsResult] = await Promise.all([
    client.from('weight_checkins').select('weight_lb,checkin_date').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(1),
    client.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('sessions').select('id,workout_name,session_date,duration_min').eq('user_id', userId).order('session_date', { ascending: false }).order('created_at', { ascending: false }).limit(1),
    client.from('sessions').select('id,session_date').eq('user_id', userId).order('session_date', { ascending: false }).limit(365),
  ])
  if (weightResult.error) throw weightResult.error
  if (sessionResult.error) throw sessionResult.error
  if (recentResult.error) throw recentResult.error
  if (sessionRowsResult.error) throw sessionRowsResult.error
  const sessionRows = sessionRowsResult.data ?? []
  const sessionIds = sessionRows.map((row) => row.id)
  let setRows = []
  if (sessionIds.length) {
    const { data, error } = await client.from('set_logs').select('session_id,reps,weight_kg').in('session_id', sessionIds)
    if (error) throw error
    setRows = data ?? []
  }
  const activeDates = [...new Set(sessionRows.map((row) => row.session_date).filter(Boolean))].sort().reverse()
  let streakDays = 0
  for (let index = 0; index < activeDates.length; index += 1) {
    const current = new Date(`${activeDates[index]}T00:00:00`)
    const previous = index === 0 ? current : new Date(`${activeDates[index - 1]}T00:00:00`)
    if (index > 0 && Math.round((previous - current) / 86400000) !== 1) break
    streakDays += 1
  }
  const monthKey = new Date().toISOString().slice(0, 7)
  const monthSessionIds = new Set(sessionRows.filter((row) => row.session_date?.slice(0, 7) === monthKey).map((row) => row.id))
  const volumeKg = setRows.filter((row) => monthSessionIds.has(row.session_id)).reduce((total, row) => total + (Number(row.weight_kg) || 0) * (Number(row.reps) || 0), 0)
  return { latestWeightLb: weightResult.data?.[0]?.weight_lb ?? null, sessionCount: sessionResult.count ?? 0, latestSession: recentResult.data?.[0] ?? null, streakDays, volumeKg }
}

export async function getWeightHistory(userId, limit = 30) {
  const client = requireSupabase()
  const { data, error } = await client.from('weight_checkins').select('id,checkin_date,weight_lb').eq('user_id', userId).order('checkin_date', { ascending: true }).limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getRecentSessions(userId, limit = 8) {
  const client = requireSupabase()
  const { data, error } = await client.from('sessions').select('id,workout_name,session_date,duration_min,notes,created_at').eq('user_id', userId).order('session_date', { ascending: false }).order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getPreviousExerciseSets(userId, exerciseId) {
  const client = requireSupabase()
  const { data: sessions, error: sessionError } = await client.from('sessions').select('id').eq('user_id', userId).order('session_date', { ascending: false }).order('created_at', { ascending: false }).limit(12)
  if (sessionError) throw sessionError
  const ids = (sessions ?? []).map((row) => row.id)
  if (!ids.length) return []
  const { data, error } = await client.from('set_logs').select('session_id,set_no,reps,weight_kg,created_at').eq('exercise_id', exerciseId).in('session_id', ids).order('created_at', { ascending: false })
  if (error) throw error
  if (!data?.length) return []
  const latestSessionId = data[0].session_id
  return data.filter((row) => row.session_id === latestSessionId).sort((a, b) => a.set_no - b.set_no)
}

export async function saveWeight(userId, checkinDate, weightLb) {
  const client = requireSupabase()
  const { data, error } = await client.from('weight_checkins').upsert({ user_id: userId, checkin_date: checkinDate, weight_lb: weightLb }, { onConflict: 'user_id,checkin_date' }).select().single()
  if (error) throw error
  return data
}

export async function getProfile(userId) {
  const client = requireSupabase()
  const { data, error } = await client.from('profiles').select('id,display_name,phone,goal,avatar_url,experience_level,available_equipment,training_days,checkin_day,units,limitations,onboarding_completed,dietary_preference,allergies,meals_per_day,notification_preferences,created_at,updated_at').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function getProgrammeIntake(userId) {
  const client = requireSupabase()
  const { data, error } = await client.from('programme_intakes').select('user_id,goal_timeframe_weeks,session_duration_min,training_location,current_training_days,daily_activity_level,sleep_quality,training_styles,exercise_preferences,exercise_avoidances,cardio_preference,cardio_experience,cardio_sessions,cooking_time,preferred_foods,updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function getNutritionPlan(userId) {
  const client = requireSupabase()
  const [targetResult, mealsResult] = await Promise.all([
    client.from('nutrition_targets').select('calories,protein_g').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('meal_plan_items').select('id,meal_type,title,description,ingredients,instructions,option_key,option_number,calories,protein_g,carbs_g,fat_g,serving_g,sort_order').eq('user_id', userId).eq('active', true).order('sort_order').order('option_number').order('created_at'),
  ])
  if (targetResult.error) throw targetResult.error
  if (mealsResult.error) throw mealsResult.error
  return { target: targetResult.data ?? null, meals: mealsResult.data ?? [] }
}

export async function saveMealPlanItem({ userId, item }) {
  const client = requireSupabase()
  const payload = { user_id: userId, meal_type: item.meal, title: item.name, description: item.detail || null, ingredients: item.ingredients || [], instructions: item.instructions || null, option_key: item.optionKey || 'primary', option_number: Number(item.optionNumber) || 1, calories: Number(item.calories) || 0, protein_g: Number(item.protein) || 0, carbs_g: Number(item.carbs) || 0, fat_g: Number(item.fat) || 0, serving_g: Number(item.servingG) || 0, sort_order: Number(item.sortOrder) || 0, active: true }
  const query = item.id ? client.from('meal_plan_items').update(payload).eq('id', item.id).eq('user_id', userId) : client.from('meal_plan_items').insert(payload)
  const { data, error } = await query.select('id,meal_type,title,description,ingredients,instructions,option_key,option_number,calories,protein_g,carbs_g,fat_g,serving_g,sort_order').single()
  if (error) throw error
  return data
}

export async function deleteMealPlanItem({ userId, id }) {
  const client = requireSupabase()
  const { error } = await client.from('meal_plan_items').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function getLatestWeeklyCheckin(userId) {
  const client = requireSupabase()
  const { data, error } = await client.from('weekly_checkins').select('id,week_start,energy,sleep,stress,soreness,weight_lb,waist_cm,chest_bust_cm,hips_cm,arm_cm,thigh_cm,workouts_completed,nutrition_days,pain_or_injury,wins,challenges,questions,submitted_at,created_at').eq('user_id', userId).order('week_start', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

export async function getWeeklyCheckinHistory(userId, limit = 12) {
  const client = requireSupabase()
  const { data, error } = await client.from('weekly_checkins').select('id,week_start,energy,sleep,stress,soreness,weight_lb,waist_cm,chest_bust_cm,hips_cm,arm_cm,thigh_cm,workouts_completed,nutrition_days,pain_or_injury,wins,challenges,questions,submitted_at,created_at').eq('user_id', userId).order('week_start', { ascending: false }).limit(limit)
  if (error) throw error
  return data ?? []
}

export async function saveWeeklyCheckin({ userId, weekStart, energy, sleep, stress, soreness, weightLb, waistCm, chestBustCm, hipsCm, armCm, thighCm, workoutsCompleted, nutritionDays, painOrInjury, wins, challenges, questions }) {
  const client = requireSupabase()
  const { data, error } = await client.from('weekly_checkins').upsert({ user_id: userId, week_start: weekStart, energy, sleep, stress, soreness, weight_lb: Number(weightLb) || null, waist_cm: Number(waistCm) || null, chest_bust_cm: Number(chestBustCm) || null, hips_cm: Number(hipsCm) || null, arm_cm: Number(armCm) || null, thigh_cm: Number(thighCm) || null, workouts_completed: workoutsCompleted, nutrition_days: nutritionDays, pain_or_injury: painOrInjury || null, wins: wins || null, challenges: challenges || null, questions: questions || null, submitted_at: new Date().toISOString() }, { onConflict: 'user_id,week_start' }).select().single()
  if (error) throw error
  return data
}

export async function getMealLogs(userId, startDate, endDate) {
  const client = requireSupabase()
  const { data, error } = await client.from('meal_logs').select('id,meal_date,meal_type,meal_plan_item_id,entry_type,recipe_name,calories,protein_g,carbs_g,fat_g,serving_g,portion_multiplier,notes,created_at').eq('user_id', userId).gte('meal_date', startDate).lte('meal_date', endDate).order('meal_date', { ascending: false }).order('created_at')
  if (error) throw error
  return data ?? []
}

export async function saveMealLog({ id, userId, mealDate, mealType, mealPlanItemId, entryType = 'planned', recipeName, calories, protein, carbs, fat, servingG, portionMultiplier = 1, notes }) {
  const client = requireSupabase()
  const payload = { user_id: userId, meal_date: mealDate, meal_type: mealType, meal_plan_item_id: mealPlanItemId || null, entry_type: entryType, recipe_name: recipeName || null, calories: Number(calories) || 0, protein_g: Number(protein) || 0, carbs_g: Number(carbs) || 0, fat_g: Number(fat) || 0, serving_g: Number(servingG) || null, portion_multiplier: Number(portionMultiplier) || 1, notes: notes || null }
  const query = id ? client.from('meal_logs').update(payload).eq('id', id).eq('user_id', userId) : client.from('meal_logs').insert(payload)
  const { data, error } = await query.select('id,meal_date,meal_type,meal_plan_item_id,entry_type,recipe_name,calories,protein_g,carbs_g,fat_g,serving_g,portion_multiplier,notes,created_at').single()
  if (error) throw error
  return data
}

export async function deleteMealLog({ userId, id, mealDate, mealType }) {
  const client = requireSupabase()
  let query = client.from('meal_logs').delete().eq('user_id', userId)
  query = id ? query.eq('id', id) : query.eq('meal_date', mealDate).eq('meal_type', mealType)
  const { error } = await query
  if (error) throw error
}

const nutritionFoodFields = 'id,user_id,source,provider_food_id,barcode,name,brand,image_url,default_serving_label,default_serving_g,calories_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g,fibre_g_per_100g,sugar_g_per_100g,salt_g_per_100g,verified_at'

function nutritionFoodFilter(value) {
  return String(value || '').replace(/[,%()]/g, ' ').trim().slice(0, 80)
}

export async function searchNutritionFoods(query) {
  const client = requireSupabase()
  const term = nutritionFoodFilter(query)
  let request = client.from('nutrition_foods').select(nutritionFoodFields).order('name').limit(24)
  if (term) request = request.or(`name.ilike.%${term}%,brand.ilike.%${term}%`)
  const { data, error } = await request
  if (error) throw error
  return data ?? []
}

export async function getNutritionFoodByBarcode(barcode) {
  const client = requireSupabase()
  const code = String(barcode || '').replace(/[^0-9]/g, '')
  if (code.length < 8) throw new Error('Enter a valid product barcode.')
  const { data, error } = await client.from('nutrition_foods').select(nutritionFoodFields).eq('barcode', code).limit(1).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('That barcode is not in Steel’s catalogue yet. Add it from the nutrition label instead.')
  return data
}

export async function getNutritionFoodServings(foodId) {
  const client = requireSupabase()
  const { data, error } = await client.from('nutrition_food_servings').select('id,label,grams,sort_order,is_default').eq('food_id', foodId).order('sort_order').order('created_at')
  if (error) throw error
  return data ?? []
}

export async function getNutritionFavouriteFoods(userId) {
  const client = requireSupabase()
  const { data: preferences, error: preferenceError } = await client.from('nutrition_food_preferences').select('food_id,last_used_at,use_count,created_at').eq('user_id', userId).eq('is_favourite', true).order('last_used_at', { ascending: false })
  if (preferenceError) throw preferenceError
  const foodIds = (preferences ?? []).map((row) => row.food_id)
  if (!foodIds.length) return []
  const { data: foods, error } = await client.from('nutrition_foods').select(nutritionFoodFields).in('id', foodIds)
  if (error) throw error
  const byId = new Map((foods ?? []).map((food) => [food.id, food]))
  return foodIds.map((id) => byId.get(id)).filter(Boolean)
}

export async function setNutritionFoodFavourite({ userId, foodId, favourite }) {
  const client = requireSupabase()
  if (!favourite) {
    const { error } = await client.from('nutrition_food_preferences').delete().eq('user_id', userId).eq('food_id', foodId)
    if (error) throw error
    return
  }
  const { error } = await client.from('nutrition_food_preferences').upsert({ user_id: userId, food_id: foodId, is_favourite: true }, { onConflict: 'user_id,food_id' })
  if (error) throw error
}

export async function saveNutritionFoodEntry({ mealDate, mealType, food, grams, servingLabel }) {
  const client = requireSupabase()
  const multiplier = Math.max(0, Number(grams) || 0) / 100
  const item = {
    foodId: food.id,
    name: food.name,
    brand: food.brand || '',
    servingLabel: servingLabel || `${grams}g`,
    grams: Number(grams) || 0,
    calories: Number(food.calories_per_100g || 0) * multiplier,
    protein: Number(food.protein_g_per_100g || 0) * multiplier,
    carbs: Number(food.carbs_g_per_100g || 0) * multiplier,
    fat: Number(food.fat_g_per_100g || 0) * multiplier,
    fibre: Number(food.fibre_g_per_100g || 0) * multiplier,
    sugar: Number(food.sugar_g_per_100g || 0) * multiplier,
    salt: Number(food.salt_g_per_100g || 0) * multiplier,
  }
  const { data, error } = await client.rpc('save_nutrition_meal_entry', { p_entry: { mealDate, mealType, entryType: 'food', recipeName: food.name, notes: food.source }, p_items: [item] })
  if (error) throw error
  return data
}

export async function getWeeklyActivitySummary(userId, weekStart, weekEnd) {
  const client = requireSupabase()
  const [sessionsResult, mealsResult] = await Promise.all([
    client.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('session_date', weekStart).lte('session_date', weekEnd),
    client.from('meal_logs').select('meal_date,meal_type').eq('user_id', userId).gte('meal_date', weekStart).lte('meal_date', weekEnd),
  ])
  if (sessionsResult.error) throw sessionsResult.error
  if (mealsResult.error) throw mealsResult.error
  return { workoutsCompleted: sessionsResult.count || 0, nutritionDays: new Set((mealsResult.data ?? []).map((row) => row.meal_date)).size }
}

export async function uploadCheckinMedia({ userId, weekStart, file, mediaType = 'other' }) {
  const client = requireSupabase()
  const validTypes = ['front', 'side', 'back', 'exercise_video', 'other']
  if (!validTypes.includes(mediaType)) throw new Error('That check-in media type is not supported.')
  if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) throw new Error('Upload an image or video file.')
  if (mediaType === 'exercise_video' && !file.type.startsWith('video/')) throw new Error('Upload a video for exercise form feedback.')
  if (mediaType !== 'exercise_video' && !file.type.startsWith('image/')) throw new Error('Upload an image for this progress photo.')
  if (file.size > 25 * 1024 * 1024) throw new Error('Each check-in upload must be under 25 MB.')
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
  if (!allowedMimeTypes.includes(file.type)) throw new Error('Use JPG, PNG, WEBP, HEIC, MP4, MOV or WEBM files.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${userId}/${weekStart}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await client.storage.from('checkin-media').upload(path, file, { contentType: file.type, cacheControl: '3600' })
  if (uploadError) throw uploadError
  const { data, error } = await client.from('weekly_checkin_media').insert({ user_id: userId, week_start: weekStart, media_type: mediaType, storage_path: path, file_name: file.name, mime_type: file.type, file_size: file.size }).select().single()
  if (error) {
    await client.storage.from('checkin-media').remove([path])
    throw error
  }
  return data
}

export async function saveProfile(userId, { displayName, phone, goal, avatarUrl, experienceLevel, availableEquipment, trainingDays, checkinDay, units, limitations, onboardingCompleted, dietaryPreference, allergies, mealsPerDay }) {
  const client = requireSupabase()
  const payload = { id: userId, display_name: displayName || null, goal: goal || 'Lose fat and gain muscle', updated_at: new Date().toISOString() }
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl || null
  if (phone !== undefined) payload.phone = phone || null
  if (experienceLevel !== undefined) payload.experience_level = experienceLevel
  if (availableEquipment !== undefined) payload.available_equipment = availableEquipment
  if (trainingDays !== undefined) payload.training_days = trainingDays
  if (checkinDay !== undefined) payload.checkin_day = checkinDay
  if (units !== undefined) payload.units = units
  if (limitations !== undefined) payload.limitations = limitations || null
  if (onboardingCompleted !== undefined) payload.onboarding_completed = onboardingCompleted
  if (dietaryPreference !== undefined) payload.dietary_preference = dietaryPreference
  if (allergies !== undefined) payload.allergies = allergies || null
  if (mealsPerDay !== undefined) payload.meals_per_day = mealsPerDay
  const { data, error } = await client.from('profiles').upsert(payload, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

export async function saveProgrammeIntake(userId, intake = {}) {
  const client = requireSupabase()
  const payload = {
    user_id: userId,
    goal_timeframe_weeks: intake.goalTimeframeWeeks || null,
    session_duration_min: Number(intake.sessionDurationMin) || 45,
    training_location: intake.trainingLocation || 'Gym',
    current_training_days: intake.currentTrainingDays === '' || intake.currentTrainingDays === undefined ? null : Number(intake.currentTrainingDays),
    daily_activity_level: intake.dailyActivityLevel || null,
    sleep_quality: intake.sleepQuality === '' || intake.sleepQuality === undefined ? null : Number(intake.sleepQuality),
    training_styles: Array.isArray(intake.trainingStyles) ? intake.trainingStyles : [],
    exercise_preferences: intake.exercisePreferences?.trim() || null,
    exercise_avoidances: intake.exerciseAvoidances?.trim() || null,
    cardio_preference: intake.cardioPreference || 'No preference',
    cardio_experience: intake.cardioExperience || 'Beginner',
    cardio_sessions: Number(intake.cardioSessions) || 0,
    cooking_time: intake.cookingTime || null,
    preferred_foods: intake.preferredFoods?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await client.from('programme_intakes').upsert(payload, { onConflict: 'user_id' }).select().single()
  if (error) throw error
  return data
}

// The UI visibility is role-backed; the profile update remains owner-scoped by RLS.
export async function resetOnboarding(userId) {
  return saveProfile(userId, { onboardingCompleted: false })
}

export async function updateAccount({ displayName, email }) {
  const client = requireSupabase()
  const changes = { data: { full_name: displayName } }
  if (email) changes.email = email
  const { data, error } = await client.auth.updateUser(changes)
  if (error) throw error
  return data.user
}

export async function changePassword({ email, currentPassword, newPassword }) {
  const client = requireSupabase()
  const { error: verifyError } = await client.auth.signInWithPassword({ email, password: currentPassword })
  if (verifyError) throw new Error('Current password is incorrect.')
  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function uploadAvatar(userId, file) {
  const client = requireSupabase()
  if (!file) throw new Error('Choose an image first.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile image must be under 5 MB.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/profile.${extension}`
  const { error } = await client.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })
  if (error) throw error
  const { data } = client.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function getTodaySteps(userId) {
  const client = requireSupabase()
  const today = localDay()
  const { data, error } = await client.from('daily_steps').select('steps,source,synced_at').eq('user_id', userId).eq('step_date', today)
  if (error) throw error
  return preferredSteps(data) ?? { steps: 0, source: null, synced_at: null }
}

export async function getStepHistory(userId, limit = 30) {
  const client = requireSupabase()
  const start = new Date()
  start.setDate(start.getDate() - (limit - 1))
  const { data, error } = await client.from('daily_steps').select('step_date,steps,source,synced_at').eq('user_id', userId).gte('step_date', localDay(start)).lte('step_date', localDay()).order('step_date', { ascending: false })
  if (error) throw error
  return dailyStepHistory(data ?? [])
}

export async function saveManualSteps(userId, value) {
  const client = requireSupabase()
  const steps = validateSteps(value)
  const now = new Date()
  const { data, error } = await client.from('daily_steps').upsert({ user_id: userId, step_date: localDay(now), steps, source: 'manual', synced_at: now.toISOString(), updated_at: now.toISOString() }, { onConflict: 'user_id,step_date,source' }).select('steps,source,synced_at').single()
  if (error) throw error
  return data
}

export async function saveNotificationPreferences(userId, preferences) {
  const { data, error } = await requireSupabase().from('profiles').update({ notification_preferences: normalizeReminders(preferences), updated_at: new Date().toISOString() }).eq('id', userId).select().single()
  if (error) throw error
  return data
}

export async function saveWorkoutSession({ userId, workout, draft, durationMin = 45, notes = '' }) {
  const client = requireSupabase()
  const isUserOwnedWorkout = !workout.source || workout.source === 'custom'
  const { data: session, error: sessionError } = await client.from('sessions').insert({ user_id: userId, workout_id: isUserOwnedWorkout ? workout.id : null, workout_name: workout.name, session_date: new Date().toISOString().slice(0, 10), duration_min: durationMin, notes }).select().single()
  if (sessionError) throw sessionError
  const setRows = workout.exercises.flatMap((exercise) => {
    if (draft.removedExercises.includes(exercise.id)) return []
    return (draft.sets[exercise.id] ?? []).filter((set) => set.complete && !set.removed).map((set) => ({ session_id: session.id, exercise_id: !isUserOwnedWorkout || exercise.source === 'catalog' ? null : exercise.id, exercise_name: exercise.name, set_no: set.setNo, reps: set.reps, weight_kg: set.weight, completed: true }))
  })
  if (setRows.length) {
    const { error } = await client.from('set_logs').insert(setRows)
    if (error) throw error
  }
  if (draft.cardio?.complete) {
    const { error } = await client.from('cardio_logs').insert({ session_id: session.id, activity: draft.cardio.activity || 'Incline treadmill walk', duration_min: draft.cardio.minutes, incline_percent: draft.cardio.incline || null, rpe: draft.cardio.rpe, intensity: 'Medium' })
    if (error) throw error
  }
  return session
}
