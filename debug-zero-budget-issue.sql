-- Debug and fix zero budget calculation issue
-- Let's first check what's actually in the database

-- 1. Check current data for Cloud category
SELECT 
  'Current Cloud Category Data' as check_type,
  cs.category_name,
  cs.total_budget,
  cs.total_spent,
  cs.remaining_balance,
  cs.month_year
FROM public.category_summaries cs
WHERE cs.category_name = 'Cloud'
ORDER BY cs.month_year DESC;

-- 2. Check if there are any expenses for Cloud category
SELECT 
  'Cloud Expenses' as check_type,
  COUNT(*) as expense_count,
  SUM(amount) as total_spent,
  MIN(date) as first_expense,
  MAX(date) as last_expense
FROM public.expenses
WHERE category = 'Cloud';

-- 3. Check if there's a budget record for Cloud category
SELECT 
  'Cloud Budget Records' as check_type,
  b.amount as budget_amount,
  b.month_year,
  c.name as category_name
FROM public.budgets b
JOIN public.categories c ON b.category_id = c.id
WHERE c.name = 'Cloud'
ORDER BY b.month_year DESC;

-- 4. Manually recalculate what the remaining balance should be
SELECT 
  'Manual Calculation' as check_type,
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

-- 5. Force update the Cloud category summary for September 2025
DO $$
DECLARE
  cloud_category_id UUID;
  budget_amount DECIMAL(10,2);
  spent_amount DECIMAL(10,2);
  remaining_balance DECIMAL(10,2);
BEGIN
  -- Get Cloud category ID
  SELECT id INTO cloud_category_id
  FROM public.categories
  WHERE name = 'Cloud'
  LIMIT 1;
  
  IF cloud_category_id IS NOT NULL THEN
    -- Get budget amount for September 2025
    SELECT COALESCE(amount, 0) INTO budget_amount
    FROM public.budgets
    WHERE category_id = cloud_category_id 
      AND month_year = '2025-09';
    
    -- Get total spent in September 2025
    SELECT COALESCE(SUM(amount), 0) INTO spent_amount
    FROM public.expenses
    WHERE category = 'Cloud'
      AND date >= '2025-09-01'
      AND date < '2025-10-01';
    
    -- Calculate remaining balance
    remaining_balance := budget_amount - spent_amount;
    
    -- Update the category summary
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
      cloud_category_id,
      'Cloud',
      '2025-09',
      budget_amount,
      spent_amount,
      remaining_balance
    FROM public.categories c
    WHERE c.id = cloud_category_id
    ON CONFLICT (user_id, category_id, month_year) 
    DO UPDATE SET
      category_name = EXCLUDED.category_name,
      total_budget = EXCLUDED.total_budget,
      total_spent = EXCLUDED.total_spent,
      remaining_balance = EXCLUDED.remaining_balance,
      updated_at = now();
    
    RAISE NOTICE 'Updated Cloud category: Budget=%, Spent=%, Remaining=%', 
      budget_amount, spent_amount, remaining_balance;
  ELSE
    RAISE NOTICE 'Cloud category not found';
  END IF;
END $$;

-- 6. Verify the fix
SELECT 
  'After Fix - Cloud Category' as check_type,
  cs.category_name,
  cs.total_budget,
  cs.total_spent,
  cs.remaining_balance,
  cs.month_year
FROM public.category_summaries cs
WHERE cs.category_name = 'Cloud' AND cs.month_year = '2025-09';
