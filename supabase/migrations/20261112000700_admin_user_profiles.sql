-- Account artwork and concurrent-safe protection of the last staff administrator.
alter table public.profiles add column if not exists avatar_url text not null default '';

create or replace function public.protect_staff_administrator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.role = 'admin') or
     (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    perform pg_advisory_xact_lock(hashtext('staff-administrator-role'));
    if not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'Mantenha pelo menos um administrador no painel.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_staff_administrator on public.profiles;
create trigger protect_staff_administrator before update of role or delete on public.profiles
for each row execute function public.protect_staff_administrator();

-- Self-service updates expose only name/photo; editors never receive role mutation rights.
create or replace function public.update_own_staff_profile(p_name text, p_avatar_url text) returns void
language plpgsql security definer set search_path = public as $$
declare
  previous_avatar text;
  next_avatar text := coalesce(p_avatar_url, '');
begin
  if auth.uid() is null then raise exception 'Entre no painel para atualizar seu perfil.'; end if;
  select avatar_url into previous_avatar from public.profiles where id = auth.uid();
  if not found then raise exception 'Perfil não encontrado.'; end if;
  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 100 then
    raise exception 'O nome deve ter de 2 a 100 caracteres.';
  end if;
  if char_length(next_avatar) > 3600000 then raise exception 'A foto é grande demais.'; end if;
  if next_avatar <> '' and next_avatar <> previous_avatar and not exists (
    select 1 from public.media where url = next_avatar and kind = 'image' and not archived
  ) then
    raise exception 'Escolha uma foto disponível na biblioteca de mídia.';
  end if;
  update public.profiles set name = trim(p_name), avatar_url = next_avatar where id = auth.uid();
end;
$$;
revoke all on function public.update_own_staff_profile(text, text) from public, anon;
grant execute on function public.update_own_staff_profile(text, text) to authenticated;
