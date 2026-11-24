# 모두의 성장 2.0 — WIN-WIN Corporate Edition

기업과 비즈니스 파트너가 서로의 강점을 연결해 함께 성장하는 동반 성장 비즈니스 플랫폼 홈페이지 통합 패키지입니다.

## 이번 최종 통합 업데이트
- 최신 승인 로고 콘셉트 반영: 서로 어깨를 잇는 두 인물과 WIN-WIN의 W를 결합한 심볼
- 홈페이지 헤더·푸터에 신규 심볼 적용
- 공식 브랜드 표기 통일: **모두의 성장 — 동반 성장 비즈니스 플랫폼**
- 메인 비주얼과 기존 2.0 콘텐츠 구성 유지
- Pretendard 우선, Noto Sans KR 대체 글꼴 및 Manrope 영문 숫자 조합
- 제목·본문의 자간, 행간, 문단 간격 및 반응형 가독성 유지
- 기업·파트너·WIN-WIN 3개 핵심 카드의 색상 구분 및 링크 겹침 방지
- 50개 기업·500명 파트너는 1차 목표치로 표시
- 기존 Supabase 설정 및 회원 기능 스크립트 보존

## 업로드 파일
- `index.html`: 홈페이지 구조 및 신규 브랜드 표기
- `style.css`: 디자인·반응형 스타일
- `logo-symbol.png`: 신규 로고 심볼(헤더·푸터 표시용)
- `logo-concept-master.png`: 신규 로고 전체 콘셉트 참고 이미지
- `hero-growth-visual.png`: 메인 비주얼
- `app.js`: 기존 회원 기능 코드
- `config.js`: 기존 Supabase 프로젝트 URL 및 공개용 publishable/anon key
- `config.example.js`: 설정 예시
- `README.md`: 안내
- `GITHUB_UPLOAD_GUIDE.txt`: 업로드 안내
- `supabase-schema-reference-do-not-run.sql`: DB 구조 참고용 (실행 금지)

## 배포
1. 기존 GitHub 저장소를 먼저 백업합니다.
2. ZIP 압축을 풉니다.
3. 저장소 `main` 브랜치에서 Add file → Upload files를 선택합니다.
4. 압축을 푼 파일 11개를 저장소 최상위에 한 번에 업로드합니다.
5. Commit changes 후 GitHub Pages 배포 완료를 기다립니다.
6. 홈페이지에서 Ctrl+F5로 강력 새로고침합니다.

## 보안 및 운영 주의
- `config.js`는 기존 Supabase 연결 설정을 보존합니다. 임의로 바꾸지 마세요.
- 브라우저 코드에는 공개용 publishable/anon key만 사용합니다. service_role/secret key를 넣지 마세요.
- SQL 파일은 참고용입니다. 실행하지 마세요. 기존 데이터베이스 초기화·삭제 작업은 포함하지 않습니다.
- 로그인·회원가입·프로필·상품 등록은 실제 Supabase 운영 계정으로 배포 후 별도 테스트해야 합니다.
- 관리자 승인, 파트너 매칭, 거래·정산, 자료실 접근권한은 별도 서버 정책과 기능 개발이 필요합니다.
- Google Fonts 및 Pretendard CDN을 이용하므로 글꼴 로딩에는 인터넷 연결이 필요합니다.
