-- Direct fix for NULL budgets - more explicit approach

-- Step 1: First, let's see exactly what we're dealing with
SELECT 
  'Before Fix - Cloud Category' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 2: Update Cloud category specifically first
UPDATE public.category_summaries 
SET 
  total_budget = 0,
  remaining_balance = 0 - total_spent
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 3: Verify Cloud category fix
SELECT 
  'After Cloud Fix' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 4: Update all other NULL budget records
UPDATE public.category_summaries 
SET 
  total_budget = 0,
  remaining_balance = 0 - total_spent
WHERE total_budget IS NULL;

-- Step 5: Final verification - check Cloud category again
SELECT 
  'Final Cloud Check' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 6: Show all zero-budget categories with expenses
SELECT 
  'Zero Budget Categories with Expenses' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE total_budget = 0 AND total_spent > 0
ORDER BY total_spent DESC, category_name;

-- Step 7: Count final records
SELECT 
  'Final Record Count' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_budget IS NULL THEN 1 END) as null_budget_count,
  COUNT(CASE WHEN total_budget = 0 THEN 1 END) as zero_budget_count,
  COUNT(CASE WHEN total_budget > 0 THEN 1 END) as positive_budget_count
FROM public.category_summaries;
