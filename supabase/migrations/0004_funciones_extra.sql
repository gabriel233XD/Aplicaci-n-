-- IngresaYa: logros, repaso de errores, pregunta del día, invitaciones, duelos y ranking por colegio.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run (después de 0001, 0002 y 0003).

-- ─────────────────────────────────────────────
-- Datos extra del progreso (logros, repaso de errores, pregunta del día, historial diario).
-- ─────────────────────────────────────────────
alter table public.progress
  add column extra jsonb not null default '{}'::jsonb check (pg_column_size(extra) < 200000);

-- ─────────────────────────────────────────────
-- Perfil: código de invitación, quién lo invitó, monedas por reclamar y colegio.
-- ─────────────────────────────────────────────
alter table public.profiles
  add column referral_code text unique,
  add column referred_by uuid references public.profiles (id) on delete set null,
  add column pending_coins int not null default 0 check (pending_coins >= 0),
  add column school text check (school is null or char_length(school) between 3 and 60);

create function public.new_referral_code() returns text
language plpgsql as $$
declare
  code text;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end $$;

update public.profiles set referral_code = public.new_referral_code() where referral_code is null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'alias'), ''), 'Postulante');
  candidate text := left(wanted, 20);
begin
  if char_length(candidate) < 3 then candidate := 'Postulante'; end if;
  while exists (select 1 from public.profiles where lower(alias) = lower(candidate)) loop
    candidate := left(wanted, 15) || floor(random() * 90000 + 10000)::int;
  end loop;
  insert into public.profiles (id, alias, referral_code) values (new.id, candidate, public.new_referral_code());
  return new;
end $$;

-- El alumno puede cambiar su apodo y su colegio (lo demás lo maneja el sistema).
grant update (school) on public.profiles to authenticated;

-- ─────────────────────────────────────────────
-- Invitaciones: +50 monedas para quien invita y para el invitado.
-- Se aplica una sola vez, solo a cuentas nuevas (menos de 2 días), máximo 30 invitados por alumno.
-- ─────────────────────────────────────────────
create function public.apply_referral(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_profile public.profiles;
  inviter uuid;
begin
  if me is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  select * into my_profile from public.profiles where id = me;
  if my_profile.referred_by is not null then return 'ya_aplicado'; end if;
  if my_profile.created_at < now() - interval '2 days' then return 'cuenta_antigua'; end if;
  select id into inviter from public.profiles where referral_code = upper(trim(p_code));
  if inviter is null then return 'codigo_invalido'; end if;
  if inviter = me then return 'propio'; end if;
  if (select count(*) from public.profiles where referred_by = inviter) >= 30 then return 'limite'; end if;
  update public.profiles set referred_by = inviter, pending_coins = pending_coins + 50 where id = me;
  update public.profiles set pending_coins = pending_coins + 50 where id = inviter;
  return 'ok';
end $$;

-- Entrega las monedas pendientes (por invitaciones) y las deja en cero.
create function public.claim_bonus_coins() returns int
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  amount int;
begin
  if me is null then return 0; end if;
  select pending_coins into amount from public.profiles where id = me for update;
  update public.profiles set pending_coins = 0 where id = me;
  return coalesce(amount, 0);
end $$;

-- Cuántos amigos invitó el alumno.
create function public.my_referrals() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.profiles where referred_by = auth.uid()
$$;

-- ─────────────────────────────────────────────
-- Ranking por colegio del examen semanal (promedio de puntajes de sus alumnos).
-- ─────────────────────────────────────────────
create function public.school_ranking(p_exam_id text, p_week_id date default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with per_school as (
    select upper(trim(p.school)) as school, count(*) as students, round(avg(r.score)) as avg_score,
           max(r.score) as best
    from public.weekly_results r
    join public.profiles p on p.id = r.user_id
    where r.exam_id = p_exam_id and r.week_id = coalesce(p_week_id, public.current_week_id())
      and p.school is not null
    group by upper(trim(p.school))
  ), ranked as (
    select *, rank() over (order by avg_score desc, students desc) as pos from per_school
  )
  select jsonb_build_object(
    'mine', (select upper(trim(school)) from public.profiles where id = auth.uid()),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('position', pos, 'school', school, 'students', students,
                                          'avgScore', avg_score, 'best', best) order by pos)
      from (select * from ranked order by pos limit 10) t
    ), '[]'::jsonb),
    'myPosition', (select pos from ranked where school = (select upper(trim(school)) from public.profiles where id = auth.uid()))
  )
$$;

-- ─────────────────────────────────────────────
-- Duelos 1 vs 1: quien crea juega primero y comparte el enlace; el rival juega las mismas preguntas.
-- ─────────────────────────────────────────────
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null,
  question_ids text[] not null check (cardinality(question_ids) between 3 and 10),
  creator uuid not null references auth.users (id) on delete cascade,
  creator_correct int not null,
  creator_ms int not null,
  opponent uuid references auth.users (id) on delete set null,
  opponent_correct int,
  opponent_ms int,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index duels_creator on public.duels (creator, created_at desc);
create index duels_opponent on public.duels (opponent, created_at desc);
alter table public.duels enable row level security;
revoke all on public.duels from anon, authenticated;

create function public.duel_view(d public.duels) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', d.id,
    'examId', d.exam_id,
    'questionIds', to_jsonb(d.question_ids),
    'creator', jsonb_build_object('alias', (select alias from public.profiles where id = d.creator),
                                  'correct', d.creator_correct, 'ms', d.creator_ms),
    'opponent', case when d.opponent is null then null else jsonb_build_object(
                  'alias', (select alias from public.profiles where id = d.opponent),
                  'correct', d.opponent_correct, 'ms', d.opponent_ms) end,
    'role', case when d.creator = auth.uid() then 'creator'
                 when d.opponent = auth.uid() then 'opponent'
                 when d.opponent is null then 'new' else 'viewer' end,
    'expired', d.expires_at < now(),
    'createdAt', d.created_at
  )
$$;

create function public.create_duel(p_exam_id text, p_question_ids text[], p_correct int, p_ms int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d public.duels;
begin
  if me is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  if p_correct < 0 or p_correct > cardinality(p_question_ids) or p_ms < 0 or p_ms > 3600000 then
    raise exception 'Resultado inválido' using errcode = '22023';
  end if;
  -- Máximo 20 duelos creados por día.
  if (select count(*) from public.duels where creator = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Llegaste al límite de duelos de hoy' using errcode = 'P0001';
  end if;
  insert into public.duels (exam_id, question_ids, creator, creator_correct, creator_ms)
  values (p_exam_id, p_question_ids, me, p_correct, p_ms) returning * into d;
  return public.duel_view(d);
end $$;

create function public.get_duel(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.duel_view(d) from public.duels d where d.id = p_id
$$;

create function public.submit_duel(p_id uuid, p_correct int, p_ms int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d public.duels;
begin
  if me is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  select * into d from public.duels where id = p_id for update;
  if d.id is null then raise exception 'Duelo no encontrado' using errcode = 'P0002'; end if;
  if d.creator = me then raise exception 'No puedes jugar tu propio duelo' using errcode = 'P0001'; end if;
  if d.opponent is not null then raise exception 'Este duelo ya fue jugado' using errcode = 'P0001'; end if;
  if d.expires_at < now() then raise exception 'Este duelo ya venció' using errcode = 'P0001'; end if;
  if p_correct < 0 or p_correct > cardinality(d.question_ids) or p_ms < 0 or p_ms > 3600000 then
    raise exception 'Resultado inválido' using errcode = '22023';
  end if;
  update public.duels set opponent = me, opponent_correct = p_correct, opponent_ms = p_ms
   where id = p_id returning * into d;
  return public.duel_view(d);
end $$;

create function public.my_duels() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.duel_view(d) order by d.created_at desc), '[]'::jsonb)
  from (select * from public.duels where creator = auth.uid() or opponent = auth.uid()
        order by created_at desc limit 10) d
$$;

revoke all on function public.new_referral_code, public.apply_referral, public.claim_bonus_coins, public.my_referrals,
  public.school_ranking, public.duel_view, public.create_duel, public.get_duel, public.submit_duel, public.my_duels
  from public, anon;
grant execute on function public.apply_referral, public.claim_bonus_coins, public.my_referrals,
  public.school_ranking, public.create_duel, public.get_duel, public.submit_duel, public.my_duels
  to authenticated;
