-- Fix the database function that's overwriting our manual fix
-- The issue is in the update_category_summary function

-- First, let's see the current function
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'update_category_summary' 
AND routine_schema = 'public';

-- Now let's fix the function to handle NULL budgets correctly
CREATE OR REPLACE FUNCTION public.update_category_summary(
  target_user_id UUID,
  target_category_id UUID,
  target_month_year TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  category_name TEXT;
  budget_amount DECIMAL(10,2);
  spent_amount DECIMAL(10,2);
  remaining_balance DECIMAL(10,2);
  month_start DATE;
  month_end DATE;
BEGIN
  -- Get category name
  SELECT name INTO category_name
  FROM public.categories
  WHERE id = target_category_id AND user_id = target_user_id;
  
  -- Calculate month start and end dates
  month_start := (target_month_year || '-01')::DATE;
  month_end := (month_start + INTERVAL '1 month')::DATE;
  
  -- Get budget amount for this month - FIXED: Always return 0 if no budget exists
  SELECT COALESCE(amount, 0) INTO budget_amount
  FROM public.budgets
  WHERE user_id = target_user_id 
    AND category_id = target_category_id 
    AND month_year = target_month_year;
  
  -- CRITICAL FIX: If no budget record exists at all, set to 0
  IF budget_amount IS NULL THEN
    budget_amount := 0;
  END IF;
  
  -- Get total spent this month
  SELECT COALESCE(SUM(amount), 0) INTO spent_amount
  FROM public.expenses
  WHERE user_id = target_user_id 
    AND category = category_name
    AND date >= month_start
    AND date < month_end;
  
  -- Calculate remaining balance - FIXED: Always calculate even for zero budget
  remaining_balance := budget_amount - spent_amount;
  
  -- Insert or update the category summary
  INSERT INTO public.category_summaries (
    user_id,
    category_id,
    category_name,
    month_year,
    total_budget,
    total_spent,
    remaining_balance
  )
  VALUES (
    target_user_id,
    target_category_id,
    category_name,
    target_month_year,
    budget_amount,
    spent_amount,
    remaining_balance
  )
  ON CONFLICT (user_id, category_id, month_year) 
  DO UPDATE SET
    category_name = EXCLUDED.category_name,
    total_budget = EXCLUDED.total_budget,
    total_spent = EXCLUDED.total_spent,
    remaining_balance = EXCLUDED.remaining_balance,
    updated_at = now();
    
  -- Debug output
  RAISE NOTICE 'Updated category %: budget=%, spent=%, remaining=%', 
    category_name, budget_amount, spent_amount, remaining_balance;
END;
$$;

-- Test the fixed function on Cloud category
DO $$
DECLARE
  cloud_category_id UUID;
BEGIN
  -- Get Cloud category ID
  SELECT id INTO cloud_category_id
  FROM public.categories
  WHERE name = 'Cloud'
  LIMIT 1;
  
  IF cloud_category_id IS NOT NULL THEN
    -- Call the fixed function
    PERFORM public.update_category_summary(
      (SELECT user_id FROM public.categories WHERE id = cloud_category_id LIMIT 1),
      cloud_category_id,
      '2025-09'
    );
  END IF;
END $$;

-- Verify the fix
SELECT 
  'After Function Fix' as status,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';
