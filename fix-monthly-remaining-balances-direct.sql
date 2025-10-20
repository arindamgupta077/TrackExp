-- Direct fix for monthly remaining balances - handle NULL values

-- Step 1: Update Cloud category specifically in monthly remaining balances
UPDATE public.monthly_remaining_balances 
SET 
  september = -450.00,
  updated_at = now()
WHERE category_id = (
  SELECT id FROM public.categories WHERE name = 'Cloud'
) AND year = 2025;

-- Step 2: Verify Cloud category fix
SELECT 
  'Cloud After Direct Update' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE c.name = 'Cloud' AND mrb.year = 2025;

-- Step 3: Update all NULL values in monthly remaining balances to 0
-- First, let's see how many NULL values we have
SELECT 
  'NULL Values Count' as status,
  COUNT(*) as null_count
FROM public.monthly_remaining_balances
WHERE year = 2025 
  AND (january IS NULL OR february IS NULL OR march IS NULL OR april IS NULL 
       OR may IS NULL OR june IS NULL OR july IS NULL OR august IS NULL 
       OR september IS NULL OR october IS NULL OR november IS NULL OR december IS NULL);

-- Step 4: Update all NULL values to 0
UPDATE public.monthly_remaining_balances 
SET 
  january = COALESCE(january, 0),
  february = COALESCE(february, 0),
  march = COALESCE(march, 0),
  april = COALESCE(april, 0),
  may = COALESCE(may, 0),
  june = COALESCE(june, 0),
  july = COALESCE(july, 0),
  august = COALESCE(august, 0),
  september = COALESCE(september, 0),
  october = COALESCE(october, 0),
  november = COALESCE(november, 0),
  december = COALESCE(december, 0),
  updated_at = now()
WHERE year = 2025;

-- Step 5: Now recalculate all monthly remaining balances using the fixed function
-- First, let's make sure the function is fixed
CREATE OR REPLACE FUNCTION public.update_monthly_remaining_balance(
  target_user_id UUID,
  target_category_id UUID,
  target_year INTEGER,
  target_month INTEGER
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
  month_year_str TEXT;
BEGIN
  -- Get category name
  SELECT name INTO category_name
  FROM public.categories
  WHERE id = target_category_id AND user_id = target_user_id;
  
  -- Create month_year string for budget lookup
  month_year_str := target_year || '-' || LPAD(target_month::TEXT, 2, '0');
  
  -- Calculate month start and end dates
  month_start := (month_year_str || '-01')::DATE;
  month_end := (month_start + INTERVAL '1 month')::DATE;
  
  -- Get budget amount for this month - FIXED: Always return 0 if no budget exists
  SELECT COALESCE(amount, 0) INTO budget_amount
  FROM public.budgets
  WHERE user_id = target_user_id 
    AND category_id = target_category_id 
    AND month_year = month_year_str;
  
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
  
  -- Insert or update the remaining balance
  INSERT INTO public.monthly_remaining_balances (
    user_id, 
    category_id, 
    year,
    january, february, march, april, may, june,
    july, august, september, october, november, december
  )
  VALUES (
    target_user_id,
    target_category_id,
    target_year,
    CASE WHEN target_month = 1 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 2 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 3 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 4 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 5 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 6 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 7 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 8 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 9 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 10 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 11 THEN remaining_balance ELSE 0 END,
    CASE WHEN target_month = 12 THEN remaining_balance ELSE 0 END
  )
  ON CONFLICT (user_id, category_id, year) 
  DO UPDATE SET
    january = CASE WHEN target_month = 1 THEN remaining_balance ELSE monthly_remaining_balances.january END,
    february = CASE WHEN target_month = 2 THEN remaining_balance ELSE monthly_remaining_balances.february END,
    march = CASE WHEN target_month = 3 THEN remaining_balance ELSE monthly_remaining_balances.march END,
    april = CASE WHEN target_month = 4 THEN remaining_balance ELSE monthly_remaining_balances.april END,
    may = CASE WHEN target_month = 5 THEN remaining_balance ELSE monthly_remaining_balances.may END,
    june = CASE WHEN target_month = 6 THEN remaining_balance ELSE monthly_remaining_balances.june END,
    july = CASE WHEN target_month = 7 THEN remaining_balance ELSE monthly_remaining_balances.july END,
    august = CASE WHEN target_month = 8 THEN remaining_balance ELSE monthly_remaining_balances.august END,
    september = CASE WHEN target_month = 9 THEN remaining_balance ELSE monthly_remaining_balances.september END,
    october = CASE WHEN target_month = 10 THEN remaining_balance ELSE monthly_remaining_balances.october END,
    november = CASE WHEN target_month = 11 THEN remaining_balance ELSE monthly_remaining_balances.november END,
    december = CASE WHEN target_month = 12 THEN remaining_balance ELSE monthly_remaining_balances.december END,
    updated_at = now();
    
  -- Debug output
  RAISE NOTICE 'Updated monthly balance for % in %: budget=%, spent=%, remaining=%', 
    category_name, month_year_str, budget_amount, spent_amount, remaining_balance;
END;
$$;

-- Step 6: Recalculate all monthly remaining balances for 2025
DO $$
DECLARE
  user_record RECORD;
  category_record RECORD;
  month_num INTEGER;
BEGIN
  -- Loop through all users
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.monthly_remaining_balances WHERE year = 2025
  LOOP
    -- Loop through all categories for each user
    FOR category_record IN 
      SELECT id FROM public.categories WHERE user_id = user_record.user_id
    LOOP
      -- Update each month (1-12)
      FOR month_num IN 1..12 LOOP
        PERFORM public.update_monthly_remaining_balance(
          user_record.user_id,
          category_record.id,
          2025,
          month_num
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Step 7: Final verification - check Cloud category
SELECT 
  'Final Cloud Check' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE c.name = 'Cloud' AND mrb.year = 2025;

-- Step 8: Show all zero-budget categories with negative remaining balances
SELECT 
  'Zero Budget Categories with Negative Balances' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE mrb.year = 2025 
  AND mrb.september < 0
ORDER BY mrb.september ASC;
