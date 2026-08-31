import { supabase, supabaseConfigured } from './supabase'

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

export async function signOut() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export function onAuthChange(callback) {
  const client = requireSupabase()
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null))
  return () => data.subscription.unsubscribe()
}

export async function loadWorkouts(userId) {
  const client = requireSupabase()
  const { data: workoutRows, error: workoutError } = await client.from('workouts').select('id,name,sort_order,active').eq('user_id', userId).eq('active', true).order('sort_order')
  if (workoutError) throw workoutError
  if (!workoutRows?.length) return loadWorkoutCatalog(client)
  const workoutIds = workoutRows.map((row) => row.id)
  const { data: links, error: linkError } = await client.from('workout_exercises').select('id,workout_id,exercise_id,sort_order,sets,rep_target,start_weight_kg,exercises(id,name,equipment,youtube_url,active)').in('workout_id', workoutIds).order('sort_order')
  if (linkError) throw linkError
  const { data: catalogueRows } = await client.from('exercise_catalog').select('name,primary_muscle_group,secondary_muscle_groups,movement_pattern,difficulty,instructions,video_url,thumbnail_url,active').eq('active', true).eq('is_free', true)
  const catalogueByName = new Map((catalogueRows ?? []).map((row) => [row.name.trim().toLowerCase(), row]))
  return workoutRows.map((workout) => ({
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
      youtubeUrl: link.exercises?.youtube_url ?? catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.video_url ?? null,
      thumbnailUrl: catalogueByName.get((link.exercises?.name ?? '').trim().toLowerCase())?.thumbnail_url ?? null,
      sets: link.sets,
      reps: link.rep_target,
      startWeightKg: link.start_weight_kg ?? 0,
    })),
  }))
}

async function loadWorkoutCatalog(client) {
  const { data: workoutRows, error: workoutError } = await client.from('workout_catalog').select('id,slug,name,description,focus,difficulty,duration_min,is_free,active').eq('active', true).eq('is_free', true).order('name')
  if (workoutError) throw workoutError
  if (!workoutRows?.length) return []
  const workoutIds = workoutRows.map((row) => row.id)
  const { data: links, error: linkError } = await client.from('workout_catalog_exercises').select('id,workout_id,exercise_id,sort_order,sets,rep_target,rest_seconds,exercise_catalog(id,slug,name,primary_muscle_group,secondary_muscle_groups,equipment,movement_pattern,difficulty,instructions,video_url,thumbnail_url,active)').in('workout_id', workoutIds).order('sort_order')
  if (linkError) throw linkError
  return workoutRows.map((workout) => ({
    id: workout.id,
    source: 'catalog',
    name: workout.name,
    focus: workout.focus,
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
  let query = client.from('exercise_catalog').select('id,slug,name,primary_muscle_group,secondary_muscle_groups,equipment,movement_pattern,difficulty,instructions,video_url,thumbnail_url,is_free,active').eq('active', true).eq('is_free', true).order('name').limit(limit)
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
  const { data, error } = await client.from('profiles').select('id,display_name,goal,avatar_url,experience_level,available_equipment,training_days,units,limitations,onboarding_completed,dietary_preference,allergies,meals_per_day,created_at,updated_at').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function getNutritionPlan(userId) {
  const client = requireSupabase()
  const [targetResult, mealsResult] = await Promise.all([
    client.from('nutrition_targets').select('calories,protein_g').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('meal_plan_items').select('id,meal_type,title,description,calories,protein_g,carbs_g,fat_g,serving_g,sort_order').eq('user_id', userId).eq('active', true).order('sort_order').order('created_at'),
  ])
  if (targetResult.error) throw targetResult.error
  if (mealsResult.error) throw mealsResult.error
  return { target: targetResult.data ?? null, meals: mealsResult.data ?? [] }
}

export async function saveMealPlanItem({ userId, item }) {
  const client = requireSupabase()
  const payload = { user_id: userId, meal_type: item.meal, title: item.name, description: item.detail || null, calories: Number(item.calories) || 0, protein_g: Number(item.protein) || 0, carbs_g: Number(item.carbs) || 0, fat_g: Number(item.fat) || 0, serving_g: Number(item.servingG) || 0, sort_order: Number(item.sortOrder) || 0, active: true }
  const query = item.id ? client.from('meal_plan_items').update(payload).eq('id', item.id).eq('user_id', userId) : client.from('meal_plan_items').insert(payload)
  const { data, error } = await query.select('id,meal_type,title,description,calories,protein_g,carbs_g,fat_g,serving_g,sort_order').single()
  if (error) throw error
  return data
}

export async function deleteMealPlanItem({ userId, id }) {
  const client = requireSupabase()
  const { error } = await client.from('meal_plan_items').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function saveProfile(userId, { displayName, goal, avatarUrl, experienceLevel, availableEquipment, trainingDays, units, limitations, onboardingCompleted, dietaryPreference, allergies, mealsPerDay }) {
  const client = requireSupabase()
  const payload = { id: userId, display_name: displayName || null, goal: goal || 'Lose fat and gain muscle', updated_at: new Date().toISOString() }
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl || null
  if (experienceLevel !== undefined) payload.experience_level = experienceLevel
  if (availableEquipment !== undefined) payload.available_equipment = availableEquipment
  if (trainingDays !== undefined) payload.training_days = trainingDays
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
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await client.from('daily_steps').select('steps,source,synced_at').eq('user_id', userId).eq('step_date', today).order('synced_at', { ascending: false }).limit(1)
  if (error) throw error
  return data?.[0] ?? { steps: 0, source: null, synced_at: null }
}

export async function getStepHistory(userId, limit = 31) {
  const client = requireSupabase()
  const { data, error } = await client.from('daily_steps').select('step_date,steps').eq('user_id', userId).order('step_date', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []).reverse()
}

export async function saveWorkoutSession({ userId, workout, draft, durationMin = 45, notes = '' }) {
  const client = requireSupabase()
  const isCatalogWorkout = workout.source === 'catalog'
  const { data: session, error: sessionError } = await client.from('sessions').insert({ user_id: userId, workout_id: isCatalogWorkout ? null : workout.id, workout_name: workout.name, session_date: new Date().toISOString().slice(0, 10), duration_min: durationMin, notes }).select().single()
  if (sessionError) throw sessionError
  const setRows = workout.exercises.flatMap((exercise) => {
    if (draft.removedExercises.includes(exercise.id)) return []
    return (draft.sets[exercise.id] ?? []).filter((set) => set.complete && !set.removed).map((set) => ({ session_id: session.id, exercise_id: isCatalogWorkout || exercise.source === 'catalog' ? null : exercise.id, exercise_name: exercise.name, set_no: set.setNo, reps: set.reps, weight_kg: set.weight, completed: true }))
  })
  if (setRows.length) {
    const { error } = await client.from('set_logs').insert(setRows)
    if (error) throw error
  }
  if (draft.cardio.complete) {
    const { error } = await client.from('cardio_logs').insert({ session_id: session.id, activity: 'Incline treadmill walk', duration_min: draft.cardio.minutes, incline_percent: draft.cardio.incline, rpe: draft.cardio.rpe, intensity: 'Medium' })
    if (error) throw error
  }
  return session
}
