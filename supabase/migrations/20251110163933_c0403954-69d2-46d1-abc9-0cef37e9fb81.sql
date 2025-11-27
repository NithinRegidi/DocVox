-- Add sharing columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS shared boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Create index for faster share token lookups
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON public.documents(share_token);

-- Create RLS policy for public access to shared documents
CREATE POLICY "Anyone can view shared documents"
ON public.documents
FOR SELECT
USING (shared = true AND share_token IS NOT NULL);