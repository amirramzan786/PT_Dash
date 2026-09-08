-- These SECURITY DEFINER functions are trigger implementations only.  They
-- are invoked by Postgres and must never be reachable through the Data API.
revoke all on function public.protect_founder_entitlement() from public, anon, authenticated;
revoke all on function public.track_alpha_signup_event() from public, anon, authenticated;
