-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6b7280',
  icon text DEFAULT 'folder',
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Add folder_id to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

-- Add suggested_tags to documents table for AI auto-tagging
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS suggested_tags text[] DEFAULT '{}';

-- Enable RLS on folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Users can view their own folders"
ON public.folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
ON public.folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.folders FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON public.documents(folder_id);

-- Create default folders for existing users (optional - run manually if needed)
-- INSERT INTO public.folders (user_id, name, color, icon)
-- SELECT DISTINCT user_id, 'Bills', '#ef4444', 'receipt' FROM public.documents
-- UNION
-- SELECT DISTINCT user_id, 'Medical', '#10b981', 'heart-pulse' FROM public.documents
-- UNION
-- SELECT DISTINCT user_id, 'Legal', '#8b5cf6', 'scale' FROM public.documents
-- UNION
-- SELECT DISTINCT user_id, 'Personal', '#3b82f6', 'user' FROM public.documents;
