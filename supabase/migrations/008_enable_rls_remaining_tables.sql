-- Fix: rls_disabled_in_public on public.users, public.disciplines,
-- public.workouts and public.password_resets.
-- The application accesses Postgres directly via DATABASE_URL using a role
-- that owns the tables (and therefore bypasses RLS), so enabling RLS without
-- policies will not break server-side queries. It does close the anon and
-- authenticated access exposed through Supabase's auto-generated PostgREST
-- API, which is the surface flagged as publicly accessible.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
