-- IngresaYa: cuentas de usuario, progreso, ranking semanal y límite del Tutor IA.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run.

-- ─────────────────────────────────────────────
-- Perfiles: un apodo público por alumno (para el ranking).
-- No se guarda el nombre real.
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  alias text not null check (char_length(alias) between 3 and 20),
  premium_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index profiles_alias_unique on public.profiles (lower(alias));

alter table public.profiles enable row level security;
create policy "Cada alumno ve su perfil" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Cada alumno edita su perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Solo el apodo se puede cambiar desde la app (premium_until lo cambia el sistema de pagos).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (alias) on public.profiles to authenticated;

-- Crea el perfil al registrarse. El apodo viene en los metadatos del registro.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'alias'), ''), 'Postulante');
  candidate text := left(wanted, 20);
begin
  if char_length(candidate) < 3 then candidate := 'Postulante'; end if;
  -- Si el apodo ya existe, se le agregan números.
  while exists (select 1 from public.profiles where lower(alias) = lower(candidate)) loop
    candidate := left(wanted, 15) || floor(random() * 90000 + 10000)::int;
  end loop;
  insert into public.profiles (id, alias) values (new.id, candidate);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- Progreso por examen (UNICA, Beca 18, ...): monedas, racha y estadísticas por tema.
-- ─────────────────────────────────────────────
create table public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id text not null check (exam_id ~ '^[a-z0-9-]{2,30}$'),
  coins int not null default 50 check (coins >= 0),
  streak int not null default 0 check (streak >= 0),
  last_practice_day date,
  answered int not null default 0 check (answered >= 0),
  topic_stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);

alter table public.progress enable row level security;
create policy "Cada alumno ve su progreso" on public.progress
  for select to authenticated using (user_id = auth.uid());
create policy "Cada alumno crea su progreso" on public.progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "Cada alumno actualiza su progreso" on public.progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.progress from anon, authenticated;
grant select, insert, update on public.progress to authenticated;

-- ─────────────────────────────────────────────
-- Resultados del Examen de Admisión semanal (uno por alumno, examen y semana).
-- Solo se guardan con submit_weekly_result().
-- ─────────────────────────────────────────────
create table public.weekly_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id text not null,
  week_id date not null,
  score int not null check (score >= 0),
  max_score int not null check (max_score > 0),
  correct int not null check (correct >= 0),
  total_questions int not null check (total_questions > 0),
  created_at timestamptz not null default now(),
  unique (user_id, exam_id, week_id),
  check (score <= max_score and correct <= total_questions)
);
create index weekly_results_rank on public.weekly_results (exam_id, week_id, score desc, created_at);

alter table public.weekly_results enable row level security;
create policy "Cada alumno ve sus resultados" on public.weekly_results
  for select to authenticated using (user_id = auth.uid());
revoke all on public.weekly_results from anon, authenticated;
grant select on public.weekly_results to authenticated;

-- La semana se identifica por la fecha de su domingo (hora de Lima).
create function public.current_week_id() returns date
language sql stable as $$
  select ((now() at time zone 'America/Lima')::date
          + ((7 - extract(dow from (now() at time zone 'America/Lima'))::int) % 7))::date
$$;

-- Guarda el resultado de esta semana (solo uno) y devuelve el ranking.
create function public.submit_weekly_result(
  p_exam_id text, p_score int, p_max_score int, p_correct int, p_total int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  week date := public.current_week_id();
begin
  if me is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  insert into public.weekly_results (user_id, exam_id, week_id, score, max_score, correct, total_questions)
  values (me, p_exam_id, week, p_score, p_max_score, p_correct, p_total);
  return public.weekly_ranking(p_exam_id, week);
exception when unique_violation then
  raise exception 'Ya diste el examen de esta semana' using errcode = '23505';
end $$;

-- Ranking de una semana: top 10 con apodos, tu puesto y el total de participantes.
create function public.weekly_ranking(p_exam_id text, p_week_id date default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with ranked as (
    select r.user_id, p.alias, r.score, r.created_at,
           rank() over (order by r.score desc) as pos
    from public.weekly_results r
    join public.profiles p on p.id = r.user_id
    where r.exam_id = p_exam_id and r.week_id = coalesce(p_week_id, public.current_week_id())
  )
  select jsonb_build_object(
    'participants', (select count(*) from ranked),
    'me', (select jsonb_build_object('position', pos, 'score', score) from ranked where user_id = auth.uid()),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('position', pos, 'alias', alias, 'score', score, 'isMe', user_id = auth.uid())
                       order by pos, created_at)
      from (select * from ranked order by pos, created_at limit 10) t
    ), '[]'::jsonb)
  )
$$;

-- ─────────────────────────────────────────────
-- Límite diario del Tutor IA (se cuenta en el servidor, hora de Lima).
-- Gratis: 3 consultas al día. Premium: 10.
-- ─────────────────────────────────────────────
create table public.tutor_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.tutor_usage enable row level security;
revoke all on public.tutor_usage from anon, authenticated;

create function public.tutor_daily_limit() returns int
language sql stable security definer set search_path = public as $$
  select case when exists (
    select 1 from public.profiles where id = auth.uid() and premium_until > now()
  ) then 10 else 3 end
$$;

create function public.tutor_quota_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'limit', public.tutor_daily_limit(),
    'used', coalesce((select count from public.tutor_usage
                      where user_id = auth.uid() and day = (now() at time zone 'America/Lima')::date), 0)
  )
$$;

-- Gasta una consulta. Devuelve cuántas quedan, o -1 si ya no quedan.
create function public.consume_tutor_quota() returns int
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  lim int := public.tutor_daily_limit();
  today date := (now() at time zone 'America/Lima')::date;
  used int;
begin
  if me is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  insert into public.tutor_usage as u (user_id, day, count) values (me, today, 1)
  on conflict (user_id, day) do update set count = u.count + 1 where u.count < lim
  returning count into used;
  if used is null then return -1; end if;
  return lim - used;
end $$;

revoke all on function public.submit_weekly_result, public.weekly_ranking, public.tutor_quota_status,
  public.consume_tutor_quota, public.tutor_daily_limit, public.current_week_id from public, anon;
grant execute on function public.submit_weekly_result, public.weekly_ranking, public.tutor_quota_status,
  public.consume_tutor_quota, public.tutor_daily_limit, public.current_week_id to authenticated;
