-- Diagnose what's actually in the category_summaries table

-- 1. Check all records in category_summaries table
SELECT 
  'All Category Summaries' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year,
  CASE 
    WHEN total_budget IS NULL THEN 'NULL BUDGET'
    WHEN total_budget = 0 THEN 'ZERO BUDGET'
    WHEN total_budget > 0 THEN 'POSITIVE BUDGET'
    ELSE 'OTHER'
  END as budget_status
FROM public.category_summaries
ORDER BY category_name, month_year;

-- 2. Check specifically for Cloud category
SELECT 
  'Cloud Category Only' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud'
ORDER BY month_year DESC;

-- 3. Check for any records with null budgets
SELECT 
  'NULL Budget Records' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE total_budget IS NULL
ORDER BY category_name, month_year;

-- 4. Check for any records with zero budgets
SELECT 
  'Zero Budget Records' as check_type,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE total_budget = 0
ORDER BY category_name, month_year;

-- 5. Count total records
SELECT 
  'Record Count' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_budget IS NULL THEN 1 END) as null_budget_count,
  COUNT(CASE WHEN total_budget = 0 THEN 1 END) as zero_budget_count,
  COUNT(CASE WHEN total_budget > 0 THEN 1 END) as positive_budget_count
FROM public.category_summaries;
