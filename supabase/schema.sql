-- PlotWeaver Supabase Schema (MVP · 가족/친구 테스트용)
-- Supabase SQL Editor에서 실행하세요.

-- RLS 정책을 위해 auth.uid() 사용

-- ── novels ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS novels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  settings    JSONB       NOT NULL DEFAULT '{}',  -- 전체 설정 (캐릭터·관계·서사 포함)
  cover_url   TEXT,
  status      TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','private','public','selling')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE novels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 작품만 조회" ON novels FOR SELECT USING (author_id = auth.uid());
CREATE POLICY "본인 작품만 생성" ON novels FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "본인 작품만 수정" ON novels FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "본인 작품만 삭제" ON novels FOR DELETE USING (author_id = auth.uid());

-- ── chapters ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id    UUID        NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  seq         INTEGER     NOT NULL CHECK (seq >= 1),
  content     TEXT        NOT NULL DEFAULT '',
  word_count  INTEGER     GENERATED ALWAYS AS (LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(novel_id, seq)
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 챕터만 조회" ON chapters FOR SELECT
  USING (EXISTS (SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid()));
CREATE POLICY "본인 챕터만 생성" ON chapters FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid()));
CREATE POLICY "본인 챕터만 수정" ON chapters FOR UPDATE
  USING (EXISTS (SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid()));

-- ── story_bibles ──────────────────────────────────────────────────────
-- 엔진이 매 회차마다 갱신하는 일관성 상태 (summaries·open_threads·glossary)
CREATE TABLE IF NOT EXISTS story_bibles (
  novel_id    UUID        PRIMARY KEY REFERENCES novels(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL DEFAULT '{"summaries":[],"open_threads":[],"glossary":{}}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE story_bibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 바이블만 조회" ON story_bibles FOR SELECT
  USING (EXISTS (SELECT 1 FROM novels WHERE novels.id = story_bibles.novel_id AND novels.author_id = auth.uid()));
CREATE POLICY "본인 바이블만 생성" ON story_bibles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM novels WHERE novels.id = story_bibles.novel_id AND novels.author_id = auth.uid()));
CREATE POLICY "본인 바이블만 수정" ON story_bibles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM novels WHERE novels.id = story_bibles.novel_id AND novels.author_id = auth.uid()));

-- ── profiles (닉네임 등 추가 정보) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 프로필 조회" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "본인 프로필 생성" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "본인 프로필 수정" ON profiles FOR UPDATE USING (id = auth.uid());

-- 회원가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, nickname)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nickname')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── comments (작가-독자 댓글, 비밀 댓글 포함) ───────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id    UUID        NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL CHECK (LENGTH(TRIM(body)) > 0),
  is_secret   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 일반 댓글은 누구나 읽을 수 있음.
-- 비밀 댓글은 작성자 본인 또는 소설 작가만 읽을 수 있음.
CREATE POLICY "댓글 조회" ON comments FOR SELECT
  USING (
    is_secret = FALSE
    OR author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM novels WHERE novels.id = comments.novel_id AND novels.author_id = auth.uid())
  );

CREATE POLICY "댓글 작성" ON comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- 작성자 본인만 수정 가능
CREATE POLICY "댓글 수정" ON comments FOR UPDATE
  USING (author_id = auth.uid());

-- 작성자 본인 또는 소설 작가가 삭제 가능
CREATE POLICY "댓글 삭제" ON comments FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM novels WHERE novels.id = comments.novel_id AND novels.author_id = auth.uid())
  );

-- Service role을 위한 정책 (백엔드 API가 service key로 접근)
-- service key는 RLS를 우회하므로 별도 정책 불필요
