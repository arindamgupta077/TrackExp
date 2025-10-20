-- Create table for storing user's unassigned credit for each month
CREATE TABLE IF NOT EXISTS public.monthly_unassigned_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  unassigned_credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per month
  UNIQUE(user_id, year, month)
);

-- Enable Row Level Security
ALTER TABLE public.monthly_unassigned_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_unassigned_credits table
CREATE POLICY "Users can view their own monthly unassigned credits" 
ON public.monthly_unassigned_credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly unassigned credits" 
ON public.monthly_unassigned_credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly unassigned credits" 
ON public.monthly_unassigned_credits 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly unassigned credits" 
ON public.monthly_unassigned_credits 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_unassigned_credits_updated_at
  BEFORE UPDATE ON public.monthly_unassigned_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_unassigned_credits_user_year_month 
ON public.monthly_unassigned_credits(user_id, year, month);

-- Add comments to document the purpose
COMMENT ON TABLE public.monthly_unassigned_credits IS 'Stores monthly unassigned credit amounts for each user';
COMMENT ON COLUMN public.monthly_unassigned_credits.user_id IS 'Reference to the user who owns this record';
COMMENT ON COLUMN public.monthly_unassigned_credits.year IS 'Year for the unassigned credit record';
COMMENT ON COLUMN public.monthly_unassigned_credits.month IS 'Month for the unassigned credit record (1-12)';
COMMENT ON COLUMN public.monthly_unassigned_credits.unassigned_credit_amount IS 'Amount of unassigned credit for this month';
