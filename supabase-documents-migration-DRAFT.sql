-- 모두의 성장 2.0 자료실 확장용 SQL 초안
-- 주의: 기존 스키마를 삭제/초기화하지 않습니다. 운영 DB 백업 후 관리자 검토 및 테스트 프로젝트에서 먼저 실행하세요.
-- 기존 profiles 테이블의 role 값과 RLS 정책을 확인한 뒤 적용해야 합니다.

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  storage_path text not null unique,
  document_type text not null default 'catalog',
  visibility text not null default 'approved_partners'
    check (visibility in ('approved_partners','selected_partners','private')),
  status text not null default 'pending'
    check (status in ('pending','published','rejected','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_download_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.company_documents(id) on delete cascade,
  partner_user_id uuid not null references auth.users(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

alter table public.company_documents enable row level security;
alter table public.document_download_logs enable row level security;

-- 업로더 기업만 자료를 조회/등록/수정할 수 있는 기본 정책.
-- 관리자 승인 및 파트너 다운로드 정책은 실제 profiles 구조/승인 모델에 맞춰 별도 적용해야 합니다.
drop policy if exists company_documents_owner_select on public.company_documents;
create policy company_documents_owner_select on public.company_documents
for select to authenticated using (company_user_id = auth.uid());

drop policy if exists company_documents_owner_insert on public.company_documents;
create policy company_documents_owner_insert on public.company_documents
for insert to authenticated with check (company_user_id = auth.uid());

drop policy if exists company_documents_owner_update on public.company_documents;
create policy company_documents_owner_update on public.company_documents
for update to authenticated using (company_user_id = auth.uid())
with check (company_user_id = auth.uid());

-- Storage bucket은 비공개로 Supabase 대시보드에서 'company-documents' 생성 후 사용하세요.
-- 파일 접근 정책과 파트너 승인 기준은 프로필/파트너 승인 스키마 확인 후 별도 설정합니다.
