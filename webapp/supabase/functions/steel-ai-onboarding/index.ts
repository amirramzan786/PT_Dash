import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const MODEL = 'gemini-3.6-flash'
const DAILY_MESSAGE_LIMIT = 30
const allowedGoals = ['Lose fat and gain muscle', 'Build muscle', 'Get stronger', 'Improve fitness', 'Train consistently']
const allowedExperience = ['Beginner', 'Intermediate', 'Advanced']
const allowedEquipment = ['Machines', 'Dumbbells', 'Barbell', 'Cables', 'Bodyweight', 'Cardio']
const allowedDiets = ['No preference', 'High protein', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal']

function envValue(jsonName: string, legacyName: string) {
  const raw = Deno.env.get(jsonName)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      return parsed.default || Object.values(parsed)[0] || ''
    } catch {
      return raw
    }
  }
  return Deno.env.get(legacyName) || ''
}

function isAllowedOrigin(origin: string) {
  if (!origin) return true
  try {
    const url = new URL(origin)
    return url.origin === 'https://pt-dash.pages.dev'
      || (url.protocol === 'https:' && url.hostname.endsWith('.pt-dash.pages.dev'))
      || ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && ['http:', 'https:'].includes(url.protocol))
  } catch {
    return false
  }
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin || 'https://pt-dash.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function jsonResponse(origin: string, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function cleanText(value: unknown, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanProfile(value: unknown) {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const trainingDays = Number(raw.trainingDays)
  const checkinDay = Number(raw.checkinDay)
  const mealsPerDay = Number(raw.mealsPerDay)
  return {
    goal: allowedGoals.includes(String(raw.goal)) ? String(raw.goal) : '',
    experienceLevel: allowedExperience.includes(String(raw.experienceLevel)) ? String(raw.experienceLevel) : '',
    availableEquipment: Array.isArray(raw.availableEquipment)
      ? [...new Set(raw.availableEquipment.map(String).filter((item) => allowedEquipment.includes(item)))].slice(0, allowedEquipment.length)
      : [],
    trainingDays: Number.isInteger(trainingDays) && trainingDays >= 1 && trainingDays <= 7 ? trainingDays : 0,
    checkinDay: Number.isInteger(checkinDay) && checkinDay >= 0 && checkinDay <= 6 ? checkinDay : -1,
    units: ['lb', 'kg'].includes(String(raw.units)) ? String(raw.units) : '',
    limitations: cleanText(raw.limitations, 500),
    dietaryPreference: allowedDiets.includes(String(raw.dietaryPreference)) ? String(raw.dietaryPreference) : '',
    allergies: cleanText(raw.allergies, 500),
    mealsPerDay: Number.isInteger(mealsPerDay) && mealsPerDay >= 2 && mealsPerDay <= 6 ? mealsPerDay : 0,
  }
}

function mergeProfile(current: Record<string, unknown>, extracted: ReturnType<typeof cleanProfile>) {
  const next = { ...current }
  for (const [key, value] of Object.entries(extracted)) {
    const usable = Array.isArray(value) ? value.length > 0 : key === 'checkinDay' ? Number(value) >= 0 : value !== '' && value !== 0
    if (usable) next[key] = value
  }
  return cleanProfile(next)
}

function hasRequiredProfile(profile: ReturnType<typeof cleanProfile>) {
  return Boolean(profile.goal && profile.experienceLevel && profile.availableEquipment.length && profile.trainingDays > 0 && profile.checkinDay >= 0 && profile.units && profile.dietaryPreference && profile.mealsPerDay > 0)
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    message: { type: 'STRING' },
    profile: {
      type: 'OBJECT',
      properties: {
        goal: { type: 'STRING', enum: [...allowedGoals, ''] },
        experienceLevel: { type: 'STRING', enum: [...allowedExperience, ''] },
        availableEquipment: { type: 'ARRAY', items: { type: 'STRING', enum: allowedEquipment } },
        trainingDays: { type: 'INTEGER', minimum: 0, maximum: 7 },
        checkinDay: { type: 'INTEGER', minimum: -1, maximum: 6 },
        units: { type: 'STRING', enum: ['lb', 'kg', ''] },
        limitations: { type: 'STRING' },
        dietaryPreference: { type: 'STRING', enum: [...allowedDiets, ''] },
        allergies: { type: 'STRING' },
        mealsPerDay: { type: 'INTEGER', minimum: 0, maximum: 6 },
      },
      required: ['goal', 'experienceLevel', 'availableEquipment', 'trainingDays', 'checkinDay', 'units', 'limitations', 'dietaryPreference', 'allergies', 'mealsPerDay'],
    },
    readyToConfirm: { type: 'BOOLEAN' },
    safetyFlag: { type: 'BOOLEAN' },
  },
  required: ['message', 'profile', 'readyToConfirm', 'safetyFlag'],
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') || ''
  if (!isAllowedOrigin(origin)) return jsonResponse(origin, { error: 'Origin not allowed.' }, 403)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (request.method !== 'POST') return jsonResponse(origin, { error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const publishableKey = envValue('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const secretKey = envValue('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  const accessToken = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!supabaseUrl || !publishableKey || !secretKey || !accessToken) return jsonResponse(origin, { error: 'Authentication is unavailable.' }, 401)

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
  if (userError || !userData.user) return jsonResponse(origin, { error: 'Please sign in again to use Atlas.', code: 'UNAUTHENTICATED' }, 401)

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return jsonResponse(origin, { error: 'Invalid request.' }, 400)
  }
  if (payload.aiDataConsent !== true) {
    return jsonResponse(origin, { error: 'Confirm the Gemini data notice before starting AI chat.', code: 'CONSENT_REQUIRED' }, 400)
  }

  const rawMessages = Array.isArray(payload.messages) ? payload.messages : []
  const messages = rawMessages.slice(-12).map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    return { role: row.role === 'assistant' ? 'assistant' : 'user', content: cleanText(row.content) }
  }).filter((item) => item.content)
  if (!messages.length || messages.at(-1)?.role !== 'user') return jsonResponse(origin, { error: 'Write a message for Atlas first.' }, 400)
  if (messages.reduce((total, item) => total + item.content.length, 0) > 12000) return jsonResponse(origin, { error: 'This conversation is too long. Start a fresh chat and continue.' }, 413)

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const { count } = await admin.from('ai_messages').select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id).eq('role', 'user').gte('created_at', startOfDay.toISOString())
  if ((count || 0) >= DAILY_MESSAGE_LIMIT) return jsonResponse(origin, { error: 'You have reached today’s AI onboarding limit. Your guided setup is still available.', code: 'RATE_LIMITED' }, 429)

  const geminiKey = Deno.env.get('GEMINI_API_KEY') || ''
  if (!geminiKey) return jsonResponse(origin, { error: 'Atlas is nearly ready. Continue with the guided questions for now.', code: 'AI_NOT_CONFIGURED' }, 503)

  let conversationId = cleanText(payload.conversationId, 80)
  let conversation: Record<string, unknown> | null = null
  if (conversationId) {
    const { data } = await admin.from('ai_conversations').select('id,user_id,context,profile_snapshot').eq('id', conversationId).eq('user_id', userData.user.id).eq('context', 'onboarding').maybeSingle()
    conversation = data
    if (!conversation) return jsonResponse(origin, { error: 'This onboarding conversation is no longer available.' }, 404)
  } else {
    const { data, error } = await admin.from('ai_conversations').insert({ user_id: userData.user.id, context: 'onboarding', provider: 'gemini', model: MODEL }).select('id,user_id,context,profile_snapshot').single()
    if (error || !data) return jsonResponse(origin, { error: 'Atlas could not start a private conversation.' }, 500)
    conversation = data
    conversationId = String(data.id)
  }

  const latestUserMessage = messages.at(-1)?.content || ''
  const { error: userMessageError } = await admin.from('ai_messages').insert({ conversation_id: conversationId, user_id: userData.user.id, role: 'user', content: latestUserMessage })
  if (userMessageError) return jsonResponse(origin, { error: 'Your message could not be saved securely.' }, 500)

  const [{ data: exerciseRows }, { data: workoutRows }] = await Promise.all([
    admin.from('exercise_catalog').select('name,primary_muscle_group,equipment,difficulty,safety_notes').eq('active', true).eq('is_free', true).limit(35),
    admin.from('workout_catalog').select('name,focus,goal_tags,equipment,difficulty,duration_min').eq('active', true).eq('is_free', true).limit(12),
  ])
  const catalogue = JSON.stringify({ exercises: exerciseRows || [], workouts: workoutRows || [] }).slice(0, 12000)
  const systemPrompt = `You are Atlas, Project Steel's concise AI training and nutrition coach. Gather training and meal-plan preferences and explain choices. Ask one focused question at a time. Do not create the final programme or calculate calories or macros; Project Steel code does that after confirmation.

Only extract details the user clearly states. Allowed goals: ${JSON.stringify(allowedGoals)}. Experience: ${JSON.stringify(allowedExperience)}. Equipment: ${JSON.stringify(allowedEquipment)}. Dietary preferences: ${JSON.stringify(allowedDiets)}. checkinDay uses Monday=0 through Sunday=6. Unknown values must be empty strings, empty arrays, 0, or -1. limitations and allergies may be empty only when the user explicitly says none.

Be supportive and never shaming. Do not diagnose, treat, prescribe medication, support eating-disorder behaviour, recommend crash diets, dangerous restriction, or unsafe exercise. For urgent warning signs, tell the user to stop and seek appropriate medical or emergency help and set safetyFlag true. Never guarantee outcomes. Keep every response under 90 words.

Set readyToConfirm only when goal, experience, equipment, training days, weekly check-in day, units, dietary preference, meals per day, limitations and allergies have all been addressed. Approved Steel catalogue context: ${catalogue}`

  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] })),
      generationConfig: { temperature: 0.25, responseMimeType: 'application/json', responseSchema },
    }),
  })
  if (!geminiResponse.ok) {
    console.error('Gemini request failed', geminiResponse.status, cleanText(await geminiResponse.text(), 500))
    return jsonResponse(origin, { error: 'Atlas is taking a breather. Continue with the guided questions or try again shortly.', code: 'AI_UNAVAILABLE', conversationId }, 502)
  }

  const geminiData = await geminiResponse.json()
  const outputText = geminiData?.candidates?.[0]?.content?.parts?.map((part: Record<string, unknown>) => part.text || '').join('') || ''
  let output: Record<string, unknown>
  try {
    output = JSON.parse(outputText)
  } catch {
    return jsonResponse(origin, { error: 'Atlas could not interpret that safely. Please rephrase your answer.', code: 'INVALID_AI_RESPONSE', conversationId }, 502)
  }
  const assistantMessage = cleanText(output.message, 4000)
  if (!assistantMessage) return jsonResponse(origin, { error: 'Atlas did not return a usable answer. Please try again.', code: 'INVALID_AI_RESPONSE', conversationId }, 502)
  const extracted = cleanProfile(output.profile)
  const mergedProfile = mergeProfile((conversation?.profile_snapshot as Record<string, unknown>) || {}, extracted)
  const readyToConfirm = Boolean(output.readyToConfirm) && hasRequiredProfile(mergedProfile)
  const safetyFlag = Boolean(output.safetyFlag)

  const { error: assistantMessageError } = await admin.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id: userData.user.id,
    role: 'assistant',
    content: assistantMessage,
    extracted_profile: mergedProfile,
    safety_flag: safetyFlag,
  })
  if (assistantMessageError) return jsonResponse(origin, { error: 'Atlas could not save its response securely.' }, 500)
  await admin.from('ai_conversations').update({ profile_snapshot: mergedProfile, status: readyToConfirm ? 'completed' : 'active', updated_at: new Date().toISOString() }).eq('id', conversationId).eq('user_id', userData.user.id)

  return jsonResponse(origin, { conversationId, message: assistantMessage, profile: mergedProfile, readyToConfirm, safetyFlag, model: MODEL })
})
