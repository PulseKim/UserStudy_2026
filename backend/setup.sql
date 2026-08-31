create table if not exists public.study_sessions (
  participant_id uuid primary key, start_time timestamptz not null, end_time timestamptz not null,
  total_duration_ms bigint not null check (total_duration_ms >= 0), number_of_trials integer not null check (number_of_trials >= 0),
  number_of_attention_checks integer not null check (number_of_attention_checks >= 0),
  number_of_attention_checks_correct integer not null check (number_of_attention_checks_correct >= 0),
  passed_attention_check boolean not null, completion_status text not null check (completion_status in ('complete','incomplete')),
  created_at timestamptz not null default now()
);
create table if not exists public.trial_responses (
  id bigint generated always as identity primary key, participant_id uuid not null references public.study_sessions(participant_id),
  trial_id text not null, trial_order integer not null check (trial_order > 0),
  trial_type text not null check (trial_type in ('sequence','kinematic','attention')),
  prompt text not null,
  left_method text not null, right_method text not null, response_position text not null check (response_position in ('left','right','none')),
  preferred_method text not null, response_time_ms bigint not null check (response_time_ms >= 0), is_attention_check boolean not null,
  attention_check_correct boolean, "timestamp" timestamptz not null, created_at timestamptz not null default now(), unique(participant_id, trial_order)
);
alter table public.trial_responses add column if not exists prompt text;
alter table public.trial_responses drop constraint if exists trial_responses_trial_type_check;
alter table public.trial_responses add constraint trial_responses_trial_type_check
  check (trial_type in ('sequence','kinematic','attention'));
create index if not exists trial_responses_trial_id_idx on public.trial_responses(trial_id);
alter table public.study_sessions enable row level security;
alter table public.trial_responses enable row level security;
revoke all on public.study_sessions, public.trial_responses from anon, authenticated;
revoke all on sequence public.trial_responses_id_seq from anon, authenticated;

-- One idempotent, atomic insert endpoint; anonymous clients receive no table access.
create or replace function public.submit_study(payload jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb := payload->'session'; r jsonb;
begin
  if jsonb_typeof(payload->'responses') <> 'array' or s->>'participant_id' is null
     or jsonb_array_length(payload->'responses') <> (s->>'number_of_trials')::int
     or jsonb_array_length(payload->'responses') > 500 then raise exception 'Invalid study payload'; end if;
  insert into study_sessions(participant_id,start_time,end_time,total_duration_ms,number_of_trials,number_of_attention_checks,
    number_of_attention_checks_correct,passed_attention_check,completion_status,created_at)
    values ((s->>'participant_id')::uuid,(s->>'start_time')::timestamptz,(s->>'end_time')::timestamptz,
    (s->>'total_duration_ms')::bigint,(s->>'number_of_trials')::int,(s->>'number_of_attention_checks')::int,
    (s->>'number_of_attention_checks_correct')::int,(s->>'passed_attention_check')::boolean,s->>'completion_status',now())
    on conflict(participant_id) do nothing;
  for r in select value from jsonb_array_elements(payload->'responses') loop
    if r->>'participant_id' <> s->>'participant_id' then raise exception 'Participant mismatch'; end if;
    insert into trial_responses(participant_id,trial_id,trial_order,trial_type,prompt,left_method,right_method,response_position,
      preferred_method,response_time_ms,is_attention_check,attention_check_correct,"timestamp") values
      ((r->>'participant_id')::uuid,r->>'trial_id',(r->>'trial_order')::int,r->>'trial_type',r->>'prompt',
       r->>'left_method',r->>'right_method',r->>'response_position',r->>'preferred_method',(r->>'response_time_ms')::bigint,
       (r->>'is_attention_check')::boolean,(r->>'attention_check_correct')::boolean,(r->>'timestamp')::timestamptz)
      on conflict(participant_id,trial_order) do nothing;
  end loop;
end $$;
revoke all on function public.submit_study(jsonb) from public;
grant execute on function public.submit_study(jsonb) to anon;
