-- Function to mark a month as having salary added
-- This function is called when salary is added for a specific month
-- Run this SQL in your Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION public.mark_salary_month_added(
  target_user_id UUID,
  target_year INTEGER,
  target_month INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update the salary month tracking record
  -- This ensures the month is marked as having salary added
  INSERT INTO public.salary_months_tracking (
    user_id, 
    year, 
    month
  )
  VALUES (
    target_user_id,
    target_year,
    target_month
  )
  ON CONFLICT (user_id, year, month) 
  DO UPDATE SET 
    salary_added_at = now(),
    updated_at = now();
END;
$$;

-- Function to check if a month has salary added
CREATE OR REPLACE FUNCTION public.has_salary_for_month(
  target_user_id UUID,
  target_year INTEGER,
  target_month INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_salary BOOLEAN := FALSE;
BEGIN
  -- Check if there's a record for this user, year, and month
  SELECT EXISTS(
    SELECT 1 
    FROM public.salary_months_tracking 
    WHERE user_id = target_user_id 
      AND year = target_year 
      AND month = target_month
  ) INTO has_salary;
  
  RETURN has_salary;
END;
$$;

-- Function to unmark a month as having salary removed
CREATE OR REPLACE FUNCTION public.unmark_salary_month_removed(
  target_user_id UUID,
  target_year INTEGER,
  target_month INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove the salary month tracking record
  DELETE FROM public.salary_months_tracking
  WHERE user_id = target_user_id
    AND year = target_year
    AND month = target_month;
END;
$$;

-- Function to get all months with salary for a user
CREATE OR REPLACE FUNCTION public.get_salary_months_for_user(
  target_user_id UUID
)
RETURNS TABLE(
  year INTEGER,
  month INTEGER,
  salary_added_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    smt.year,
    smt.month,
    smt.salary_added_at
  FROM public.salary_months_tracking smt
  WHERE smt.user_id = target_user_id
  ORDER BY smt.year, smt.month;
END;
$$;
