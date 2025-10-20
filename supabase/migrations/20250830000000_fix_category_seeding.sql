-- Fix category seeding issue by adding user preference flag
-- and modifying the seeding function to respect user choices

-- Add a column to track if user has explicitly chosen to not use default categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_default_category BOOLEAN DEFAULT false;

-- Update existing default categories to mark them as default
UPDATE public.categories 
SET is_default_category = true 
WHERE name IN ('Food', 'Transportation', 'Shopping', 'Entertainment', 'Health', 'Travel', 'Education', 'Other');

-- Create a user preferences table to track seeding preferences
CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  skip_default_categories boolean default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for user preferences
CREATE POLICY "Users can view own category preferences"
  ON public.user_category_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category preferences"
  ON public.user_category_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category preferences"
  ON public.user_category_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to set user preference to skip default categories
CREATE OR REPLACE FUNCTION public.set_skip_default_categories(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_category_preferences (user_id, skip_default_categories)
  VALUES (user_uuid, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    skip_default_categories = true,
    updated_at = now();
END;
$$;

-- Function to reset user preference (allow default categories again)
CREATE OR REPLACE FUNCTION public.reset_skip_default_categories(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_category_preferences (user_id, skip_default_categories)
  VALUES (user_uuid, false)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    skip_default_categories = false,
    updated_at = now();
END;
$$;

-- Modify the existing seeding function to respect user preferences
CREATE OR REPLACE FUNCTION public.seed_default_categories_for_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  skip_defaults boolean;
BEGIN
  -- Check if user has chosen to skip default categories
  SELECT COALESCE(skip_default_categories, false) INTO skip_defaults
  FROM public.user_category_preferences
  WHERE user_id = target_user_id;
  
  -- Only seed if user hasn't chosen to skip defaults
  IF NOT skip_defaults THEN
    INSERT INTO public.categories (user_id, name, is_default_category)
    SELECT target_user_id, n, true
    FROM unnest(array[
      'Food',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Health',
      'Travel',
      'Education',
      'Other'
    ]) as n
    ON CONFLICT (user_id, name) DO NOTHING;
  END IF;
END;
$$;

-- Function to remove all default categories for a user
CREATE OR REPLACE FUNCTION public.remove_default_categories_for_user(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all default categories for the user
  DELETE FROM public.categories 
  WHERE user_id = user_uuid AND is_default_category = true;
  
  -- Set preference to skip defaults
  PERFORM public.set_skip_default_categories(user_uuid);
END;
$$;

-- Update the trigger function to be more selective
CREATE OR REPLACE FUNCTION public.handle_profile_insert_seed_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only seed if user doesn't have a preference set
  IF NOT EXISTS (
    SELECT 1 FROM public.user_category_preferences 
    WHERE user_id = new.user_id
  ) THEN
    PERFORM public.seed_default_categories_for_user(new.user_id);
  END IF;
  RETURN new;
END;
$$;
