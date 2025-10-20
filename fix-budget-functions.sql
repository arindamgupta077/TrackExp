-- Fix for ambiguous column reference in budget functions
-- Run this in your Supabase SQL Editor

-- Drop the problematic trigger first
drop trigger if exists trg_expense_budget_check on public.expenses;

-- Fix the check_budget_limit function with proper table aliases
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
  
  -- Get category ID with proper table alias
  select c.id into category_id
  from public.categories c
  where c.user_id = expense_user_id and c.name = expense_category;
  
  if category_id is null then
    return; -- No category found, skip budget check
  end if;
  
  -- Get budget amount for this month with proper table alias
  select coalesce(b.amount, 0) into budget_amount
  from public.budgets b
  where b.user_id = expense_user_id 
    and b.category_id = category_id 
    and b.month_year = current_month_year;
  
  if budget_amount = 0 then
    return; -- No budget set, skip check
  end if;
  
  -- Calculate month start and end dates
  month_start := (current_month_year || '-01')::date;
  month_end := (month_start + interval '1 month')::date;
  
  -- Get total spent this month (including the new expense) with proper table alias
  select coalesce(sum(e.amount), 0) into total_spent
  from public.expenses e
  where e.user_id = expense_user_id 
    and e.category = expense_category
    and e.date >= month_start
    and e.date < month_end;
  
  -- Check if budget is exceeded
  if total_spent > budget_amount then
    -- Create or update budget alert with proper table alias
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
end;
$$;

-- Recreate the trigger function (this one is fine)
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
  
  return new;
end;
$$;

-- Recreate the trigger
create trigger trg_expense_budget_check
after insert or update on public.expenses
for each row execute function public.handle_expense_budget_check();

-- Success message
select 'Budget functions fixed successfully! Ambiguous column reference resolved.' as status;
