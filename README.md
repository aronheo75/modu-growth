# 모두의 성장 운영형 홈페이지

이 버전은 **Supabase 기반 실제 운영형 서비스 스타터**입니다.

## 포함 기능
- 이메일 회원가입 / 로그인 / 로그아웃
- 기업회원 / 영업파트너 역할 구분
- Supabase Authentication 연동
- PostgreSQL 데이터베이스
- 기업 정보 등록
- 상품·서비스 등록
- 기업 / 파트너 / 상품 목록 조회
- 관리자 메뉴 기반
- 모바일 반응형

## 1. Supabase 프로젝트 생성
1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase-schema.sql` 전체를 실행합니다.
3. Project Settings → API에서 Project URL과 anon key를 확인합니다.

## 2. config.js 수정
```js
window.SUPABASE_URL = "본인의 Supabase URL";
window.SUPABASE_ANON_KEY = "본인의 anon key";
```

## 3. GitHub 업로드
전체 파일을 GitHub 저장소에 업로드합니다.

## 4. GitHub Pages 배포
Repository → Settings → Pages → Deploy from a branch → `main` / `(root)` → Save

## 중요 보안 안내
- `anon key`는 웹 클라이언트용 키입니다.
- `service_role key`는 절대로 GitHub나 웹페이지에 올리면 안 됩니다.
- 실제 상용화 시 개인정보처리방침, 이용약관, 이메일 인증, 관리자 권한 정책을 추가하세요.

## 다음 확장 권장
1. 기업-파트너 매칭 알고리즘
2. 거래·계약 관리
3. 성과보상 자동 계산
4. 정산 시스템
5. 관리자 승인 프로세스
6. AI 추천 시스템
7. 문자/이메일 알림
