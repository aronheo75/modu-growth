-- 모두의 성장 운영형 플랫폼 Supabase 데이터베이스
-- Supabase SQL Editor에서 전체 실행

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  company_name text,
  phone text,
  bio text,
  role text not null default 'company' check (role in ('company','partner','admin')),
  created_at timestamptz default now()
);

create table if not exists public.offers (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  description text,
  status text not null default 'active',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.offers enable row level security;

-- 로그인한 회원은 공개 프로필을 조회
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid()=id);
create policy "offers read" on public.offers for select to authenticated using (true);
create policy "offers insert own" on public.offers for insert to authenticated with check (auth.uid()=owner_id);
create policy "offers update own" on public.offers for update to authenticated using (auth.uid()=owner_id);
create policy "offers delete own" on public.offers for delete to authenticated using (auth.uid()=owner_id);

-- 회원가입 시 자동 프로필 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name','회원'),
    coalesce(new.raw_user_meta_data->>'role','company')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

-- 첫 관리자 지정 예시
-- update public.profiles set role='admin' where id='사용자 UUID';
