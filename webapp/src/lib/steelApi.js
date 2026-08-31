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

export async function getDashboardStats(userId) {
  const client = requireSupabase()
  const [weightResult, sessionResult] = await Promise.all([
    client.from('weight_checkins').select('weight_lb,checkin_date').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(1),
    client.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  if (weightResult.error) throw weightResult.error
  if (sessionResult.error) throw sessionResult.error
  return {
    latestWeightLb: weightResult.data?.[0]?.weight_lb ?? null,
    sessionCount: sessionResult.count ?? 0,
  }
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
