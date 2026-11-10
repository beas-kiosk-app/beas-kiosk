-- BEA'S KIOSK staff accounts and role permissions
-- Run once in Supabase SQL Editor after this file is committed.
-- Roles: order_staff, menu_staff, manager. Owner access remains controlled by is_kiosk_owner().

create table if not exists public.kiosk_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('order_staff', 'menu_staff', 'manager')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists kiosk_staff_email_lower_uidx
  on public.kiosk_staff (lower(email));

alter table public.kiosk_staff enable row level security;

drop policy if exists "Owners manage kiosk staff" on public.kiosk_staff;
create policy "Owners manage kiosk staff"
on public.kiosk_staff
for all to authenticated
using (public.is_kiosk_owner())
with check (public.is_kiosk_owner());

drop policy if exists "Staff can view own active profile" on public.kiosk_staff;
create policy "Staff can view own active profile"
on public.kiosk_staff
for select to authenticated
using (user_id = auth.uid() and is_active = true);

grant select, insert, update, delete on public.kiosk_staff to authenticated;

-- Security-definer role check avoids RLS recursion when policies inspect kiosk_staff.
create or replace function public.has_kiosk_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.kiosk_staff s
    where s.user_id = auth.uid()
      and s.is_active = true
      and s.role = any(required_roles)
  );
$$;

revoke all on function public.has_kiosk_role(text[]) from public;
grant execute on function public.has_kiosk_role(text[]) to authenticated;

-- Orders: order staff and managers can read orders for fulfilment/reporting.
-- Staff status changes will be routed through a restricted RPC in the next step;
-- do not grant staff direct UPDATE access to the orders table.
drop policy if exists "Staff can view orders" on public.orders;
create policy "Staff can view orders"
on public.orders
for select to authenticated
using (public.has_kiosk_role(array['order_staff', 'manager']));

-- Menu staff and managers can manage products. Existing owner policies remain in place.
drop policy if exists "Menu staff can view menu items" on public.menu_items;
create policy "Menu staff can view menu items"
on public.menu_items
for select to authenticated
using (public.has_kiosk_role(array['menu_staff', 'manager']));

drop policy if exists "Menu staff can add menu items" on public.menu_items;
create policy "Menu staff can add menu items"
on public.menu_items
for insert to authenticated
with check (public.has_kiosk_role(array['menu_staff', 'manager']));

drop policy if exists "Menu staff can update menu items" on public.menu_items;
create policy "Menu staff can update menu items"
on public.menu_items
for update to authenticated
using (public.has_kiosk_role(array['menu_staff', 'manager']))
with check (public.has_kiosk_role(array['menu_staff', 'manager']));

drop policy if exists "Menu staff can delete menu items" on public.menu_items;
create policy "Menu staff can delete menu items"
on public.menu_items
for delete to authenticated
using (public.has_kiosk_role(array['menu_staff', 'manager']));

-- Managers can manage inventory. Order and menu staff cannot access stock records.
drop policy if exists "Managers can view inventory items" on public.inventory_items;
create policy "Managers can view inventory items"
on public.inventory_items
for select to authenticated
using (public.has_kiosk_role(array['manager']));

drop policy if exists "Managers can add inventory items" on public.inventory_items;
create policy "Managers can add inventory items"
on public.inventory_items
for insert to authenticated
with check (public.has_kiosk_role(array['manager']));

drop policy if exists "Managers can update inventory items" on public.inventory_items;
create policy "Managers can update inventory items"
on public.inventory_items
for update to authenticated
using (public.has_kiosk_role(array['manager']))
with check (public.has_kiosk_role(array['manager']));

drop policy if exists "Managers can delete inventory items" on public.inventory_items;
create policy "Managers can delete inventory items"
on public.inventory_items
for delete to authenticated
using (public.has_kiosk_role(array['manager']));

drop policy if exists "Managers can view inventory movements" on public.inventory_movements;
create policy "Managers can view inventory movements"
on public.inventory_movements
for select to authenticated
using (public.has_kiosk_role(array['manager']));

drop policy if exists "Managers can add inventory movements" on public.inventory_movements;
create policy "Managers can add inventory movements"
on public.inventory_movements
for insert to authenticated
with check (public.has_kiosk_role(array['manager']));

-- No staff policies are added to payment verification, payment settings,
-- business expenses, owner profiles, or staff administration.
