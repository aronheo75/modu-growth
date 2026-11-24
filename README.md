# 모두의 성장 (ModooGrowth)

기업과 영업파트너를 연결하는 동반 성장 비즈니스 플랫폼의 GitHub Pages 프런트엔드 및 Supabase 기본 연동 패키지입니다.

## 파일 구성

- `index.html` — 메인 페이지, 회원가입/로그인 모달, 회원 대시보드
- `style.css` — 반응형 디자인
- `app.js` — Supabase 이메일 인증, 프로필 및 목록 조회, 기업정보/상품 등록
- `config.js` — 이 프로젝트의 Supabase Project URL 및 공개 Publishable Key
- `config.example.js` — 다른 환경에서 사용할 설정 예시
- `supabase-schema.sql` — 기존 기본 스키마 참고용
- `supabase-migration-documents.sql` — 기업자료실 전용 추가 마이그레이션

## GitHub Pages 업데이트

1. ZIP 압축을 풉니다.
2. GitHub 저장소 `modu-growth`의 `main` 브랜치 최상위(root)에서 `Add file` → `Upload files`를 선택합니다.
3. 이 패키지의 파일을 업로드해 기존 파일과 교체합니다. `config.js`도 이번에 포함된 연결 설정 파일로 교체합니다.
4. `Commit changes`를 누르고 Pages 배포가 끝날 때까지 기다립니다.
5. 홈페이지에서 `Ctrl+F5`로 강력 새로고침합니다.

## Supabase 주의사항

- `config.js`에는 Project URL과 브라우저 공개용 Publishable Key만 들어 있습니다.
- `service_role` 또는 secret key는 절대 브라우저나 공개 GitHub 저장소에 넣지 마세요.
- `supabase-schema.sql`은 기존 데이터베이스의 테이블/정책과 충돌할 수 있습니다. **이번 파일 교체만으로 SQL을 실행하지 마세요.** 기존 프로젝트의 현재 테이블과 RLS 정책을 확인하고 백업한 뒤 별도 검토 후 적용해야 합니다.
- 이메일 인증이 켜져 있으면 가입 후 이메일 확인을 거쳐야 로그인할 수 있습니다.

## 현재 구현 범위와 한계

현재 제공되는 기능은 이메일 회원가입/로그인, 가입 시 프로필 자동 생성(데이터베이스 트리거가 설치된 경우), 역할 표시, 기본 목록/통계 조회, 기업 프로필 및 상품 등록입니다.

관리자 승인·회원 검증·파트너 매칭·거래/주문·수수료/정산 기능은 아직 실제 운영 기능으로 완성되지 않았습니다. 화면의 대시보드 미리보기 수치는 사업 목표 또는 시각적 예시이며 실제 운영 실적이 아닙니다.

운영 전에는 RLS 정책, 개인정보 노출 범위, 관리자 권한 부여, 이메일 인증 리디렉션 URL을 별도로 점검해야 합니다.


## 2.0 기업자료실 기능

- 기업회원: PDF/PPT/DOC/XLS/이미지 파일(최대 15MB) 업로드, 파트너 공개 또는 기업 전용 설정, 본인 자료 삭제
- 비즈니스 파트너: 파트너 공개 자료 조회 및 60초 서명 URL을 통한 다운로드
- 파일은 비공개 Supabase Storage 버킷에 저장하며, 테이블 RLS와 Storage 정책으로 접근을 제한합니다.

### 데이터베이스 적용 주의

`supabase-migration-documents.sql`은 기존 `profiles` 테이블에 `id`, `role` 컬럼이 있고 role 값이 company/partner/admin인 구성을 전제로 하는 추가 스크립트입니다. 실행 전 Supabase 백업을 만들고, SQL 내용을 검토한 후 SQL Editor에서 별도로 실행하세요. `supabase-schema.sql` 전체를 다시 실행하거나 기존 테이블을 삭제하지 마세요. 실제 프로젝트의 RLS 정책에 따라 추가 조정이 필요할 수 있습니다.

### 검증 범위

정적 HTML/JS 검사와 패키지 파일 검토는 가능하지만, 실제 Supabase 프로젝트에 마이그레이션을 적용하거나 실제 회원 계정으로 업로드·다운로드를 확인한 것은 아닙니다. 배포 전 테스트 계정(기업/파트너/관리자)으로 권한을 확인해야 합니다.
