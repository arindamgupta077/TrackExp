-- Test and Fix Expense Insertion Issue
-- This script will test the current state and fix any issues preventing expense insertion

-- Step 1: Check current triggers on expenses table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'expenses';

-- Step 2: Check if there are any constraints that might block insertion
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'expenses';

-- Step 3: Drop any problematic budget triggers that might be blocking insertion
DROP TRIGGER IF EXISTS trg_expense_budget_check ON public.expenses;
DROP FUNCTION IF EXISTS public.handle_expense_budget_check();
DROP FUNCTION IF EXISTS public.check_budget_limit(uuid, text, decimal, date);
DROP FUNCTION IF EXISTS public.check_budget_on_expense();

-- Step 4: Create a new budget checking function that NEVER blocks expense insertion
CREATE OR REPLACE FUNCTION public.check_budget_on_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category_id uuid;
  v_month_year text;
  v_budget_amount decimal(10,2) := 0;
  v_total_spent decimal(10,2) := 0;
  v_month_start date;
  v_month_end date;
BEGIN
  -- Get the month-year for the expense
  v_month_year := to_char(new.date, 'YYYY-MM');
  
  -- Find the category ID for this user and category name
  SELECT id INTO v_category_id
  FROM public.categories 
  WHERE user_id = new.user_id AND name = new.category;
  
  -- If no category found, just return (no budget check needed)
  IF v_category_id IS NULL THEN
    RETURN new;
  END IF;
  
  -- Get the budget amount for this category and month
  SELECT amount INTO v_budget_amount
  FROM public.budgets 
  WHERE user_id = new.user_id 
    AND category_id = v_category_id 
    AND month_year = v_month_year;
  
  -- If no budget set, just return (no budget check needed)
  IF v_budget_amount IS NULL OR v_budget_amount = 0 THEN
    RETURN new;
  END IF;
  
  -- Calculate month boundaries
  v_month_start := (v_month_year || '-01')::date;
  v_month_end := (v_month_start + interval '1 month')::date;
  
  -- Calculate total spent this month (including the new expense)
  SELECT coalesce(sum(amount), 0) INTO v_total_spent
  FROM public.expenses 
  WHERE user_id = new.user_id 
    AND category = new.category
    AND date >= v_month_start
    AND date < v_month_end;
  
  -- Check if budget is exceeded and create alert if needed
  IF v_total_spent > v_budget_amount THEN
    -- Create or update budget alert
    INSERT INTO public.budget_alerts (
      user_id, 
      category_id, 
      month_year, 
      budget_amount, 
      spent_amount, 
      exceeded_by
    ) VALUES (
      new.user_id,
      v_category_id,
      v_month_year,
      v_budget_amount,
      v_total_spent,
      v_total_spent - v_budget_amount
    )
    ON CONFLICT (user_id, category_id, month_year) DO UPDATE SET
      spent_amount = excluded.spent_amount,
      exceeded_by = excluded.exceeded_by,
      is_read = false,
      created_at = now();
  END IF;
  
  -- ALWAYS return new - never block the expense insertion
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but NEVER block expense insertion
    RAISE LOG 'Budget check error (non-blocking): %', sqlerrm;
    RETURN new;
END;
$$;

-- Step 5: Create the trigger that will NOT block expense insertion
CREATE TRIGGER trg_expense_budget_check
AFTER INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.check_budget_on_expense();

-- Step 6: Test the trigger by inserting a test expense
-- Replace 'your-user-id-here' with an actual user ID from your database
-- Replace 'Food' with an actual category name from your database
/*
INSERT INTO public.expenses (user_id, category, amount, description, date) 
VALUES (
    'your-user-id-here', -- Replace with your actual user ID
    'Food', -- Replace with an existing category
    1000.00, -- Large amount to test budget exceed
    'Test expense to verify insertion works',
    CURRENT_DATE
);
*/

-- Step 7: Verify the trigger was created correctly
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trg_expense_budget_check';

-- Success message
SELECT 'Expense insertion fix completed successfully! Expenses can now be added even when budget is exceeded.' AS status;
