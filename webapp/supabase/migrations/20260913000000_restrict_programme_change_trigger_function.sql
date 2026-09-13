-- Trigger functions are internal implementation details. PostgreSQL grants
-- EXECUTE to PUBLIC by default, so explicitly remove Data API access.
revoke all on function public.enforce_programme_change_window() from public, anon, authenticated;
