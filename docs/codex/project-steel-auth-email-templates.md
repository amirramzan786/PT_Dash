# Project Steel Auth Email Configuration

This is the source-controlled copy for the Supabase Auth email branding used by
the private beta. The live Supabase Auth settings must match this document.

## Sender configuration

- SMTP provider: Resend
- SMTP host: `smtp.resend.com`
- SMTP port: `465` with implicit TLS
- SMTP username: `resend`
- SMTP password: a restricted Resend sending API key, entered only in the
  Supabase dashboard
- Sender name: `Project Steel`
- Sender address: `access@projectsteel.co.uk`
- Reply-to: `support@projectsteel.co.uk` once that inbox exists

The sender domain must remain verified in Resend. Never commit the API key or
paste it into source files, chat, browser URLs, or screenshots.

## Confirm signup / beta access email

Subject:

```text
Confirm your Project Steel beta access
```

HTML body:

```html
<p style="font-family:Arial,sans-serif;color:#111827;font-size:16px;line-height:1.6">
  Hi,
</p>
<p style="font-family:Arial,sans-serif;color:#111827;font-size:16px;line-height:1.6">
  You asked to join the Project Steel private beta.
</p>
<p style="font-family:Arial,sans-serif;color:#111827;font-size:16px;line-height:1.6">
  Confirm your email address to verify your beta access request. Your place is
  not counted until verification is complete.
</p>
<p style="margin:28px 0">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#d9ad55;color:#0b0d0f;padding:14px 22px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;font-weight:700">
    Confirm beta access
  </a>
</p>
<p style="font-family:Arial,sans-serif;color:#6b7280;font-size:14px;line-height:1.6">
  This link expires after 24 hours and can only be used once. If you did not
  request Project Steel access, you can ignore this email.
</p>
<p style="font-family:Arial,sans-serif;color:#6b7280;font-size:14px;line-height:1.6">
  Project Steel<br>
  Spartan mindset. Spartan strength. Every day.
</p>
```

## Required Supabase settings

In Supabase: Authentication → Email → SMTP Settings, configure the sender and
Resend SMTP values above. In Authentication → Email Templates, update the
confirmation template with the source-controlled subject and body.

The Site URL and redirect allow-list must include:

- `https://projectsteel.co.uk`
- `https://app.projectsteel.co.uk`
- `https://app.projectsteel.co.uk/?beta-verified=1`
- `https://pt-dash.pages.dev`

Do not disable email confirmation. Do not add tracking pixels or rewrite the
confirmation link through a marketing tracker; one-time auth links must remain
intact.

## Verification handoff

The intended user journey is:

1. Request beta access on the marketing site.
2. Receive the branded Project Steel confirmation email.
3. Confirm the email and land in the Project Steel app with the verified session.
4. Steel completes the Founder/waitlist check, then asks the user to set an account password using the same email.
5. Enter the onboarding flow.

The account handoff must not create a second identity for an email that was
already created by the beta verification flow.
