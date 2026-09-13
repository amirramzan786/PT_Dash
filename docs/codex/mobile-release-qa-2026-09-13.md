# Authenticated mobile release QA — 13 September 2026

## Environment

- Deployed application: `https://app.projectsteel.co.uk/#Home`
- Signed-in Founder account
- Responsive mobile layout at an effective 200% browser zoom, then restored to
  normal zoom after the check

## Passed

- Home loaded without an error state and showed the daily summary, workout,
  streak, steps, weight, quick actions, next session, 30-day movement history
  and programme list.
- The mobile navigation showed Home, Train, Fuel, Progress and More.
- More opened and exposed Workouts, Exercise library, Weekly check-in, Weight
  and Settings.
- Settings opened from More and returned to Home correctly.
- The membership panel showed Founder #01, Premium free for life, £0 lifetime,
  no payment method and no renewal charge.
- Health integrations correctly stated that no provider is connected and used
  planned/under-consideration labels instead of claiming live sync.
- Reminder controls and the browser-notification entry point were visible;
  no reminder preference was changed during QA.

## Result

Authenticated mobile Home and Settings QA passes. This does not include the
separate mobile signup, diary, barcode-camera or account-setup flows.
