-- Check the current state after running the fix script

-- 1. Check Cloud category specifically
SELECT 
  'Cloud Category Current State' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- 2. Check all zero-budget categories
SELECT 
  'Zero Budget Categories' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE total_budget = 0
ORDER BY total_spent DESC, category_name;

-- 3. Check if there are still any NULL budgets
SELECT 
  'Remaining NULL Budgets' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE total_budget IS NULL;

-- 4. Count current records
SELECT 
  'Current Record Count' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_budget IS NULL THEN 1 END) as null_budget_count,
  COUNT(CASE WHEN total_budget = 0 THEN 1 END) as zero_budget_count,
  COUNT(CASE WHEN total_budget > 0 THEN 1 END) as positive_budget_count
FROM public.category_summaries;
