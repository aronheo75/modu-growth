-- 모두의 성장 2.3: 기업회원 사업자 기본정보 확장
-- 기존 회원, 로그인, profiles의 기존 값과 offers 데이터는 삭제/초기화하지 않습니다.
-- Supabase SQL Editor에서 백업 후 이 추가 마이그레이션만 검토하고 실행하세요.

alter table public.profiles
  add column if not exists business_type text,
  add column if not exists business_registration_number varchar(10),
  add column if not exists corporation_registration_number varchar(13),
  add column if not exists representative_name text,
  add column if not exists opening_date date,
  add column if not exists business_type_detail text,
  add column if not exists business_item text,
  add column if not exists business_address text,
  add column if not exists company_phone text,
  add column if not exists website_url text,
  add column if not exists official_email text;

alter table public.profiles
  drop constraint if exists profiles_business_type_check;
alter table public.profiles
  add constraint profiles_business_type_check
  check (business_type is null or business_type in ('corporation','sole_proprietor'));

-- 사업자등록번호는 숫자 10자리로 저장합니다. 미입력 기존 회원은 NULL로 유지합니다.
alter table public.profiles
  drop constraint if exists profiles_business_registration_number_check;
alter table public.profiles
  add constraint profiles_business_registration_number_check
  check (business_registration_number is null or business_registration_number ~ '^[0-9]{10}$');

alter table public.profiles
  drop constraint if exists profiles_corporation_registration_number_check;
alter table public.profiles
  add constraint profiles_corporation_registration_number_check
  check (corporation_registration_number is null or corporation_registration_number ~ '^[0-9]{13}$');

-- 동일 사업자번호로 여러 기업 계정이 중복 등록되는 것을 방지합니다.
create unique index if not exists profiles_business_registration_number_uidx
  on public.profiles (business_registration_number)
  where business_registration_number is not null;

comment on column public.profiles.business_type is '사업자 유형: corporation(법인), sole_proprietor(개인사업자)';
comment on column public.profiles.business_registration_number is '사업자등록번호 10자리 숫자';
comment on column public.profiles.corporation_registration_number is '법인등록번호 13자리 숫자';
comment on column public.profiles.website_url is '기업 공식 홈페이지 URL';

-- 기존 RLS 정책은 유지합니다. 이 파일은 컬럼과 제약조건만 추가하며 정책을 완화하지 않습니다.
