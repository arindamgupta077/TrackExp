-- Fix expense insertion when budget is exceeded
-- This script ensures expenses can be added even when budget is exceeded

-- First, drop any existing problematic triggers
drop trigger if exists trg_expense_budget_check on public.expenses;
drop function if exists public.handle_expense_budget_check();
drop function if exists public.check_budget_limit(uuid, text, decimal, date);
drop function if exists public.check_budget_on_expense();

-- Create a new budget checking function that NEVER blocks expense insertion
create or replace function public.check_budget_on_expense()
returns trigger
language plpgsql
security definer
as $$
declare
  v_category_id uuid;
  v_month_year text;
  v_budget_amount decimal(10,2) := 0;
  v_total_spent decimal(10,2) := 0;
  v_month_start date;
  v_month_end date;
begin
  -- Get the month-year for the expense
  v_month_year := to_char(new.date, 'YYYY-MM');
  
  -- Find the category ID for this user and category name
  select id into v_category_id
  from public.categories 
  where user_id = new.user_id and name = new.category;
  
  -- If no category found, just return (no budget check needed)
  if v_category_id is null then
    return new;
  end if;
  
  -- Get the budget amount for this category and month
  select amount into v_budget_amount
  from public.budgets 
  where user_id = new.user_id 
    and category_id = v_category_id 
    and month_year = v_month_year;
  
  -- If no budget set, just return (no budget check needed)
  if v_budget_amount is null or v_budget_amount = 0 then
    return new;
  end if;
  
  -- Calculate month boundaries
  v_month_start := (v_month_year || '-01')::date;
  v_month_end := (v_month_start + interval '1 month')::date;
  
  -- Calculate total spent this month (including the new expense)
  select coalesce(sum(amount), 0) into v_total_spent
  from public.expenses 
  where user_id = new.user_id 
    and category = new.category
    and date >= v_month_start
    and date < v_month_end;
  
  -- Check if budget is exceeded and create alert if needed
  if v_total_spent > v_budget_amount then
    -- Create or update budget alert
    insert into public.budget_alerts (
      user_id, 
      category_id, 
      month_year, 
      budget_amount, 
      spent_amount, 
      exceeded_by
    ) values (
      new.user_id,
      v_category_id,
      v_month_year,
      v_budget_amount,
      v_total_spent,
      v_total_spent - v_budget_amount
    )
    on conflict (user_id, category_id, month_year) do update set
      spent_amount = excluded.spent_amount,
      exceeded_by = excluded.exceeded_by,
      is_read = false,
      created_at = now();
  end if;
  
  -- ALWAYS return new - never block the expense insertion
  return new;
exception
  when others then
    -- Log the error but NEVER block expense insertion
    raise log 'Budget check error (non-blocking): %', sqlerrm;
    return new;
end;
$$;

-- Create the trigger that will NOT block expense insertion
create trigger trg_expense_budget_check
after insert or update on public.expenses
for each row execute function public.check_budget_on_expense();

-- Test the trigger by inserting a test expense
-- This should work even if it exceeds any budget
-- Uncomment the lines below to test (replace with your actual user_id and category)
/*
insert into public.expenses (user_id, category, amount, description, date) 
values (
    'your-user-id-here', -- Replace with your actual user ID
    'Food', -- Replace with an existing category
    1000.00, -- Large amount to test budget exceed
    'Test expense to verify insertion works',
    CURRENT_DATE
);
*/

-- Success message
select 'Expense insertion fix completed successfully! Expenses can now be added even when budget is exceeded.' as status;
