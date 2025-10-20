-- Check the current state of monthly remaining balances for zero budget categories

-- 1. Check Cloud category in monthly remaining balances
SELECT 
  'Cloud Category in Monthly Remaining Balances' as check_type,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE c.name = 'Cloud' AND mrb.year = 2025;

-- 2. Check all categories with zero or null remaining balances in September
SELECT 
  'Categories with Zero/Null September Balance' as check_type,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE mrb.year = 2025 
  AND (mrb.september = 0 OR mrb.september IS NULL)
ORDER BY c.name;

-- 3. Check if there are any negative balances in September
SELECT 
  'Categories with Negative September Balance' as check_type,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE mrb.year = 2025 
  AND mrb.september < 0
ORDER BY mrb.september ASC;

-- 4. Check what the actual expenses are for Cloud category in September 2025
SELECT 
  'Cloud Expenses in September 2025' as check_type,
  COUNT(*) as expense_count,
  SUM(amount) as total_spent
FROM public.expenses
WHERE category = 'Cloud'
  AND date >= '2025-09-01'
  AND date < '2025-10-01';

-- 5. Check if there's a budget record for Cloud in September 2025
SELECT 
  'Cloud Budget in September 2025' as check_type,
  b.amount as budget_amount,
  b.month_year,
  c.name as category_name
FROM public.budgets b
JOIN public.categories c ON b.category_id = c.id
WHERE c.name = 'Cloud' AND b.month_year = '2025-09';

-- 6. Manual calculation for Cloud category
SELECT 
  'Manual Calculation for Cloud' as check_type,
  'Cloud' as category_name,
  COALESCE(b.amount, 0) as budget_amount,
  COALESCE(SUM(e.amount), 0) as total_spent,
  COALESCE(b.amount, 0) - COALESCE(SUM(e.amount), 0) as calculated_remaining_balance
FROM public.categories c
LEFT JOIN public.budgets b ON c.id = b.category_id AND b.month_year = '2025-09'
LEFT JOIN public.expenses e ON e.category = c.name 
  AND e.date >= '2025-09-01' 
  AND e.date < '2025-10-01'
WHERE c.name = 'Cloud'
GROUP BY c.id, c.name, b.amount, b.month_year;
