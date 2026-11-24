-- 모두의 성장 2.0: 기업자료실 추가 마이그레이션
-- 기존 profiles/offers/auth.users 데이터는 삭제하거나 변경하지 않습니다.
-- 적용 전 Supabase 백업을 권장합니다. 기존 스키마의 profiles.id와 role 컬럼을 전제로 합니다.

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  title text not null check (char_length(title) between 1 and 100),
  description text,
  file_path text not null unique,
  file_size bigint not null default 0 check (file_size >= 0 and file_size <= 15728640),
  visibility text not null default 'partners' check (visibility in ('partners','private')),
  created_at timestamptz not null default now()
);

create index if not exists company_documents_company_idx on public.company_documents(company_id, created_at desc);
create index if not exists company_documents_visibility_idx on public.company_documents(visibility, created_at desc);
alter table public.company_documents enable row level security;

drop policy if exists "company_documents_select_authorized" on public.company_documents;
create policy "company_documents_select_authorized" on public.company_documents
for select to authenticated using (
  company_id = (select auth.uid())
  or (visibility = 'partners' and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'partner'
  ))
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists "company_documents_insert_company" on public.company_documents;
create policy "company_documents_insert_company" on public.company_documents
for insert to authenticated with check (
  company_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'company')
  and split_part(file_path, '/', 1) = (select auth.uid())::text
);

drop policy if exists "company_documents_delete_company" on public.company_documents;
create policy "company_documents_delete_company" on public.company_documents
for delete to authenticated using (
  company_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-documents', 'company-documents', false, 15728640,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 15728640;

drop policy if exists "company_documents_storage_upload" on storage.objects;
create policy "company_documents_storage_upload" on storage.objects
for insert to authenticated with check (
  bucket_id = 'company-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'company')
);

drop policy if exists "company_documents_storage_read" on storage.objects;
create policy "company_documents_storage_read" on storage.objects
for select to authenticated using (
  bucket_id = 'company-documents'
  and exists (
    select 1 from public.company_documents d
    where d.file_path = name
      and (d.company_id = (select auth.uid()) or d.visibility = 'partners'
        or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  )
);

drop policy if exists "company_documents_storage_delete" on storage.objects;
create policy "company_documents_storage_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'company-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 확인용
select 'company_documents table ready' as status;
