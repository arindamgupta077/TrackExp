-- Fix the update_budget_with_credit function to exclude Salary category from budget calculations
-- This ensures that salary credits are not added to the monthly budget

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

  -- EXCLUDE SALARY CATEGORY FROM BUDGET CALCULATIONS
  -- Salary credits should not be added to monthly budgets
  IF credit_category = 'Salary' THEN
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

-- Drop and recreate the trigger to ensure it's working with the updated function
DROP TRIGGER IF EXISTS trg_credit_budget_update ON public.credits;
CREATE TRIGGER trg_credit_budget_update
AFTER INSERT OR UPDATE OR DELETE ON public.credits
FOR EACH ROW EXECUTE FUNCTION public.handle_credit_budget_update();

-- Clean up any existing Salary budgets
DELETE FROM public.budgets 
WHERE category_id IN (
  SELECT id FROM public.categories WHERE name = 'Salary'
);

-- Add a comment to document this change
COMMENT ON FUNCTION public.update_budget_with_credit IS 'Updates budget when credits are assigned to categories, excluding Salary category from budget calculations';

