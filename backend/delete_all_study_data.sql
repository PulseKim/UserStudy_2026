-- DESTRUCTIVE: run only after exporting any data that must be retained.
-- Intended retention deadline: August 31, 2027.
begin;
truncate table public.trial_responses, public.study_sessions restart identity;
commit;
