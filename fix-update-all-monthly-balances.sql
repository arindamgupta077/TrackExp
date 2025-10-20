-- Fix the update_all_monthly_remaining_balances function that's overwriting our manual fix

-- First, let's see the current function
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'update_all_monthly_remaining_balances' 
AND routine_schema = 'public';

-- Now let's fix the function to use the corrected update_monthly_remaining_balance function
CREATE OR REPLACE FUNCTION public.update_all_monthly_remaining_balances(
  target_user_id UUID,
  target_year INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  category_record RECORD;
  month_num INTEGER;
BEGIN
  -- Loop through all categories for the user
  FOR category_record IN 
    SELECT id FROM public.categories WHERE user_id = target_user_id
  LOOP
    -- Update each month (1-12) using the fixed function
    FOR month_num IN 1..12 LOOP
      PERFORM public.update_monthly_remaining_balance(
        target_user_id,
        category_record.id,
        target_year,
        month_num
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Updated all monthly remaining balances for user % and year %', target_user_id, target_year;
END;
$$;

-- Test the fixed function on Cloud category
DO $$
DECLARE
  cloud_user_id UUID;
BEGIN
  -- Get Cloud user ID
  SELECT user_id INTO cloud_user_id
  FROM public.categories
  WHERE name = 'Cloud'
  LIMIT 1;
  
  IF cloud_user_id IS NOT NULL THEN
    -- Call the fixed function
    PERFORM public.update_all_monthly_remaining_balances(
      cloud_user_id,
      2025
    );
    
    RAISE NOTICE 'Fixed function called for Cloud user';
  ELSE
    RAISE NOTICE 'Cloud user not found';
  END IF;
END $$;

-- Verify the fix
SELECT 
  'After Fixed Function Call' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE c.name = 'Cloud' AND mrb.year = 2025;

-- Also fix the get_user_monthly_remaining_balances function to ensure it returns correct data
CREATE OR REPLACE FUNCTION public.get_user_monthly_remaining_balances(
  target_user_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  category_name TEXT,
  january DECIMAL(10,2),
  february DECIMAL(10,2),
  march DECIMAL(10,2),
  april DECIMAL(10,2),
  may DECIMAL(10,2),
  june DECIMAL(10,2),
  july DECIMAL(10,2),
  august DECIMAL(10,2),
  september DECIMAL(10,2),
  october DECIMAL(10,2),
  november DECIMAL(10,2),
  december DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name as category_name,
    COALESCE(mrb.january, 0) as january,
    COALESCE(mrb.february, 0) as february,
    COALESCE(mrb.march, 0) as march,
    COALESCE(mrb.april, 0) as april,
    COALESCE(mrb.may, 0) as may,
    COALESCE(mrb.june, 0) as june,
    COALESCE(mrb.july, 0) as july,
    COALESCE(mrb.august, 0) as august,
    COALESCE(mrb.september, 0) as september,
    COALESCE(mrb.october, 0) as october,
    COALESCE(mrb.november, 0) as november,
    COALESCE(mrb.december, 0) as december
  FROM public.categories c
  LEFT JOIN public.monthly_remaining_balances mrb ON c.id = mrb.category_id AND mrb.year = target_year
  WHERE c.user_id = target_user_id
  ORDER BY c.name;
END;
$$;

-- Test the get function
SELECT 
  'Get Function Test - Cloud' as status,
  category_name,
  september
FROM public.get_user_monthly_remaining_balances(
  (SELECT user_id FROM public.categories WHERE name = 'Cloud' LIMIT 1),
  2025
)
WHERE category_name = 'Cloud';

-- Final verification
SELECT 
  'Final Verification' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE c.name = 'Cloud' AND mrb.year = 2025;
