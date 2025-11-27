-- Run this SQL in your Supabase SQL Editor to fix the database schema
-- Go to: https://supabase.com/dashboard/project/jduqwyfrlkokajykyudt/sql/new

-- 1. Add missing columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS shared boolean DEFAULT false;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

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

-- 4. Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;
