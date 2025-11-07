-- 해시태그 테이블이 존재하는지 확인하고 없으면 생성
CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON public.hashtags (tag);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (post_id, hashtag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON public.post_hashtags (post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON public.post_hashtags (hashtag_id);

-- RLS 비활성화 (개발 단계)
ALTER TABLE IF EXISTS public.hashtags DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_hashtags DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.hashtags TO anon;
GRANT ALL ON TABLE public.hashtags TO authenticated;
GRANT ALL ON TABLE public.hashtags TO service_role;

GRANT ALL ON TABLE public.post_hashtags TO anon;
GRANT ALL ON TABLE public.post_hashtags TO authenticated;
GRANT ALL ON TABLE public.post_hashtags TO service_role;

