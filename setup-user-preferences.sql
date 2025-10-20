-- Setup User Preferences Table
-- Run this script in your Supabase SQL Editor

-- Create the user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_past_months_budget BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for user_preferences table
CREATE POLICY IF NOT EXISTS "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create the get_user_preferences function
CREATE OR REPLACE FUNCTION public.get_user_preferences(target_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  enable_past_months_budget BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.enable_past_months_budget,
    up.created_at,
    up.updated_at
  FROM public.user_preferences up
  WHERE up.user_id = target_user_id;
  
  -- If no preferences exist, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      target_user_id,
      false, -- Default: past months budget disabled
      now(),
      now();
  END IF;
END;
$$;

-- Success message
SELECT 'User preferences table and function created successfully!' AS status;
