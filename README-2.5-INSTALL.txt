모두의 성장 2.5 통합 업데이트 안내

[GitHub 반영]
1. 먼저 현재 GitHub 저장소의 config.js를 PC에 별도 백업하세요.
2. 이 ZIP의 파일 전체를 압축 해제합니다.
3. GitHub 저장소 main에서 Add file > Upload files를 선택합니다.
4. 압축 해제한 폴더 안의 파일을 저장소 루트에 업로드하고 Commit changes를 누릅니다.
5. config.js는 기존 프로젝트의 Supabase URL 및 publishable/anon key가 든 파일과 동일한지 확인하세요. 다르면 GitHub의 기존 config.js를 유지하고 이번 패키지의 config.js로 덮어쓰지 마세요.
6. GitHub Pages 배포 완료 후 홈페이지에서 Ctrl+F5로 새로고침합니다.

[Supabase 반영]
1. 이번 업데이트에서는 supabase-product-admin-migration.sql 파일만 실행합니다.
2. Supabase SQL Editor에서 새 쿼리를 열고 해당 파일 전체를 붙여넣어 실행합니다.
3. 이 SQL은 offers에 컬럼을 추가하고 상품 상태 보호 트리거를 설치합니다. 기존 행은 삭제하지 않습니다.
4. 이미 실행한 supabase-company-profile-migration.sql은 다시 실행하지 않습니다.
5. 회사 자료실 migration은 이번 상품 승인 작업과 별개이므로 실행하지 않습니다.

[관리자 계정]
- 일반 회원가입으로 admin 역할을 선택할 수 없습니다.
- 기존에 안전하게 관리자 지정된 계정으로 로그인해야 운영 관리 메뉴가 표시됩니다.
- 관리자 권한을 일반 기업회원에게 부여하지 마세요.

[테스트 순서]
1. 기업회원 로그인 > 상품·서비스 > 상품 등록
2. 상품이 '관리자 검토 대기'로 표시되는지 확인
3. 비즈니스파트너 로그인 > 상품·서비스에서 승인 상품만 보이는지 확인
4. 관리자 로그인 > 운영 관리 > 승인/반려/판매 보류 동작 확인

[주의]
- 실행 전 Supabase 백업을 권장합니다.
- GitHub 업로드와 Supabase SQL 실행은 서로 다른 작업입니다. 파일 업로드만으로 데이터베이스가 변경되지는 않습니다.
