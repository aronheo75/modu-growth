-- 모두의 성장 Supabase 기본 스키마
-- 기존 데이터가 있는 프로젝트에서는 실행 전 반드시 백업하고 테이블 충돌 여부를 확인하세요.
-- Supabase SQL Editor에서 실행합니다.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'partner' check (role in ('company','partner','admin')),
  company_name text,
  phone text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text,
  description text,
  status text not null default 'pending' check (status in ('pending','active','paused','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists offers_owner_id_idx on public.offers(owner_id);
create index if not exists offers_created_at_idx on public.offers(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at before update on public.offers
for each row execute function public.set_updated_at();

-- 신규 가입 시 프로필 자동 생성. 사용자가 전달한 role은 company/partner만 허용.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'partner');
  if requested_role not in ('company','partner') then
    requested_role := 'partner';
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    requested_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.offers enable row level security;

-- 프로필은 로그인한 회원이 조회할 수 있습니다. 역할(role)은 본인이 변경할 수 없습니다.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select to authenticated
using (true);

drop policy if exists "profiles_update_own_non_role" on public.profiles;
create policy "profiles_update_own_non_role"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select p.role from public.profiles p where p.id = auth.uid())
);

-- 상품은 로그인 회원이 조회할 수 있고, 기업은 본인 소유 상품을 등록/수정/삭제할 수 있습니다.
drop policy if exists "offers_select_authenticated" on public.offers;
create policy "offers_select_authenticated"
on public.offers for select to authenticated
using (true);

drop policy if exists "offers_insert_company_owner" on public.offers;
create policy "offers_insert_company_owner"
on public.offers for insert to authenticated
with check (
  owner_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('company','admin'))
);

drop policy if exists "offers_update_owner_or_admin" on public.offers;
create policy "offers_update_owner_or_admin"
on public.offers for update to authenticated
using (
  owner_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  owner_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "offers_delete_owner_or_admin" on public.offers;
create policy "offers_delete_owner_or_admin"
on public.offers for delete to authenticated
using (
  owner_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- 관리자 계정 지정 예시:
-- 먼저 해당 이메일로 일반 회원가입을 마친 뒤 아래 SQL의 이메일을 실제 주소로 바꿔 실행하세요.
-- update public.profiles p
-- set role = 'admin'
-- from auth.users u
-- where p.id = u.id and u.email = '실제관리자이메일@example.com';
