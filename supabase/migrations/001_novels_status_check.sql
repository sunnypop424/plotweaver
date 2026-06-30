-- novels.status 허용 값 확장: draft/published → draft/private/public/selling
-- 기존 DB에 이미 테이블이 있으므로 Supabase SQL Editor에서 1회 실행하세요.

ALTER TABLE novels DROP CONSTRAINT IF EXISTS novels_status_check;

ALTER TABLE novels
  ADD CONSTRAINT novels_status_check
  CHECK (status IN ('draft','private','public','selling'));
