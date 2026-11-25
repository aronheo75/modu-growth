-- 모두의 성장 2.2: 기업회원 회사 자료실 추가 마이그레이션
-- 기존 profiles / offers / auth.users 데이터는 삭제하거나 초기화하지 않습니다.
-- Supabase SQL Editor에서 기존 프로젝트 백업 후 이 파일만 검토·실행하세요.

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default '기타 영업자료',
  description text,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  visibility text not null default 'private' check (visibility in ('private','partners')),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_documents_path_owner check (split_part(storage_path,'/',1)=owner_id::text)
);

create index if not exists company_documents_owner_created_idx
  on public.company_documents(owner_id, created_at desc);
create index if not exists company_documents_visibility_status_idx
  on public.company_documents(visibility,status);

create or replace function public.company_documents_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists company_documents_set_updated_at on public.company_documents;
create trigger company_documents_set_updated_at
before update on public.company_documents
for each row execute function public.company_documents_set_updated_at();

alter table public.company_documents enable row level security;

drop policy if exists "company_documents_select_owner_partner_admin" on public.company_documents;
create policy "company_documents_select_owner_partner_admin"
on public.company_documents for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  or (
    visibility='partners' and status='published'
    and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='partner')
  )
);

drop policy if exists "company_documents_insert_company_admin" on public.company_documents;
create policy "company_documents_insert_company_admin"
on public.company_documents for insert to authenticated
with check (
  owner_id=(select auth.uid())
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('company','admin'))
);

drop policy if exists "company_documents_update_owner_admin" on public.company_documents;
create policy "company_documents_update_owner_admin"
on public.company_documents for update to authenticated
using (
  owner_id=(select auth.uid())
  or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
)
with check (
  owner_id=(select auth.uid())
  or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

drop policy if exists "company_documents_delete_owner_admin" on public.company_documents;
create policy "company_documents_delete_owner_admin"
on public.company_documents for delete to authenticated
using (
  owner_id=(select auth.uid())
  or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);

-- Private bucket: files are never exposed through a public URL.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'company-library','company-library',false,20971520,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Upload: only company/admin can upload into their own auth.uid() folder.
drop policy if exists "company_library_upload_own_folder" on storage.objects;
create policy "company_library_upload_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id='company-library'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('company','admin'))
);

-- Read: owner/admin can access own file; partners can read only published partner-visible files.
drop policy if exists "company_library_read_authorized_documents" on storage.objects;
create policy "company_library_read_authorized_documents"
on storage.objects for select to authenticated
using (
  bucket_id='company-library'
  and exists (
    select 1 from public.company_documents d
    where d.storage_path=name
      and (
        d.owner_id=(select auth.uid())
        or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
        or (d.visibility='partners' and d.status='published'
            and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='partner'))
      )
  )
);

-- Update/delete are limited to the owning company folder (and admin).
drop policy if exists "company_library_update_own_folder" on storage.objects;
create policy "company_library_update_own_folder"
on storage.objects for update to authenticated
using (
  bucket_id='company-library'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('company','admin'))
)
with check (
  bucket_id='company-library'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('company','admin'))
);

drop policy if exists "company_library_delete_own_folder" on storage.objects;
create policy "company_library_delete_own_folder"
on storage.objects for delete to authenticated
using (
  bucket_id='company-library'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('company','admin'))
);

-- End of additive migration. Never disable RLS and never expose service_role keys in the browser.
