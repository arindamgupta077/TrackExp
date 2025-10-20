-- Create credits table for user income/credit tracking
CREATE TABLE public.credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT, -- Nullable - can be unassigned
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT, -- Nullable
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Create policies for credits table
CREATE POLICY "Users can view their own credits" 
ON public.credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credits" 
ON public.credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" 
ON public.credits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credits" 
ON public.credits 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at column
CREATE TRIGGER trg_credits_updated_at
BEFORE UPDATE ON public.credits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update budget when credit is assigned to a category
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
  category_id UUID;
  month_year TEXT;
  current_budget DECIMAL(10,2);
  adjustment_amount DECIMAL(10,2);
BEGIN
  -- Only process if category is assigned
  IF credit_category IS NULL OR credit_category = '' THEN
    RETURN;
  END IF;

  -- Get category ID
  SELECT id INTO category_id
  FROM public.categories
  WHERE user_id = credit_user_id AND name = credit_category;

  IF category_id IS NULL THEN
    RETURN; -- Category doesn't exist
  END IF;

  -- Get month-year from credit date
  month_year := to_char(credit_date, 'YYYY-MM');

  -- Determine adjustment amount (negative for delete, positive for add)
  adjustment_amount := CASE WHEN is_delete THEN -credit_amount ELSE credit_amount END;

  -- Get current budget or default to 0
  SELECT COALESCE(amount, 0) INTO current_budget
  FROM public.budgets
  WHERE user_id = credit_user_id 
    AND category_id = category_id 
    AND month_year = month_year;

  -- Insert or update budget
  INSERT INTO public.budgets (user_id, category_id, month_year, amount)
  VALUES (credit_user_id, category_id, month_year, GREATEST(current_budget + adjustment_amount, 0))
  ON CONFLICT (user_id, category_id, month_year) 
  DO UPDATE SET 
    amount = GREATEST(budgets.amount + adjustment_amount, 0),
    updated_at = now();
END;
$$;

-- Function to handle credit budget updates on insert/update/delete
CREATE OR REPLACE FUNCTION public.handle_credit_budget_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add credit to budget
    PERFORM public.update_budget_with_credit(
      NEW.user_id,
      NEW.category,
      NEW.amount,
      NEW.date,
      FALSE
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Remove old credit from budget
    PERFORM public.update_budget_with_credit(
      OLD.user_id,
      OLD.category,
      OLD.amount,
      OLD.date,
      TRUE
    );
    -- Add new credit to budget
    PERFORM public.update_budget_with_credit(
      NEW.user_id,
      NEW.category,
      NEW.amount,
      NEW.date,
      FALSE
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove credit from budget
    PERFORM public.update_budget_with_credit(
      OLD.user_id,
      OLD.category,
      OLD.amount,
      OLD.date,
      TRUE
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for credit budget updates
DROP TRIGGER IF EXISTS trg_credit_budget_update ON public.credits;
CREATE TRIGGER trg_credit_budget_update
AFTER INSERT OR UPDATE OR DELETE ON public.credits
FOR EACH ROW EXECUTE FUNCTION public.handle_credit_budget_update();
