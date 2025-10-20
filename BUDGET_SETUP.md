# Budget Management Setup Guide

This guide will help you set up the budget management feature for your expense tracking application.

## Features Added

1. **Monthly Budget Setting**: Set budgets for each category for every month
2. **Budget Alerts**: Get notified when you exceed your budget limits
3. **Budget Carryover**: Remaining budget from previous months is automatically added to the next month
4. **Real-time Budget Checking**: See budget information when adding expenses

## Database Setup

### Step 1: Run the SQL Script

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `setup-budget-tables.sql` into the editor
4. Click "Run" to execute the script

This will create:
- `budgets` table for storing monthly category budgets
- `budget_alerts` table for tracking budget violations
- Database functions for budget carryover calculation
- Triggers for automatic budget checking
- Row Level Security policies

### Step 2: Verify Setup

After running the script, you should see:
- A success message: "Budget management tables and functions created successfully!"
- New tables in your database schema
- New functions in your database functions list

## How to Use

### Setting Budgets

1. Click the "Budgets" button in the dashboard navigation
2. Select a category and month
3. Enter your budget amount
4. Click "Set Budget"

### Budget Carryover Example

If you set a ₹4000 budget for Food in August and only spend ₹3000:
- ₹1000 will be automatically carried over to September
- Your September Food budget will be: ₹1000 (carryover) + any new budget you set

### Budget Alerts

- When you exceed a budget, an alert is automatically created
- Click the "Alerts" button to view budget violations
- Alerts show how much you exceeded by and for which category/month
- Mark alerts as read when you've reviewed them

### Adding Expenses with Budget Checking

1. When adding an expense, the form will show:
   - Current budget information for the selected category/month
   - Carryover amount (if any)
   - Remaining budget
   - Warnings if the expense will exceed the budget

## Technical Details

### Database Schema

```sql
-- Budgets table
budgets (
  id, user_id, category_id, month_year, amount, created_at, updated_at
)

-- Budget alerts table  
budget_alerts (
  id, user_id, category_id, month_year, budget_amount, spent_amount, 
  exceeded_by, is_read, created_at
)
```

### Key Functions

- `calculate_budget_carryover()`: Calculates remaining budget from previous month
- `check_budget_limit()`: Checks if an expense exceeds budget and creates alerts
- `handle_expense_budget_check()`: Trigger function for automatic budget checking

### Components Added

- `BudgetManager.tsx`: Interface for setting and managing budgets
- `BudgetAlerts.tsx`: Display and manage budget alerts
- `useBudgets.ts`: Hook for budget-related operations
- Updated `ExpenseForm.tsx`: Real-time budget checking
- Updated `Dashboard.tsx`: Navigation to budget features

## Troubleshooting

### Common Issues

1. **"Categories table not found"**: Make sure you've run the categories migration first
2. **"Function not found"**: Ensure the SQL script ran completely without errors
3. **No budget data showing**: Check that you've set budgets for the current month/category

### Manual Database Check

You can verify the setup by running these queries in the SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('budgets', 'budget_alerts');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name IN ('calculate_budget_carryover', 'check_budget_limit');
```

## Next Steps

After setup, you can:
1. Set budgets for your categories
2. Add expenses and see budget warnings
3. Monitor budget alerts
4. Enjoy automatic budget carryover between months

The system will automatically handle budget calculations and alerts as you use the application.
