-- Test script to verify expense insertion works when budget is exceeded
-- Run this in your Supabase SQL Editor to test

-- First, let's check if there are any existing budget alerts
SELECT * FROM public.budget_alerts ORDER BY created_at DESC LIMIT 5;

-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trg_expense_budget_check';

-- Test inserting an expense (replace with your actual user_id and category)
-- This should work even if it exceeds the budget
INSERT INTO public.expenses (user_id, category, amount, description, date) 
VALUES (
    'your-user-id-here', -- Replace with your actual user ID
    'Food', -- Replace with an existing category
    1000.00, -- Large amount to test budget exceed
    'Test expense to verify insertion works',
    CURRENT_DATE
);

-- Check if the expense was inserted
SELECT * FROM public.expenses ORDER BY created_at DESC LIMIT 5;

-- Check if budget alert was created
SELECT * FROM public.budget_alerts ORDER BY created_at DESC LIMIT 5;

-- If the above test fails, run the fix-budget-trigger.sql script first
