-- IngresaYa: dar Premium a un alumno usando su correo.
-- Ejecutar una vez en Supabase: SQL Editor → pegar → Run.
-- Uso (solo desde el SQL Editor de Supabase):
--   select dar_premium('alumno@gmail.com', 30);   -- 30 días de Premium
-- Si el alumno ya tenía Premium vigente, los días se suman a los que le quedaban.

create function public.dar_premium(correo text, dias int default 30) returns text
language plpgsql security definer set search_path = public as $$
declare
  usuario uuid;
  hasta timestamptz;
begin
  select id into usuario from auth.users where lower(email) = lower(trim(correo));
  if usuario is null then
    return 'No existe ninguna cuenta con el correo ' || lower(trim(correo));
  end if;
  update public.profiles
     set premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => dias)
   where id = usuario
  returning premium_until into hasta;
  return 'Premium activado para ' || lower(trim(correo)) || ' hasta el ' || to_char(hasta at time zone 'America/Lima', 'DD/MM/YYYY');
end $$;

-- Nadie puede usarla desde la app: solo el dueño, desde el SQL Editor.
revoke all on function public.dar_premium from public, anon, authenticated;

-- Ver quiénes tienen Premium:
--   select u.email, p.alias, p.premium_until from profiles p join auth.users u on u.id = p.id
--   where p.premium_until > now() order by p.premium_until;
