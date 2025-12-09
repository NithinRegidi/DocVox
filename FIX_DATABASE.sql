-- Run this SQL in your Supabase SQL Editor to fix the database schema
-- Go to: https://supabase.com/dashboard/project/jduqwyfrlkokajykyudt/sql/new

-- 1. Add missing columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS shared boolean DEFAULT false;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS folder_id uuid;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS suggested_tags text[];

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS detected_deadlines jsonb DEFAULT '[]';

-- 2. Create index for faster share token lookups
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON public.documents(share_token);

-- 3. Make sure RLS policy for shared documents exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'documents' 
        AND policyname = 'Anyone can view shared documents'
    ) THEN
        CREATE POLICY "Anyone can view shared documents"
        ON public.documents
        FOR SELECT
        USING (shared = true AND share_token IS NOT NULL);
    END IF;
END $$;

-- =====================================================
-- 4. CREATE TAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can view their own tags') THEN
        CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can create their own tags') THEN
        CREATE POLICY "Users can create their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can update their own tags') THEN
        CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users can delete their own tags') THEN
        CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Unique constraint for tags
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON public.tags(user_id, name);

-- =====================================================
-- 5. CREATE DOCUMENT_TAGS TABLE (many-to-many relationship)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(document_id, tag_id)
);

-- Enable RLS on document_tags
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_tags
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_tags' AND policyname = 'Users can view document tags for their documents') THEN
        CREATE POLICY "Users can view document tags for their documents" ON public.document_tags FOR SELECT
        USING (EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_tags.document_id AND documents.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_tags' AND policyname = 'Users can create document tags for their documents') THEN
        CREATE POLICY "Users can create document tags for their documents" ON public.document_tags FOR INSERT
        WITH CHECK (EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_tags.document_id AND documents.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_tags' AND policyname = 'Users can delete document tags for their documents') THEN
        CREATE POLICY "Users can delete document tags for their documents" ON public.document_tags FOR DELETE
        USING (EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_tags.document_id AND documents.user_id = auth.uid()));
    END IF;
END $$;

-- Create indexes for document_tags
CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON public.document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON public.document_tags(tag_id);

-- =====================================================
-- 6. CREATE FOLDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'folder',
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can view their own folders') THEN
        CREATE POLICY "Users can view their own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can create their own folders') THEN
        CREATE POLICY "Users can create their own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can update their own folders') THEN
        CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Users can delete their own folders') THEN
        CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create indexes for folders
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_user_name ON public.folders(user_id, name);

-- Add foreign key for documents.folder_id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_folder_id_fkey'
    ) THEN
        ALTER TABLE public.documents 
        ADD CONSTRAINT documents_folder_id_fkey 
        FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 7. CREATE REMINDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  reminder_date timestamp with time zone,
  type text DEFAULT 'deadline',
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  notified boolean DEFAULT false,
  recurring text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reminders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND policyname = 'Users can view their own reminders') THEN
        CREATE POLICY "Users can view their own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND policyname = 'Users can create their own reminders') THEN
        CREATE POLICY "Users can create their own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND policyname = 'Users can update their own reminders') THEN
        CREATE POLICY "Users can update their own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND policyname = 'Users can delete their own reminders') THEN
        CREATE POLICY "Users can delete their own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create indexes for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_document_id ON public.reminders(document_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);

-- =====================================================
-- 8. Verify all tables exist
-- =====================================================
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('documents', 'tags', 'document_tags', 'folders', 'reminders')
ORDER BY table_name;
