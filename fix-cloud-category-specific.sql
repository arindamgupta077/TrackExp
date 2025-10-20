-- Specific fix for Cloud category that's still showing null

-- Step 1: Check the exact Cloud category record
SELECT 
  'Cloud Category Details' as status,
  id,
  user_id,
  category_id,
  category_name,
  month_year,
  total_budget,
  total_spent,
  remaining_balance,
  created_at,
  updated_at
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 2: Try to update Cloud category with explicit values
UPDATE public.category_summaries 
SET 
  total_budget = 0,
  remaining_balance = -450.00,
  updated_at = now()
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 3: Verify the update
SELECT 
  'Cloud After Explicit Update' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 4: If that doesn't work, try deleting and recreating the record
-- First, let's see what user_id and category_id we need
SELECT 
  'Cloud Category Info' as status,
  c.id as category_id,
  c.user_id,
  c.name as category_name
FROM public.categories c
WHERE c.name = 'Cloud';

-- Step 5: Delete the problematic Cloud record and recreate it
DELETE FROM public.category_summaries 
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 6: Recreate the Cloud record with correct values
INSERT INTO public.category_summaries (
  user_id,
  category_id,
  category_name,
  month_year,
  total_budget,
  total_spent,
  remaining_balance
)
SELECT 
  c.user_id,
  c.id,
  'Cloud',
  '2025-09',
  0,
  450.00,
  -450.00
FROM public.categories c
WHERE c.name = 'Cloud';

-- Step 7: Final verification
SELECT 
  'Cloud Final Check' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';
