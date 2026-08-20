-- ============================================
-- OmniX Supabase Migrations (Idempotent)
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: user_github
-- Stores GitHub identity + access token for OAuth users
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_github (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  github_id bigint,
  login text,
  avatar_url text,
  access_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for user_github
ALTER TABLE public.user_github ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own github" ON public.user_github;
CREATE POLICY "Users can view own github" ON public.user_github
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own github" ON public.user_github;
CREATE POLICY "Users can insert own github" ON public.user_github
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own github" ON public.user_github;
CREATE POLICY "Users can update own github" ON public.user_github
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own github" ON public.user_github;
CREATE POLICY "Users can delete own github" ON public.user_github
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_github_user_id ON public.user_github(user_id);

-- ============================================
-- Table: imported_repos
-- Tracks repos user has imported from GitHub
-- ============================================
CREATE TABLE IF NOT EXISTS public.imported_repos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  html_url text,
  private boolean DEFAULT false,
  is_active boolean DEFAULT false,
  imported_at timestamptz DEFAULT now(),
  UNIQUE(user_id, full_name)
);

ALTER TABLE public.imported_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own repos" ON public.imported_repos;
CREATE POLICY "Users can view own repos" ON public.imported_repos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own repos" ON public.imported_repos;
CREATE POLICY "Users can insert own repos" ON public.imported_repos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own repos" ON public.imported_repos;
CREATE POLICY "Users can update own repos" ON public.imported_repos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own repos" ON public.imported_repos;
CREATE POLICY "Users can delete own repos" ON public.imported_repos
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_imported_repos_user_id ON public.imported_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_repos_active ON public.imported_repos(user_id, is_active);

-- ============================================
-- Table: chats
-- ============================================
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
CREATE POLICY "Users can view own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chats" ON public.chats;
CREATE POLICY "Users can insert own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
CREATE POLICY "Users can update own chats" ON public.chats
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;
CREATE POLICY "Users can delete own chats" ON public.chats
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chats_user_created ON public.chats(user_id, created_at DESC);

-- ============================================
-- Table: memory
-- ============================================
CREATE TABLE IF NOT EXISTS public.memory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fact text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memory" ON public.memory;
CREATE POLICY "Users can view own memory" ON public.memory
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own memory" ON public.memory;
CREATE POLICY "Users can insert own memory" ON public.memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own memory" ON public.memory;
CREATE POLICY "Users can delete own memory" ON public.memory
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_memory_user_id ON public.memory(user_id);

-- ============================================
-- Trigger: Auto-create user_github on GitHub OAuth
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_github_oauth()
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'provider' = 'github' THEN
    INSERT INTO public.user_github (user_id, github_id, login, avatar_url, access_token)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'sub')::bigint,
      COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'name'),
      NEW.raw_user_meta_data->>'avatar_url',
      ''
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_github_oauth ON auth.users;
CREATE TRIGGER on_github_oauth
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_github_oauth();
