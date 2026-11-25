-- 모두의 성장: 신규 회원가입 연락처 저장 설정
-- 기존 회원, 상품, 테이블 및 RLS 정책은 삭제하거나 재생성하지 않습니다.
-- profiles.phone 컬럼은 기존 스키마에 이미 존재하는 것을 전제로 합니다.
-- Supabase SQL Editor에서 한 번만 실행하세요.

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

  insert into public.profiles (id, display_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    requested_role,
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
