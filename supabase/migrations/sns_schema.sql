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

-- 인덱스 생성 (이미 존재하면 무시)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

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

-- 인덱스 생성 (이미 존재하면 무시)
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

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

-- 인덱스 생성 (이미 존재하면 무시)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

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

-- 인덱스 생성 (이미 존재하면 무시)
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

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

-- posts 테이블에 트리거 적용 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS set_updated_at_posts ON public.posts;
CREATE TRIGGER set_updated_at_posts
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- comments 테이블에 트리거 적용 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS set_updated_at_comments ON public.comments;
CREATE TRIGGER set_updated_at_comments
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 8. 샘플 데이터 추가 (개발/테스트용)
-- ============================================
-- 주의: Clerk 인증을 사용하므로 clerk_id는 실제 Clerk 사용자 ID 형식이어야 합니다.
-- 샘플 데이터용으로는 임의의 clerk_id를 사용할 수 있습니다.

-- 1. 샘플 사용자 추가
INSERT INTO public.users (clerk_id, name, created_at)
VALUES
  ('user_sample_001', '홍길동', now() - INTERVAL '5 days'),
  ('user_sample_002', '김철수', now() - INTERVAL '3 days'),
  ('user_sample_003', '이영희', now() - INTERVAL '2 days'),
  ('user_sample_004', '박민수', now() - INTERVAL '1 day')
ON CONFLICT (clerk_id) DO NOTHING;

-- 2. 샘플 게시물 추가
-- 주의: image_url은 실제 이미지 URL이어야 합니다.
-- 옵션 1: Supabase Storage에 업로드한 이미지 URL 사용
-- 옵션 2: 외부 이미지 URL 사용 (예: Unsplash, Placeholder 등)
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  user4_id UUID;
BEGIN
  -- 사용자 ID 조회
  SELECT id INTO user1_id FROM public.users WHERE clerk_id = 'user_sample_001' LIMIT 1;
  SELECT id INTO user2_id FROM public.users WHERE clerk_id = 'user_sample_002' LIMIT 1;
  SELECT id INTO user3_id FROM public.users WHERE clerk_id = 'user_sample_003' LIMIT 1;
  SELECT id INTO user4_id FROM public.users WHERE clerk_id = 'user_sample_004' LIMIT 1;

  -- 샘플 게시물 추가
  INSERT INTO public.posts (user_id, image_url, caption, created_at)
  VALUES
    -- 홍길동의 게시물
    (user1_id, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', '오늘 날씨가 정말 좋네요! 🌞', now() - INTERVAL '4 days'),
    (user1_id, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800', '산책하면서 찍은 사진입니다.', now() - INTERVAL '2 days'),
    
    -- 김철수의 게시물
    (user2_id, 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800', '맛있는 커피 한 잔 ☕', now() - INTERVAL '3 days'),
    (user2_id, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', '주말에 나들이 다녀왔어요!', now() - INTERVAL '1 day'),
    
    -- 이영희의 게시물
    (user3_id, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800', '새로운 책을 읽기 시작했어요 📚', now() - INTERVAL '2 days'),
    
    -- 박민수의 게시물
    (user4_id, 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800', '오늘의 점심 메뉴 🍱', now() - INTERVAL '6 hours')
  ON CONFLICT DO NOTHING;
END $$;

-- 3. 샘플 좋아요 추가
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  user4_id UUID;
  post1_id UUID;
  post2_id UUID;
  post3_id UUID;
  post4_id UUID;
  post5_id UUID;
  post6_id UUID;
BEGIN
  -- 사용자 ID 조회
  SELECT id INTO user1_id FROM public.users WHERE clerk_id = 'user_sample_001' LIMIT 1;
  SELECT id INTO user2_id FROM public.users WHERE clerk_id = 'user_sample_002' LIMIT 1;
  SELECT id INTO user3_id FROM public.users WHERE clerk_id = 'user_sample_003' LIMIT 1;
  SELECT id INTO user4_id FROM public.users WHERE clerk_id = 'user_sample_004' LIMIT 1;

  -- 게시물 ID 조회 (created_at 기준으로 가져오기)
  SELECT id INTO post1_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 5;
  SELECT id INTO post2_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 4;
  SELECT id INTO post3_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 3;
  SELECT id INTO post4_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 2;
  SELECT id INTO post5_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 1;
  SELECT id INTO post6_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 0;

  -- 좋아요 추가
  INSERT INTO public.likes (post_id, user_id, created_at)
  VALUES
    (post1_id, user2_id, now() - INTERVAL '3 days'),
    (post1_id, user3_id, now() - INTERVAL '2 days'),
    (post2_id, user1_id, now() - INTERVAL '1 day'),
    (post2_id, user3_id, now() - INTERVAL '1 day'),
    (post3_id, user1_id, now() - INTERVAL '2 days'),
    (post3_id, user4_id, now() - INTERVAL '1 day'),
    (post4_id, user1_id, now() - INTERVAL '12 hours'),
    (post5_id, user2_id, now() - INTERVAL '1 day'),
    (post6_id, user1_id, now() - INTERVAL '5 hours'),
    (post6_id, user2_id, now() - INTERVAL '4 hours'),
    (post6_id, user3_id, now() - INTERVAL '3 hours')
  ON CONFLICT (post_id, user_id) DO NOTHING;
END $$;

-- 4. 샘플 댓글 추가
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  user4_id UUID;
  post1_id UUID;
  post2_id UUID;
  post3_id UUID;
  post4_id UUID;
  post5_id UUID;
  post6_id UUID;
BEGIN
  -- 사용자 ID 조회
  SELECT id INTO user1_id FROM public.users WHERE clerk_id = 'user_sample_001' LIMIT 1;
  SELECT id INTO user2_id FROM public.users WHERE clerk_id = 'user_sample_002' LIMIT 1;
  SELECT id INTO user3_id FROM public.users WHERE clerk_id = 'user_sample_003' LIMIT 1;
  SELECT id INTO user4_id FROM public.users WHERE clerk_id = 'user_sample_004' LIMIT 1;

  -- 게시물 ID 조회
  SELECT id INTO post1_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 5;
  SELECT id INTO post2_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 4;
  SELECT id INTO post3_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 3;
  SELECT id INTO post4_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 2;
  SELECT id INTO post5_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 1;
  SELECT id INTO post6_id FROM public.posts ORDER BY created_at DESC LIMIT 1 OFFSET 0;

  -- 댓글 추가
  INSERT INTO public.comments (post_id, user_id, content, created_at)
  VALUES
    (post1_id, user2_id, '정말 멋진 사진이네요!', now() - INTERVAL '3 days'),
    (post1_id, user3_id, '저도 가고 싶어요 😊', now() - INTERVAL '2 days'),
    (post2_id, user1_id, '좋아요!', now() - INTERVAL '1 day'),
    (post3_id, user4_id, '맛있어 보여요!', now() - INTERVAL '1 day'),
    (post4_id, user1_id, '주말 잘 보내셨나요?', now() - INTERVAL '12 hours'),
    (post5_id, user2_id, '무슨 책이에요?', now() - INTERVAL '1 day'),
    (post6_id, user1_id, '배고파요 😋', now() - INTERVAL '5 hours'),
    (post6_id, user3_id, '저도 먹고 싶어요!', now() - INTERVAL '4 hours')
  ON CONFLICT DO NOTHING;
END $$;
