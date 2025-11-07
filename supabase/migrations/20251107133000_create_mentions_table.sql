CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts (id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments (id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  mentioner_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  display_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CHECK (
    (post_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_id ON public.mentions (mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON public.mentions (post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_comment_id ON public.mentions (comment_id);
