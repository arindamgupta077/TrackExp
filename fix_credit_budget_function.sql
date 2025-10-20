-- Fixed function to handle credit budget updates
-- This version explicitly handles the case where no budget record exists

CREATE OR REPLACE FUNCTION public.update_budget_with_credit(
  credit_user_id UUID,
  credit_category TEXT,
  credit_amount DECIMAL(10,2),
  credit_date DATE,
  is_delete BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_category_id UUID;
  target_month_year TEXT;
  current_budget DECIMAL(10,2);
  adjustment_amount DECIMAL(10,2);
  budget_exists BOOLEAN;
BEGIN
  -- Only process if category is assigned
  IF credit_category IS NULL OR credit_category = '' THEN
    RETURN;
  END IF;

  -- Get category ID
  SELECT id INTO target_category_id
  FROM public.categories
  WHERE user_id = credit_user_id AND name = credit_category;

  IF target_category_id IS NULL THEN
    RETURN; -- Category doesn't exist
  END IF;

  -- Get month-year from credit date
  target_month_year := to_char(credit_date, 'YYYY-MM');

  -- Determine adjustment amount (negative for delete, positive for add)
  adjustment_amount := CASE WHEN is_delete THEN -credit_amount ELSE credit_amount END;

  -- Check if budget record exists for this category and month
  SELECT EXISTS(
    SELECT 1 FROM public.budgets
    WHERE user_id = credit_user_id 
      AND category_id = target_category_id 
      AND month_year = target_month_year
  ) INTO budget_exists;

  IF budget_exists THEN
    -- Budget record exists, update it
    UPDATE public.budgets 
    SET amount = GREATEST(amount + adjustment_amount, 0),
        updated_at = now()
    WHERE user_id = credit_user_id 
      AND category_id = target_category_id 
      AND month_year = target_month_year;
  ELSE
    -- No budget record exists, create one with the credit amount
    -- Only create if we're adding credit (positive adjustment)
    IF adjustment_amount > 0 THEN
      INSERT INTO public.budgets (user_id, category_id, month_year, amount)
      VALUES (credit_user_id, target_category_id, target_month_year, adjustment_amount);
    END IF;
  END IF;
END;
$$;

-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS trg_credit_budget_update ON public.credits;
CREATE TRIGGER trg_credit_budget_update
AFTER INSERT OR UPDATE OR DELETE ON public.credits
FOR EACH ROW EXECUTE FUNCTION public.handle_credit_budget_update();

-- Also create a simple test function to verify the logic works
CREATE OR REPLACE FUNCTION public.test_credit_budget_update(
  test_user_id UUID,
  test_category TEXT,
  test_amount DECIMAL(10,2)
)
RETURNS TABLE(
  category_name TEXT,
  month_year TEXT,
  budget_amount DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_date DATE := CURRENT_DATE;
BEGIN
  -- Call the update function
  PERFORM public.update_budget_with_credit(test_user_id, test_category, test_amount, test_date, FALSE);
  
  -- Return the result
  RETURN QUERY
  SELECT 
    c.name as category_name,
    b.month_year,
    b.amount as budget_amount
  FROM public.categories c
  LEFT JOIN public.budgets b ON c.id = b.category_id AND b.user_id = test_user_id
  WHERE c.user_id = test_user_id AND c.name = test_category;
END;
$$;
