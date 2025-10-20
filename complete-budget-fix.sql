-- Complete budget system rewrite to fix all issues
-- Run this in your Supabase SQL Editor

-- First, drop all existing budget-related objects
drop trigger if exists trg_expense_budget_check on public.expenses;
drop function if exists public.check_budget_limit(uuid, text, decimal, date);
drop function if exists public.handle_expense_budget_check();
drop function if exists public.calculate_budget_carryover(uuid, uuid, text);

-- Create a completely new budget checking function
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
  
  -- Check if budget is exceeded
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
  
  return new;
end;
$$;

-- Create the trigger
create trigger trg_expense_budget_check
after insert or update on public.expenses
for each row execute function public.check_budget_on_expense();

-- Recreate the budget carryover function
create or replace function public.calculate_budget_carryover(
  target_user_id uuid,
  target_category_id uuid,
  target_month_year text
)
returns decimal(10,2)
language plpgsql
security definer
as $$
declare
  previous_month text;
  previous_budget decimal(10,2);
  previous_spent decimal(10,2);
  carryover_amount decimal(10,2);
  category_name text;
begin
  -- Get the category name
  select name into category_name
  from public.categories
  where id = target_category_id and user_id = target_user_id;
  
  if category_name is null then
    return 0;
  end if;
  
  -- Calculate previous month (YYYY-MM format)
  previous_month := to_char(to_date(target_month_year || '-01', 'YYYY-MM-DD') - interval '1 month', 'YYYY-MM');
  
  -- Get previous month's budget
  select coalesce(amount, 0) into previous_budget
  from public.budgets
  where user_id = target_user_id 
    and category_id = target_category_id 
    and month_year = previous_month;
  
  -- Get previous month's total spent
  select coalesce(sum(amount), 0) into previous_spent
  from public.expenses
  where user_id = target_user_id 
    and category = category_name
    and date >= (previous_month || '-01')::date
    and date < (target_month_year || '-01')::date;
  
  -- Calculate carryover (remaining budget)
  carryover_amount := greatest(previous_budget - previous_spent, 0);
  
  return carryover_amount;
end;
$$;

-- Success message
select 'Complete budget system rewrite completed successfully!' as status;
