-- Add ai_analysis column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.documents.ai_analysis IS 'AI-generated analysis of the document including summary, key information, and suggested actions';
