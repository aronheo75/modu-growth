# 모두의 성장 2.0 - 통합 검토본
기준: 기존 modoo-growth GitHub Pages 사이트 및 기존 Supabase 프로젝트

## 이번 패키지 반영
- 메인 페이지 타이포그래피 정돈(Pretendard 우선, Noto Sans KR 대체)
- 1차 모집 목표를 제휴 기업 50개사 / 비즈니스 파트너 500명으로 변경
- 플랫폼 이용 안내, 회사 소개, 성장 스토리 콘텐츠 영역 추가
- 모바일 반응형 스타일 보강
- 자료실용 추가 DB 설계 초안 포함

## 중요: 아직 정식 운영 배포본이 아닙니다
이 패키지는 정적 사이트와 화면 콘텐츠를 개선한 통합 검토본입니다.
실제 Supabase 자료 업로드/다운로드, 기업 승인, 파트너 권한, 관리자 승인,
거래/수수료/정산은 데이터베이스 구조와 RLS 검증이 추가로 필요합니다.

## 안전 수칙
1. 기존 GitHub 저장소와 Supabase 프로젝트를 삭제하거나 새로 만들지 마세요.
2. 기존 `supabase-schema.sql`을 다시 실행하지 마세요.
3. `supabase-documents-migration-DRAFT.sql`은 검토용 초안입니다. 운영 DB에서 실행하지 마세요.
4. Supabase Storage에 비공개 버킷을 만들고 정책을 적용하기 전에는 민감한 기업자료를 올리지 마세요.
5. `config.js`에는 기존 프로젝트의 URL과 publishable/anon key만 사용합니다. service_role/secret key는 절대 브라우저 파일에 넣지 마세요.
6. GitHub 반영 전 현재 배포 파일을 별도 백업하고, 가능하면 테스트 브랜치에서 먼저 확인하세요.

## 파일
- index.html / style.css / app.js / config.js
- config.example.js / 기존 supabase-schema.sql
- supabase-documents-migration-DRAFT.sql
- README.md / GITHUB_UPLOAD_GUIDE.txt

## 검증 범위
정적 파일 구조와 패키징 확인용입니다. 실제 Supabase 인증, RLS, Storage 권한, 메일 인증,
브라우저별 배포 동작은 실제 프로젝트 계정으로 테스트해야 합니다.
