-- Fix zero budget calculation issue
-- This script ensures that categories with zero budget show negative remaining balance when expenses exist

-- First, let's update all existing category summaries to recalculate correctly
-- This will fix any existing incorrect data

-- Update category summaries for all users and months
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
      -- Update all category summaries for this user and month
      PERFORM public.update_all_category_summaries(
        user_record.user_id,
        month_record.month_year
      );
    END LOOP;
  END LOOP;
END $$;

-- Also update monthly remaining balances
DO $$
DECLARE
  user_record RECORD;
  year_record RECORD;
BEGIN
  -- Loop through all users
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.monthly_remaining_balances
  LOOP
    -- Loop through all years for each user
    FOR year_record IN 
      SELECT DISTINCT year FROM public.monthly_remaining_balances WHERE user_id = user_record.user_id
    LOOP
      -- Update all monthly remaining balances for this user and year
      PERFORM public.update_all_monthly_remaining_balances(
        user_record.user_id,
        year_record.year
      );
    END LOOP;
  END LOOP;
END $$;

-- Verify the fix by showing some examples
-- This query will show categories with zero budget and their remaining balance
SELECT 
  cs.category_name,
  cs.total_budget,
  cs.total_spent,
  cs.remaining_balance,
  cs.month_year,
  CASE 
    WHEN cs.total_budget = 0 AND cs.total_spent > 0 THEN 'SHOULD BE NEGATIVE'
    WHEN cs.total_budget = 0 AND cs.total_spent = 0 THEN 'CORRECT (ZERO)'
    WHEN cs.total_budget > 0 THEN 'NORMAL BUDGET'
    ELSE 'OTHER'
  END as status
FROM public.category_summaries cs
WHERE cs.total_budget = 0
ORDER BY cs.total_spent DESC, cs.category_name;
