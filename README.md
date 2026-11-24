# 모두의 성장 (ModooGrowth)

기업과 영업파트너를 연결하는 동반 성장 비즈니스 플랫폼의 정적 웹사이트 및 Supabase 연동 기본 패키지입니다.

## 파일 구성

- `index.html` : 메인 페이지, 회원가입/로그인 모달, 회원 대시보드
- `style.css` : 반응형 디자인
- `app.js` : Supabase 인증, 프로필/기업/파트너/상품 데이터 표시
- `config.js` : Supabase URL 및 공개 anon/publishable key 설정
- `supabase-schema.sql` : 기본 테이블, 가입 프로필 자동 생성, RLS 정책

## 1. GitHub Pages 배포

1. GitHub 저장소 `modu-growth`의 `main` 브랜치 루트에 위 파일들을 업로드합니다.
2. `index.html`, `style.css`, `app.js`는 같은 폴더(저장소 최상위)에 있어야 합니다.
3. 저장 후 GitHub Pages 배포가 완료될 때까지 잠시 기다립니다.
4. 브라우저에서 강력 새로고침(Windows: Ctrl+F5)을 합니다.

## 2. Supabase 설정

1. Supabase 프로젝트의 Project URL과 anon/public publishable key를 확인합니다.
2. `config.js`의 `YOUR_...` 값을 실제 값으로 바꿉니다.
3. Supabase SQL Editor에서 `supabase-schema.sql`을 검토한 후 실행합니다.
4. 이메일 인증 설정에 따라 가입 후 이메일 확인이 필요할 수 있습니다.

**보안 주의:** 브라우저에 공개되는 `config.js`에는 Project URL과 anon/publishable key만 넣으세요. `service_role` 또는 secret key는 절대 넣지 마세요. RLS 정책을 임의로 끄지 마세요.

## 3. 관리자 계정

일반 회원가입으로 관리자 권한을 만들 수 없도록 되어 있습니다. 먼저 관리자 이메일로 회원가입한 후, SQL Editor에서 README 하단이 아니라 `supabase-schema.sql` 마지막 주석의 관리자 지정 SQL 예시를 실제 이메일로 수정해 실행하세요.

## 4. 현재 구현 범위와 다음 개발 항목

현재 기본 구현:
- 기업/영업파트너 이메일 가입 및 로그인
- Supabase 프로필 자동 생성
- 회원별 역할 표시
- 기업/파트너/상품 목록과 기본 통계 조회
- 기업 프로필 및 상품 등록(권한 정책에 따름)
- 관리자 메뉴의 기본 골격

추가 개발 필요:
- 가입 승인 워크플로, 기업 검증
- 파트너 추천/매칭 로직
- 계약, 주문, 거래, 수수료, 정산 테이블과 화면
- 관리자 전용 승인/운영 기능
- 약관/개인정보 처리방침, 이메일/SMS 인증 정책
- 운영 전 보안 점검 및 테스트

## 5. 기존 Supabase 프로젝트 사용 시 주의

기존 프로젝트에 데이터가 있다면 `supabase-schema.sql`을 무검토로 실행하지 마세요. 현재 테이블/정책과 충돌할 수 있으므로 먼저 백업하고 기존 스키마를 비교해야 합니다.
