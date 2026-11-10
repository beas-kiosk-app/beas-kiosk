-- BEA'S KIOSK business settings
-- Run once in Supabase SQL Editor after deploying the Settings page.
create table if not exists public.business_settings (
  id integer primary key default 1 check (id = 1),
  business_name text not null default 'BEA''S KIOSK',
  contact_phone text not null default '',
  contact_email text not null default '',
  business_address text not null default '',
  store_open boolean not null default true,
  accepting_orders boolean not null default true,
  pickup_available boolean not null default true,
  delivery_available boolean not null default true,
  closed_message text not null default 'We are currently closed and will be happy to serve you when we reopen.',
  delivery_unavailable_message text not null default 'Delivery is temporarily unavailable. Pickup is available for all orders.',
  opening_hours jsonb not null default '[
    {"day":"Monday","enabled":true,"open":"08:00","close":"17:00"},
    {"day":"Tuesday","enabled":true,"open":"08:00","close":"17:00"},
    {"day":"Wednesday","enabled":true,"open":"08:00","close":"17:00"},
    {"day":"Thursday","enabled":true,"open":"08:00","close":"17:00"},
    {"day":"Friday","enabled":true,"open":"08:00","close":"17:00"},
    {"day":"Saturday","enabled":true,"open":"08:00","close":"17:00"},
    {"day":"Sunday","enabled":false,"open":"08:00","close":"17:00"}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.business_settings (id) values (1) on conflict (id) do nothing;
alter table public.business_settings enable row level security;
drop policy if exists "Owners can view business settings" on public.business_settings;
create policy "Owners can view business settings" on public.business_settings
  for select to authenticated using (public.is_kiosk_owner());
drop policy if exists "Owners can update business settings" on public.business_settings;
create policy "Owners can update business settings" on public.business_settings
  for update to authenticated using (public.is_kiosk_owner()) with check (public.is_kiosk_owner());
grant select, update on public.business_settings to authenticated;

create or replace function public.get_public_business_settings()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'business_name', business_name,
    'contact_phone', contact_phone,
    'contact_email', contact_email,
    'business_address', business_address,
    'store_open', store_open,
    'accepting_orders', accepting_orders,
    'pickup_available', pickup_available,
    'delivery_available', delivery_available,
    'closed_message', closed_message,
    'delivery_unavailable_message', delivery_unavailable_message,
    'opening_hours', opening_hours
  )
  from public.business_settings where id = 1;
$$;
revoke all on function public.get_public_business_settings() from public;
grant execute on function public.get_public_business_settings() to anon, authenticated;

create or replace function public.enforce_business_order_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare cfg public.business_settings%rowtype;
begin
  select * into cfg from public.business_settings where id = 1;
  if found and (not cfg.store_open or not cfg.accepting_orders) then
    raise exception 'STORE_NOT_ACCEPTING_ORDERS';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_business_order_settings on public.orders;
create trigger enforce_business_order_settings
before insert on public.orders
for each row execute function public.enforce_business_order_settings();
