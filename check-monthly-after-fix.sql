-- Check the current state after running the fix script

-- 1. Check Cloud category specifically
SELECT 
  'Cloud Category Current State' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE c.name = 'Cloud' AND mrb.year = 2025;

-- 2. Check if there are still any NULL values
SELECT 
  'NULL Values in Monthly Remaining Balances' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE mrb.year = 2025 
  AND mrb.september IS NULL
ORDER BY c.name;

-- 3. Check all zero-budget categories with expenses that should show negative
SELECT 
  'Zero Budget Categories with Expenses' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE mrb.year = 2025 
  AND mrb.september = 0
ORDER BY c.name;

-- 4. Check if there are any negative balances
SELECT 
  'Categories with Negative Balances' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE mrb.year = 2025 
  AND mrb.september < 0
ORDER BY mrb.september ASC;

-- 5. Test the function manually for Cloud category
DO $$
DECLARE
  cloud_category_id UUID;
  cloud_user_id UUID;
BEGIN
  -- Get Cloud category ID and user ID
  SELECT id, user_id INTO cloud_category_id, cloud_user_id
  FROM public.categories
  WHERE name = 'Cloud'
  LIMIT 1;
  
  IF cloud_category_id IS NOT NULL THEN
    -- Call the function manually
    PERFORM public.update_monthly_remaining_balance(
      cloud_user_id,
      cloud_category_id,
      2025,
      9
    );
    
    RAISE NOTICE 'Function called for Cloud category';
  ELSE
    RAISE NOTICE 'Cloud category not found';
  END IF;
END $$;

-- 6. Check Cloud category after manual function call
SELECT 
  'Cloud After Manual Function Call' as status,
  c.name as category_name,
  mrb.september as september_balance,
  mrb.year
FROM public.monthly_remaining_balances mrb
JOIN public.categories c ON mrb.category_id = c.id
WHERE c.name = 'Cloud' AND mrb.year = 2025;
