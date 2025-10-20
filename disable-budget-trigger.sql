-- Temporarily disable budget trigger to fix expense adding
-- Run this in your Supabase SQL Editor

-- Drop the problematic trigger completely
drop trigger if exists trg_expense_budget_check on public.expenses;

-- Drop the problematic functions
drop function if exists public.check_budget_limit(uuid, text, decimal, date);
drop function if exists public.handle_expense_budget_check();

-- Success message
select 'Budget trigger disabled successfully! You can now add expenses.' as status;
