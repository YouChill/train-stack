-- Fix: rls_disabled_in_public on public.exercise_logs.
-- The application accesses Postgres directly via DATABASE_URL using a role
-- that owns the table (and therefore bypasses RLS), so enabling RLS without
-- policies will not break server-side queries. It does close the anon and
-- authenticated access exposed through Supabase's auto-generated PostgREST
-- API, which is the surface flagged as publicly accessible.
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
