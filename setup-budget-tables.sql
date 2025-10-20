-- Budget Management Setup Script
-- Run this in your Supabase SQL Editor

-- Create budget table for monthly category budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month_year text not null, -- Format: YYYY-MM
  amount decimal(10,2) not null check (amount >= 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(user_id, category_id, month_year)
);

-- Create budget alerts table to track when users exceed budgets
create table if not exists public.budget_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month_year text not null,
  budget_amount decimal(10,2) not null,
  spent_amount decimal(10,2) not null,
  exceeded_by decimal(10,2) not null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.budgets enable row level security;
alter table public.budget_alerts enable row level security;

-- Policies for budgets table
create policy if not exists "Users can view own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own budgets"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- Policies for budget_alerts table
create policy if not exists "Users can view own budget alerts"
  on public.budget_alerts for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own budget alerts"
  on public.budget_alerts for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own budget alerts"
  on public.budget_alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete own budget alerts"
  on public.budget_alerts for delete
  using (auth.uid() = user_id);

-- Function to calculate budget carryover for next month
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
begin
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
    and category = (select name from public.categories where id = target_category_id)
    and date >= (previous_month || '-01')::date
    and date < (target_month_year || '-01')::date;
  
  -- Calculate carryover (remaining budget)
  carryover_amount := greatest(previous_budget - previous_spent, 0);
  
  return carryover_amount;
end;
$$;

-- Function to check budget limits and create alerts
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
end;
$$;

-- Trigger to check budget limits when expenses are added or updated
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

-- Create trigger for expense insert/update
drop trigger if exists trg_expense_budget_check on public.expenses;
create trigger trg_expense_budget_check
after insert or update on public.expenses
for each row execute function public.handle_expense_budget_check();

-- Add trigger for updated_at column
create trigger trg_budgets_updated_at
before update on public.budgets
for each row execute function public.update_updated_at_column();

-- Success message
select 'Budget management tables and functions created successfully!' as status;
