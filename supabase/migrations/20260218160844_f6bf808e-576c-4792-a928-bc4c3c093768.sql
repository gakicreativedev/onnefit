
-- Add tags column to posts for content categorization
ALTER TABLE public.posts ADD COLUMN tags text[] DEFAULT '{}'::text[];

-- Create index for tag search performance
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);

-- Create index for content text search
CREATE INDEX idx_posts_content_search ON public.posts USING GIN(to_tsvector('portuguese', COALESCE(content, '')));
