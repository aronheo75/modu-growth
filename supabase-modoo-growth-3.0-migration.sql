-- 모두의 성장 3.0 통합 업무 모듈 (기업회원 + 비즈니스파트너 + 관리자)
-- 기존 auth.users / profiles / offers 및 기존 회원·상품 데이터는 삭제하지 않습니다.
-- 기존 2.x 마이그레이션을 적용한 프로젝트에 추가하는 SQL입니다.
-- 실행 전 Supabase 백업을 권장합니다. 이 파일은 기존 테이블을 DROP하지 않습니다.

create extension if not exists pgcrypto;

-- 파트너 프로필 확장 (기존 프로필 데이터 유지)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_expertise text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_regions text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_experience text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_categories text;

-- 1. 제휴·협약 신청: 기업은 총 영업 수수료율 하나만 제안합니다.
create table if not exists public.platform_agreements (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete restrict,
  company_id uuid not null references public.profiles(id) on delete restrict,
  proposed_total_rate numeric(5,2) not null check (proposed_total_rate > 0 and proposed_total_rate <= 100),
  partner_rate numeric(5,2) check (partner_rate >= 0 and partner_rate <= 100),
  platform_rate numeric(5,2) check (platform_rate >= 0 and platform_rate <= 100),
  commission_basis text not null,
  sales_scope text not null,
  contract_method text not null,
  after_sales text,
  additional_terms text,
  desired_start_date date,
  status text not null default 'submitted' check (status in ('submitted','reviewing','adjustment','approved','rejected','terminated')),
  admin_note text,
  version integer not null default 1 check (version >= 1),
  effective_from date,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_agreements_split_sum check (
    (partner_rate is null and platform_rate is null) or
    (partner_rate is not null and platform_rate is not null and abs(partner_rate + platform_rate - proposed_total_rate) <= 0.01)
  )
);
create index if not exists platform_agreements_company_idx on public.platform_agreements(company_id, created_at desc);
create index if not exists platform_agreements_offer_idx on public.platform_agreements(offer_id, status);

-- 승인 협약의 변경 전후 조건을 보존하는 이력 테이블
create table if not exists public.platform_agreement_history (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.platform_agreements(id) on delete restrict,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);

create or replace function public.modoo_agreement_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists modoo_agreement_updated_at_trg on public.platform_agreements;
create trigger modoo_agreement_updated_at_trg before update on public.platform_agreements
for each row execute function public.modoo_agreement_updated_at();

create or replace function public.modoo_agreement_history_trg()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if old.status = 'approved' and (
    new.proposed_total_rate is distinct from old.proposed_total_rate or
    new.partner_rate is distinct from old.partner_rate or
    new.platform_rate is distinct from old.platform_rate or
    new.commission_basis is distinct from old.commission_basis or
    new.sales_scope is distinct from old.sales_scope or
    new.contract_method is distinct from old.contract_method or
    new.after_sales is distinct from old.after_sales or
    new.additional_terms is distinct from old.additional_terms or
    new.effective_from is distinct from old.effective_from
  ) then
    insert into public.platform_agreement_history(agreement_id,version,snapshot,changed_by)
    values(old.id,old.version,to_jsonb(old),auth.uid());
    new.version := old.version + 1;
  end if;
  return new;
end; $$;
drop trigger if exists modoo_agreement_history_trg on public.platform_agreements;
create trigger modoo_agreement_history_trg before update on public.platform_agreements
for each row execute function public.modoo_agreement_history_trg();

-- 2. 파트너의 상품별 영업 참여 신청
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles(id) on delete restrict,
  offer_id uuid not null references public.offers(id) on delete restrict,
  introduction text,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected','withdrawn')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(partner_id, offer_id)
);
create index if not exists partner_applications_offer_idx on public.partner_applications(offer_id,status);

-- 3. 파트너 영업활동 및 실적 기록. 결제·송금은 자동 처리하지 않습니다.
create table if not exists public.sales_records (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles(id) on delete restrict,
  offer_id uuid not null references public.offers(id) on delete restrict,
  customer_name text not null,
  customer_contact text,
  expected_amount numeric(14,2) not null default 0 check (expected_amount >= 0),
  contracted_amount numeric(14,2) check (contracted_amount >= 0),
  commission_amount numeric(14,2) not null default 0 check (commission_amount >= 0),
  stage text not null default 'lead' check (stage in ('lead','contacted','proposal','negotiation','contracted','lost')),
  settlement_status text not null default 'pending' check (settlement_status in ('pending','approved','paid','held')),
  notes text,
  verified_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sales_records_partner_idx on public.sales_records(partner_id,created_at desc);
create index if not exists sales_records_offer_idx on public.sales_records(offer_id,created_at desc);

-- 4. RLS
alter table public.platform_agreements enable row level security;
alter table public.platform_agreement_history enable row level security;
alter table public.partner_applications enable row level security;
alter table public.sales_records enable row level security;

-- 협약: 기업은 본인 기업의 승인 상품에 한해 신청, 조회는 본인/관리자
 drop policy if exists modoo_agreement_select on public.platform_agreements;
create policy modoo_agreement_select on public.platform_agreements for select to authenticated
using (company_id = auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists modoo_agreement_insert on public.platform_agreements;
create policy modoo_agreement_insert on public.platform_agreements for insert to authenticated
with check (company_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='company') and exists(select 1 from public.offers o where o.id=offer_id and o.owner_id=auth.uid() and o.status='active'));
drop policy if exists modoo_agreement_admin_update on public.platform_agreements;
create policy modoo_agreement_admin_update on public.platform_agreements for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- 이력은 관리자와 해당 기업만 열람 가능. 브라우저에서 직접 추가/수정 금지.
drop policy if exists modoo_agreement_history_select on public.platform_agreement_history;
create policy modoo_agreement_history_select on public.platform_agreement_history for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') or exists(select 1 from public.platform_agreements a where a.id=agreement_id and a.company_id=auth.uid()));

-- 파트너 신청: 본인 파트너가 등록, 본인·관련 기업·관리자가 조회, 관리자가 상태 변경
 drop policy if exists modoo_partner_apps_select on public.partner_applications;
create policy modoo_partner_apps_select on public.partner_applications for select to authenticated
using (partner_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') or exists(select 1 from public.offers o where o.id=offer_id and o.owner_id=auth.uid()));
drop policy if exists modoo_partner_apps_insert on public.partner_applications;
create policy modoo_partner_apps_insert on public.partner_applications for insert to authenticated
with check (partner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='partner') and exists(select 1 from public.offers o where o.id=offer_id and o.status='active'));
drop policy if exists modoo_partner_apps_admin_update on public.partner_applications;
create policy modoo_partner_apps_admin_update on public.partner_applications for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- 영업기록: 파트너는 승인된 참여 상품에 본인 영업 건을 등록, 본인/관련 기업/관리자가 조회
 drop policy if exists modoo_sales_select on public.sales_records;
create policy modoo_sales_select on public.sales_records for select to authenticated
using (partner_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') or exists(select 1 from public.offers o where o.id=offer_id and o.owner_id=auth.uid()));
drop policy if exists modoo_sales_insert on public.sales_records;
create policy modoo_sales_insert on public.sales_records for insert to authenticated
with check (partner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='partner') and exists(select 1 from public.partner_applications a where a.partner_id=auth.uid() and a.offer_id=offer_id and a.status='approved'));
drop policy if exists modoo_sales_admin_update on public.sales_records;
create policy modoo_sales_admin_update on public.sales_records for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- 5. 테이블 권한 (RLS가 실제 행 접근을 제한)
grant select, insert, update on public.platform_agreements to authenticated;
grant select on public.platform_agreement_history to authenticated;
grant select, insert, update on public.partner_applications to authenticated;
grant select, insert, update on public.sales_records to authenticated;

comment on table public.platform_agreements is '기업별 상품 제휴 신청 및 플랫폼 최종 수수료 배분 조건';
comment on table public.platform_agreement_history is '승인 협약 조건 변경 전 버전 보존';
comment on table public.partner_applications is '비즈니스파트너의 상품별 영업 참여 신청';
comment on table public.sales_records is '파트너 영업활동 및 실적·수수료 정산 관리. 실제 송금 연동은 별도';

-- 적용 후 Supabase 대시보드의 API 스키마 캐시가 갱신될 때까지 잠시 기다린 뒤 사이트를 새로고침하세요.
