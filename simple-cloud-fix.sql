-- Simple direct fix for Cloud category

-- Step 1: Check current Cloud category
SELECT 
  'Current Cloud' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 2: Simple update - just set the values directly
UPDATE public.category_summaries 
SET 
  total_budget = 0,
  remaining_balance = -450
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 3: Check if it worked
SELECT 
  'After Update' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';
