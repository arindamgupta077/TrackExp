-- Simple test to verify zero budget calculation
-- Run this first to see what's happening

-- Test 1: Check if Cloud category exists and has expenses
SELECT 
  'Cloud Category Check' as test_name,
  c.name,
  c.id,
  COUNT(e.id) as expense_count,
  SUM(e.amount) as total_spent
FROM public.categories c
LEFT JOIN public.expenses e ON e.category = c.name 
  AND e.date >= '2025-09-01' 
  AND e.date < '2025-10-01'
WHERE c.name = 'Cloud'
GROUP BY c.id, c.name;

-- Test 2: Check if there's a budget record for Cloud
SELECT 
  'Cloud Budget Check' as test_name,
  b.amount,
  b.month_year,
  c.name
FROM public.budgets b
JOIN public.categories c ON b.category_id = c.id
WHERE c.name = 'Cloud' AND b.month_year = '2025-09';

-- Test 3: Manual calculation
SELECT 
  'Manual Calculation' as test_name,
  0 as budget_amount,
  450 as spent_amount,
  0 - 450 as remaining_balance;

-- Test 4: Check current category_summaries data
SELECT 
  'Current Summary Data' as test_name,
  category_name,
  total_budget,
  total_spent,
  remaining_balance,
  month_year
FROM public.category_summaries
WHERE category_name = 'Cloud' AND month_year = '2025-09';
