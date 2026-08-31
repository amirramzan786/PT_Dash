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
  const { data: workoutRows, error: workoutError } = await client
    .from('workouts')
    .select('id,name,sort_order,active')
    .eq('user_id', userId)
    .eq('active', true)
    .order('sort_order')
  if (workoutError) throw workoutError

  if (!workoutRows?.length) return []

  const workoutIds = workoutRows.map((row) => row.id)
  const { data: links, error: linkError } = await client
    .from('workout_exercises')
    .select('id,workout_id,exercise_id,sort_order,sets,rep_target,exercises(id,name,equipment,youtube_url,active)')
    .in('workout_id', workoutIds)
    .order('sort_order')
  if (linkError) throw linkError

  return workoutRows.map((workout) => ({
    id: workout.id,
    name: workout.name,
    duration: '~45 min',
    finisher: '5–10 min incline walk',
    exercises: (links ?? [])
      .filter((link) => link.workout_id === workout.id && link.exercises?.active !== false)
      .map((link) => ({
        id: link.exercise_id,
        programmeId: link.id,
        name: link.exercises?.name ?? 'Exercise',
        equipment: link.exercises?.equipment ?? 'Gym',
        youtubeUrl: link.exercises?.youtube_url ?? null,
        sets: link.sets,
        reps: link.rep_target,
      })),
  }))
}

export async function getDashboardStats(userId) {
  const client = requireSupabase()
  const [weightResult, sessionResult, recentResult] = await Promise.all([
    client.from('weight_checkins').select('weight_lb,checkin_date').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(1),
    client.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('sessions').select('id,workout_name,session_date,duration_min').eq('user_id', userId).order('session_date', { ascending: false }).order('created_at', { ascending: false }).limit(1),
  ])
  if (weightResult.error) throw weightResult.error
  if (sessionResult.error) throw sessionResult.error
  if (recentResult.error) throw recentResult.error
  return {
    latestWeightLb: weightResult.data?.[0]?.weight_lb ?? null,
    sessionCount: sessionResult.count ?? 0,
    latestSession: recentResult.data?.[0] ?? null,
  }
}

export async function getWeightHistory(userId, limit = 30) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('weight_checkins')
    .select('id,checkin_date,weight_lb')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getRecentSessions(userId, limit = 8) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('sessions')
    .select('id,workout_name,session_date,duration_min,notes,created_at')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getPreviousExerciseSets(userId, exerciseId) {
  const client = requireSupabase()
  const { data: sessions, error: sessionError } = await client
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(12)
  if (sessionError) throw sessionError
  const ids = (sessions ?? []).map((row) => row.id)
  if (!ids.length) return []

  const { data, error } = await client
    .from('set_logs')
    .select('session_id,set_no,reps,weight_kg,created_at')
    .eq('exercise_id', exerciseId)
    .in('session_id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data?.length) return []
  const latestSessionId = data[0].session_id
  return data.filter((row) => row.session_id === latestSessionId).sort((a, b) => a.set_no - b.set_no)
}

export async function saveWeight(userId, checkinDate, weightLb) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('weight_checkins')
    .upsert({ user_id: userId, checkin_date: checkinDate, weight_lb: weightLb }, { onConflict: 'user_id,checkin_date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveWorkoutSession({ userId, workout, draft, durationMin = 45, notes = '' }) {
  const client = requireSupabase()
  const { data: session, error: sessionError } = await client
    .from('sessions')
    .insert({
      user_id: userId,
      workout_id: workout.id,
      workout_name: workout.name,
      session_date: new Date().toISOString().slice(0, 10),
      duration_min: durationMin,
      notes,
    })
    .select()
    .single()
  if (sessionError) throw sessionError

  const setRows = workout.exercises.flatMap((exercise) => {
    if (draft.removedExercises.includes(exercise.id)) return []
    return (draft.sets[exercise.id] ?? [])
      .filter((set) => set.complete && !set.removed)
      .map((set) => ({
        session_id: session.id,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        set_no: set.setNo,
        reps: set.reps,
        weight_kg: set.weight,
        completed: true,
      }))
  })

  if (setRows.length) {
    const { error } = await client.from('set_logs').insert(setRows)
    if (error) throw error
  }

  if (draft.cardio.complete) {
    const { error } = await client.from('cardio_logs').insert({
      session_id: session.id,
      activity: 'Incline treadmill walk',
      duration_min: draft.cardio.minutes,
      incline_percent: draft.cardio.incline,
      rpe: draft.cardio.rpe,
      intensity: 'Medium',
    })
    if (error) throw error
  }

  return session
}
