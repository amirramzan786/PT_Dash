import type { SupabaseClient } from '@supabase/supabase-js'

type FounderOutcome = {
  signupId: string
  email: string
  foundingNumber: number | null
}

function configuredEmail() {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim() || ''
  const from = Deno.env.get('TRANSACTIONAL_EMAIL_FROM')?.trim() || ''
  const replyTo = Deno.env.get('TRANSACTIONAL_EMAIL_REPLY_TO')?.trim() || ''
  const appUrl = Deno.env.get('STEEL_APP_URL')?.trim() || ''
  return { apiKey, from, replyTo, appUrl }
}

function copyFor(outcome: FounderOutcome, appUrl: string) {
  if (outcome.foundingNumber !== null) {
    const number = String(outcome.foundingNumber).padStart(2, '0')
    return {
      kind: 'founder_confirmed',
      subject: `You’re Founder #${number} of 20`,
      html: `<p><strong>You’re in. Founder #${number} of 20.</strong></p><p>Your Project Steel beta signup is verified and your Founding place is secured.</p><p>As one of the first 20 verified beta members, <strong>core Steel Premium is locked at £0 for the lifetime of your account.</strong></p><p>This applies to the core Premium feature set available at public launch. Separate future products, coaching, marketplace services or major add-ons may be excluded.</p><p><a href="${appUrl}">Create / finish your Steel account</a></p><p>Use this verified email address when creating or signing into Steel so your Founding entitlement remains linked to your account.</p><p>— Project Steel<br>FORGE THE HABIT. BUILD THE BODY. BECOME HARDER TO BREAK.</p>`,
    }
  }
  return {
    kind: 'waitlist_confirmed',
    subject: 'You’re verified for the Project Steel beta',
    html: `<p><strong>You’re verified and on the Steel beta waitlist.</strong></p><p>The 20 Founding lifetime Premium places have now been claimed.</p><p>Your beta signup is still confirmed and we’ll contact you when additional beta access becomes available.</p><p><a href="${appUrl}">View Project Steel</a></p><p>Thanks for getting in early.</p><p>— Project Steel<br>Spartan mindset. Spartan strength. Every day.</p>`,
  }
}

// Sends only after the allocation transaction has completed. Resend's
// idempotency key makes retrying this request safe for 24 hours; the private
// delivery row preserves an audit trail and prevents normal repeat callbacks.
export async function sendBetaOutcomeEmail(admin: SupabaseClient, outcome: FounderOutcome) {
  const config = configuredEmail()
  if (!config.apiKey || !config.from || !config.appUrl) {
    console.warn('beta outcome email is not configured')
    return { delivered: false, configured: false }
  }

  const message = copyFor(outcome, config.appUrl)
  const { data: delivery, error: reservationError } = await admin
    .from('beta_outcome_email_deliveries')
    .upsert({ signup_id: outcome.signupId, kind: message.kind }, { onConflict: 'signup_id,kind', ignoreDuplicates: true })
    .select('id,sent_at')
    .maybeSingle()

  if (reservationError) throw reservationError
  if (!delivery) {
    const { data: existing, error: existingError } = await admin
      .from('beta_outcome_email_deliveries')
      .select('id,sent_at')
      .eq('signup_id', outcome.signupId)
      .eq('kind', message.kind)
      .single()
    if (existingError) throw existingError
    if (existing.sent_at) return { delivered: true, configured: true }
    return { delivered: false, configured: true }
  }
  if (delivery.sent_at) return { delivered: true, configured: true }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `steel-${message.kind}-${outcome.signupId}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [outcome.email],
      reply_to: config.replyTo || undefined,
      subject: message.subject,
      html: message.html,
    }),
  })

  if (!response.ok) {
    await admin.from('beta_outcome_email_deliveries').update({
      attempt_count: 1,
      last_attempt_at: new Date().toISOString(),
      last_error_code: `provider_${response.status}`,
      updated_at: new Date().toISOString(),
    }).eq('id', delivery.id)
    console.warn('beta outcome email provider rejected delivery', response.status)
    return { delivered: false, configured: true }
  }

  const payload = await response.json() as { id?: string }
  await admin.from('beta_outcome_email_deliveries').update({
    provider_message_id: payload.id || null,
    sent_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
    attempt_count: 1,
    last_error_code: null,
    updated_at: new Date().toISOString(),
  }).eq('id', delivery.id)
  return { delivered: true, configured: true }
}
