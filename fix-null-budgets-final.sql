-- Fix all NULL budget records in category_summaries
-- Convert NULL budgets to 0 and recalculate remaining_balance

-- Step 1: Update all records where total_budget is NULL
UPDATE public.category_summaries 
SET 
  total_budget = 0,
  remaining_balance = 0 - total_spent
WHERE total_budget IS NULL;

-- Step 2: Verify the fix for Cloud category specifically
SELECT 
  'Cloud Category After Fix' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Step 3: Show all zero-budget categories with expenses (should now show negative remaining balance)
SELECT 
  'Zero Budget Categories with Expenses' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year,
  CASE 
    WHEN total_budget = 0 AND total_spent > 0 THEN 'SHOULD BE NEGATIVE'
    WHEN total_budget = 0 AND total_spent = 0 THEN 'CORRECT (ZERO)'
    WHEN total_budget > 0 THEN 'NORMAL BUDGET'
    ELSE 'OTHER'
  END as status
FROM public.category_summaries
WHERE total_budget = 0
ORDER BY total_spent DESC, category_name;

-- Step 4: Count records after fix
SELECT 
  'Record Count After Fix' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_budget IS NULL THEN 1 END) as null_budget_count,
  COUNT(CASE WHEN total_budget = 0 THEN 1 END) as zero_budget_count,
  COUNT(CASE WHEN total_budget > 0 THEN 1 END) as positive_budget_count
FROM public.category_summaries;
