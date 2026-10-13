# DB 스키마

Supabase 프로젝트 `rovkkutkjossxcamzddn`(서울)에 아래 두 마이그레이션이 적용되어 있습니다.

1. `fittrainer_core` — 테이블 9개, RLS, 회원 한도 트리거, 가입 시 기본 데이터 생성, 회원용 일지 조회 함수
2. `lock_down_functions` — 내부 함수 실행 권한 회수

원본 SQL은 Supabase 대시보드 → Database → Migrations 에서 확인하거나,
`supabase db pull` 로 로컬 `supabase/migrations/` 폴더에 내려받을 수 있습니다.
