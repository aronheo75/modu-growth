# 모두의 성장 2.0 — Editorial Corporate Edition

기업과 비즈니스 파트너의 동반 성장을 연결하는 플랫폼 홈페이지 통합 패키지입니다.

## 이번 업데이트
- SK케미칼 홈페이지에서 참고한 절제된 기업형 타이포그래피와 여백 중심의 정보 구성
- Pretendard 우선 적용, Noto Sans KR 대체 글꼴 및 Manrope 영문 숫자 조합
- 본문 줄 간격, 제목 크기, 자간, 문단 간격을 PC·태블릿·모바일별로 조정
- 신규 제작한 도시·비즈니스 파트너·디지털 지구본 히어로 이미지 적용
- 50개 기업·500명 파트너의 1차 목표 스트립 추가 (목표 수치임을 명시)
- 기존 Supabase 설정 파일과 기존 회원 기능 스크립트 보존

## 파일 구성
- `index.html`: 홈페이지 구조
- `style.css`: 디자인·반응형 스타일
- `hero-growth-visual.png`: 신규 메인 비주얼
- `app.js`: 기존 회원 기능 코드
- `config.js`: 기존 Supabase 프로젝트 URL 및 공개용 publishable key
- `config.example.js`: 설정 예시
- `GITHUB_UPLOAD_GUIDE.txt`: 업로드 안내
- `supabase-schema-reference-do-not-run.sql`: DB 구조 참고용 (실행 금지)

## 배포
1. 기존 GitHub 저장소 전체를 먼저 백업합니다.
2. ZIP 압축을 풉니다.
3. 저장소 `main` 브랜치에서 Add file → Upload files를 선택합니다.
4. 압축을 푼 파일 9개를 저장소 최상위에 한 번에 업로드합니다.
5. Commit changes 후 GitHub Pages 배포가 완료될 때까지 기다립니다.
6. 홈페이지에서 Ctrl+F5로 강력 새로고침합니다.

## 보안·운영 주의
- `config.js`는 기존 Supabase 연결 설정을 유지해야 합니다.
- 브라우저 코드에는 공개용 publishable/anon key만 사용합니다. service_role/secret key를 넣지 마세요.
- SQL 파일은 참고용입니다. 실행하지 마세요. 기존 데이터베이스 초기화·삭제 작업은 포함하지 않습니다.
- 로그인·회원가입·프로필·상품 등록은 실제 Supabase 운영 계정으로 배포 후 별도 테스트해야 합니다.
- 관리자 승인, 파트너 매칭, 거래·정산, 자료실 접근권한은 별도 서버 정책과 기능 개발이 필요합니다.
- Google Fonts와 Pretendard CDN을 이용하므로 글꼴 로딩에는 인터넷 연결이 필요합니다. CDN 장애 시 시스템 글꼴로 대체됩니다.
