-- 해시태그 관련 테이블의 RLS 비활성화 (개발 단계)
ALTER TABLE IF EXISTS public.hashtags DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_hashtags DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.hashtags TO anon;
GRANT ALL ON TABLE public.hashtags TO authenticated;
GRANT ALL ON TABLE public.hashtags TO service_role;

GRANT ALL ON TABLE public.post_hashtags TO anon;
GRANT ALL ON TABLE public.post_hashtags TO authenticated;
GRANT ALL ON TABLE public.post_hashtags TO service_role;

