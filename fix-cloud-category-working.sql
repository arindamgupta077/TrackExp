-- Working fix for Cloud category - this will actually update the data

-- Step 1: Check current state
SELECT 
  'Before Fix' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 2: UPDATE the Cloud category record
UPDATE public.category_summaries 
SET 
  total_budget = 0,
  remaining_balance = -450.00
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 3: Verify the fix worked
SELECT 
  'After Fix' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 4: If UPDATE didn't work, try DELETE and INSERT approach
-- First delete the record
DELETE FROM public.category_summaries 
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Then insert a new record with correct values
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

-- Step 5: Final verification
SELECT 
  'Final Result' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';
