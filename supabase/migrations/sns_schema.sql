-- ============================================
-- Initial Setup: Instagram Clone SNS Database
-- ============================================
-- 1. Users 테이블
-- 2. Posts, Likes, Comments, Follows 테이블
-- 3. Views 및 Triggers
-- ============================================
-- Note: Storage 버킷은 Supabase 대시보드에서 직접 생성
-- ============================================

-- ============================================
-- 1. Users 테이블 생성
-- ============================================
-- Clerk 인증과 연동되는 사용자 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 테이블 소유자 설정
ALTER TABLE public.users OWNER TO postgres;

-- Row Level Security (RLS) 비활성화 (개발 단계)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

-- ============================================
-- 2. Posts 테이블 (게시물)
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,  -- Supabase Storage URL
    caption TEXT,  -- 최대 2,200자 (애플리케이션에서 검증)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 테이블 소유자 설정
ALTER TABLE public.posts OWNER TO postgres;

-- 인덱스 생성
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

-- RLS 비활성화 (개발 단계)
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.posts TO anon;
GRANT ALL ON TABLE public.posts TO authenticated;
GRANT ALL ON TABLE public.posts TO service_role;

-- ============================================
-- 3. Likes 테이블 (좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    -- 중복 좋아요 방지 (같은 사용자가 같은 게시물에 여러 번 좋아요 불가)
    UNIQUE(post_id, user_id)
);

-- 테이블 소유자 설정
ALTER TABLE public.likes OWNER TO postgres;

-- 인덱스 생성
CREATE INDEX idx_likes_post_id ON public.likes(post_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);

-- RLS 비활성화 (개발 단계)
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.likes TO anon;
GRANT ALL ON TABLE public.likes TO authenticated;
GRANT ALL ON TABLE public.likes TO service_role;

-- ============================================
-- 4. Comments 테이블 (댓글)
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 테이블 소유자 설정
ALTER TABLE public.comments OWNER TO postgres;

-- 인덱스 생성
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);

-- RLS 비활성화 (개발 단계)
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.comments TO anon;
GRANT ALL ON TABLE public.comments TO authenticated;
GRANT ALL ON TABLE public.comments TO service_role;

-- ============================================
-- 5. Follows 테이블 (팔로우)
-- ============================================
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- 팔로우하는 사람
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- 팔로우받는 사람
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    -- 중복 팔로우 방지 및 자기 자신 팔로우 방지
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- 테이블 소유자 설정
ALTER TABLE public.follows OWNER TO postgres;

-- 인덱스 생성
CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX idx_follows_following_id ON public.follows(following_id);

-- RLS 비활성화 (개발 단계)
ALTER TABLE public.follows DISABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON TABLE public.follows TO anon;
GRANT ALL ON TABLE public.follows TO authenticated;
GRANT ALL ON TABLE public.follows TO service_role;

-- ============================================
-- 6. 유용한 뷰 (Views)
-- ============================================

-- 게시물 통계 뷰 (좋아요 수, 댓글 수)
CREATE OR REPLACE VIEW public.post_stats AS
SELECT
    p.id as post_id,
    p.user_id,
    p.image_url,
    p.caption,
    p.created_at,
    COUNT(DISTINCT l.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count
FROM public.posts p
LEFT JOIN public.likes l ON p.id = l.post_id
LEFT JOIN public.comments c ON p.id = c.post_id
GROUP BY p.id, p.user_id, p.image_url, p.caption, p.created_at;

-- 사용자 통계 뷰 (게시물 수, 팔로워 수, 팔로잉 수)
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
    u.id as user_id,
    u.clerk_id,
    u.name,
    COUNT(DISTINCT p.id) as posts_count,
    COUNT(DISTINCT f1.id) as followers_count,  -- 나를 팔로우하는 사람들
    COUNT(DISTINCT f2.id) as following_count   -- 내가 팔로우하는 사람들
FROM public.users u
LEFT JOIN public.posts p ON u.id = p.user_id
LEFT JOIN public.follows f1 ON u.id = f1.following_id
LEFT JOIN public.follows f2 ON u.id = f2.follower_id
GROUP BY u.id, u.clerk_id, u.name;

-- 뷰 권한 부여
GRANT SELECT ON public.post_stats TO anon;
GRANT SELECT ON public.post_stats TO authenticated;
GRANT SELECT ON public.post_stats TO service_role;

GRANT SELECT ON public.user_stats TO anon;
GRANT SELECT ON public.user_stats TO authenticated;
GRANT SELECT ON public.user_stats TO service_role;

-- ============================================
-- 7. 트리거 함수 (updated_at 자동 업데이트)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- posts 테이블에 트리거 적용
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- comments 테이블에 트리거 적용
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
