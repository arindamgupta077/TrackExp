-- Fix the null budget issue in category_summaries
-- The problem is that when no budget exists, total_budget becomes null instead of 0

-- First, let's fix the existing data
UPDATE public.category_summaries 
SET 
  total_budget = 0,
  remaining_balance = 0 - total_spent
WHERE total_budget IS NULL AND total_spent > 0;

-- Verify the fix for Cloud category
SELECT 
  'After Fix - Cloud Category' as test_name,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Now let's fix the database function to prevent this in the future
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
  
  -- Get budget amount for this month - FIXED: Use COALESCE to ensure 0 instead of null
  SELECT COALESCE(amount, 0) INTO budget_amount
  FROM public.budgets
  WHERE user_id = target_user_id 
    AND category_id = target_category_id 
    AND month_year = target_month_year;
  
  -- If no budget record exists, set to 0
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
  
  -- Calculate remaining balance - FIXED: Ensure we always get a number
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
END;
$$;

-- Now let's update all category summaries to use the fixed function
DO $$
DECLARE
  user_record RECORD;
  month_record RECORD;
BEGIN
  -- Loop through all users
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.category_summaries
  LOOP
    -- Loop through all months for each user
    FOR month_record IN 
      SELECT DISTINCT month_year FROM public.category_summaries WHERE user_id = user_record.user_id
    LOOP
      -- Update all category summaries for this user and month using the fixed function
      PERFORM public.update_all_category_summaries(
        user_record.user_id,
        month_record.month_year
      );
    END LOOP;
  END LOOP;
END $$;

-- Final verification
SELECT 
  'Final Verification - Cloud Category' as test_name,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';

-- Show all zero-budget categories to verify they now show negative remaining balance
SELECT 
  'All Zero Budget Categories' as test_name,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE total_budget = 0 AND total_spent > 0
ORDER BY total_spent DESC;
