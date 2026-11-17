-- IngresaYa: el alumno puede eliminar su cuenta y todos sus datos desde la app.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run (después de 0001_cuentas.sql).

-- Borra al usuario de auth.users; por "on delete cascade" se borran también su perfil,
-- progreso, resultados del examen semanal y uso del tutor.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  delete from auth.users where id = me;
end $$;

revoke all on function public.delete_my_account from public, anon;
grant execute on function public.delete_my_account to authenticated;
