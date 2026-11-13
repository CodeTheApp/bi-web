-- CRM contact address is separate from customers.email and Supabase Auth.
alter table public.customers add column if not exists contact_email text not null default '';

create or replace function public.update_customer_contact(p_customer uuid, p_name text, p_phone text, p_contact_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result public.customers;
begin
  if not public.is_staff() then raise exception 'Só a equipe pode editar contatos de clientes.'; end if;
  if p_name is null or length(trim(p_name)) not between 2 and 120 then raise exception 'Informe um nome válido.'; end if;
  if p_phone is null or length(trim(p_phone)) > 20
    or p_phone !~ '^[+0-9().[:space:]-]*$'
    or (trim(p_phone) <> '' and length(regexp_replace(p_phone, '[^0-9]', '', 'g')) not between 10 and 15) then
    raise exception 'Informe um telefone com DDD, ou deixe vazio.';
  end if;
  if p_contact_email is null or length(trim(p_contact_email)) > 254
    or (trim(p_contact_email) <> '' and trim(p_contact_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Confira o e-mail de contato.';
  end if;
  update public.customers set name = trim(p_name), phone = trim(p_phone), contact_email = lower(trim(p_contact_email))
    where id = p_customer returning * into result;
  if not found then raise exception 'Cliente não encontrado.'; end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.update_customer_contact(uuid,text,text,text) from public;
grant execute on function public.update_customer_contact(uuid,text,text,text) to authenticated;
