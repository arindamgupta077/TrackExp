-- Fix budget trigger to ensure it doesn't block expense insertion
-- This script ensures that budget alerts are created but expenses can still be added

-- Drop the existing trigger and function
drop trigger if exists trg_expense_budget_check on public.expenses;
drop function if exists public.handle_expense_budget_check();
drop function if exists public.check_budget_limit();

-- Recreate the check_budget_limit function with better error handling
create or replace function public.check_budget_limit(
  expense_user_id uuid,
  expense_category text,
  expense_amount decimal(10,2),
  expense_date date
)
returns void
language plpgsql
security definer
as $$
declare
  current_month_year text;
  category_id uuid;
  budget_amount decimal(10,2);
  total_spent decimal(10,2);
  month_start date;
  month_end date;
begin
  -- Get current month-year
  current_month_year := to_char(expense_date, 'YYYY-MM');
  
  -- Get category ID
  select id into category_id
  from public.categories
  where user_id = expense_user_id and name = expense_category;
  
  if category_id is null then
    return; -- No category found, skip budget check
  end if;
  
  -- Get budget amount for this month
  select coalesce(amount, 0) into budget_amount
  from public.budgets
  where user_id = expense_user_id 
    and category_id = category_id 
    and month_year = current_month_year;
  
  if budget_amount = 0 then
    return; -- No budget set, skip check
  end if;
  
  -- Calculate month start and end dates
  month_start := (current_month_year || '-01')::date;
  month_end := (month_start + interval '1 month')::date;
  
  -- Get total spent this month (including the new expense)
  select coalesce(sum(amount), 0) into total_spent
  from public.expenses
  where user_id = expense_user_id 
    and category = expense_category
    and date >= month_start
    and date < month_end;
  
  -- Check if budget is exceeded
  if total_spent > budget_amount then
    -- Create or update budget alert
    insert into public.budget_alerts (
      user_id, 
      category_id, 
      month_year, 
      budget_amount, 
      spent_amount, 
      exceeded_by
    ) values (
      expense_user_id,
      category_id,
      current_month_year,
      budget_amount,
      total_spent,
      total_spent - budget_amount
    )
    on conflict (user_id, category_id, month_year) do update set
      spent_amount = excluded.spent_amount,
      exceeded_by = excluded.exceeded_by,
      is_read = false,
      created_at = now();
  end if;
  
  -- Always return successfully - never block expense insertion
  return;
exception
  when others then
    -- Log error but don't block expense insertion
    raise log 'Budget check error: %', sqlerrm;
    return;
end;
$$;

-- Recreate the trigger function with better error handling
create or replace function public.handle_expense_budget_check()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Check budget limits for new or updated expense
  perform public.check_budget_limit(
    new.user_id,
    new.category,
    new.amount,
    new.date
  );
  
  -- Always return the new record - never block insertion
  return new;
exception
  when others then
    -- Log error but don't block expense insertion
    raise log 'Budget trigger error: %', sqlerrm;
    return new;
end;
$$;

-- Recreate the trigger
create trigger trg_expense_budget_check
after insert or update on public.expenses
for each row execute function public.handle_expense_budget_check();

-- Test the trigger by inserting a test expense
-- This will help verify that the trigger works without blocking
-- Uncomment the line below to test (remove after testing)
-- insert into public.expenses (user_id, category, amount, description, date) values ('test-user-id', 'Test Category', 100.00, 'Test expense', current_date);
