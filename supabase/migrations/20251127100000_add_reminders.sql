-- Create reminders table for deadline tracking
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  reminder_date timestamp with time zone,
  type text DEFAULT 'deadline', -- 'deadline', 'renewal', 'payment', 'appointment', 'custom'
  priority text DEFAULT 'medium', -- 'high', 'medium', 'low'
  status text DEFAULT 'pending', -- 'pending', 'completed', 'dismissed', 'overdue'
  notified boolean DEFAULT false,
  recurring text, -- 'daily', 'weekly', 'monthly', 'yearly', null for one-time
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Add deadlines field to documents for AI-detected dates
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS detected_deadlines jsonb DEFAULT '[]';

-- Enable RLS on reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reminders
CREATE POLICY "Users can view their own reminders"
ON public.reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
ON public.reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
ON public.reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
ON public.reminders FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_document_id ON public.reminders(document_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_notified ON public.reminders(notified);

-- Function to auto-update reminder status to 'overdue'
CREATE OR REPLACE FUNCTION update_overdue_reminders()
RETURNS void AS $$
BEGIN
  UPDATE public.reminders
  SET status = 'overdue', updated_at = now()
  WHERE status = 'pending' 
    AND due_date < now();
END;
$$ LANGUAGE plpgsql;
