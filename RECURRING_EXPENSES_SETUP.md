# Recurring Expenses Feature Setup Guide

## Overview
The Recurring Expenses feature allows users to automate their fixed monthly expenses. Users can schedule expenses to be automatically added on specific days of each month for a specified number of months.

## Features
- ✅ Create recurring expense schedules
- ✅ Edit existing recurring expenses
- ✅ Delete recurring expense schedules
- ✅ Automatic expense creation on scheduled days
- ✅ Track remaining occurrences
- ✅ View expense automation history
- ✅ Manual trigger for testing

## Database Setup

### Step 1: Run the main database script
Execute the following SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of create_recurring_expenses_tables.sql
```

### Step 2: Set up automatic execution (Optional)
For automatic daily processing, run the cron setup script:

```sql
-- Copy and paste the contents of setup_recurring_expenses_cron.sql
```

**Note**: The automatic cron job requires the `pg_cron` extension to be enabled in your Supabase project. If you don't have access to enable extensions, you can manually trigger the recurring expenses processing from your application.

## How It Works

### 1. User Creates Recurring Expense
- User clicks "Expense Automation" button in the dashboard
- User fills out the form:
  - **Category**: Select from existing categories
  - **Amount**: Enter the expense amount
  - **Day of Month**: Choose which day (1-31) the expense should be added
  - **Total Occurrences**: How many months this should continue (1-60)
  - **Description**: Optional description

### 2. Automatic Processing
- The system checks daily for recurring expenses scheduled for that day
- If a recurring expense is due, it automatically creates an expense entry
- The system tracks how many occurrences are remaining
- When all occurrences are completed, the recurring expense is marked as inactive

### 3. Manual Processing
- You can manually trigger the processing using the `manual_trigger_recurring_expenses()` function
- This is useful for testing or if you don't have automatic cron jobs set up

## Example Usage

### Creating a SIP Investment
```
Category: SIP
Amount: 25000
Day of Month: 1
Total Occurrences: 12
Description: Monthly SIP investment
```

This will automatically add a ₹25,000 expense in the SIP category on the 1st day of every month for 12 months.

### Creating a Rent Payment
```
Category: Rent
Amount: 15000
Day of Month: 5
Total Occurrences: 24
Description: Monthly rent payment
```

This will automatically add a ₹15,000 expense in the Rent category on the 5th day of every month for 24 months.

## Database Tables

### `recurring_expenses`
Stores the recurring expense schedules:
- `id`: Unique identifier
- `user_id`: User who created the schedule
- `category`: Expense category
- `amount`: Expense amount
- `description`: Optional description
- `day_of_month`: Day of month (1-31) when expense should be created
- `total_occurrences`: Total number of times this should repeat
- `remaining_occurrences`: How many times are left
- `start_date`: When the schedule started
- `end_date`: When the schedule should end (optional)
- `is_active`: Whether the schedule is active

### `recurring_expense_logs`
Tracks when expenses were automatically created:
- `id`: Unique identifier
- `recurring_expense_id`: Reference to the recurring expense
- `expense_id`: Reference to the created expense
- `scheduled_date`: Date when the expense was scheduled to be created
- `created_at`: When the log entry was created

## API Functions

### `get_user_recurring_expenses(user_id)`
Returns all recurring expenses for a specific user.

### `create_recurring_expenses()`
Processes all active recurring expenses and creates expenses for today if scheduled.

### `update_recurring_expense(expense_id, ...)`
Updates an existing recurring expense schedule.

### `delete_recurring_expense(expense_id)`
Deletes a recurring expense schedule.

### `manual_trigger_recurring_expenses()`
Manually triggers the processing of recurring expenses and returns statistics.

## Frontend Components

### `RecurringExpensesModal`
- Main modal for managing recurring expenses
- Shows list of active recurring expenses
- Form for creating/editing recurring expenses
- Delete functionality

### `useRecurringExpenses` Hook
- Manages recurring expenses state
- Provides CRUD operations
- Handles loading states and error handling

### `RecurringExpenseService`
- Service layer for API calls
- Handles all database operations
- Provides error handling and data transformation

## Integration Points

### Dashboard Integration
- Added "Expense Automation" button to both desktop and mobile navigation
- Button opens the RecurringExpensesModal
- Integrated with existing UI styling and theming

### Expense System Integration
- Automatically created expenses integrate with existing expense tracking
- Works with budget calculations and analytics
- Maintains data consistency with existing expense system

## Testing

### Manual Testing
1. Create a recurring expense with a small number of occurrences
2. Use the manual trigger function to process it
3. Verify the expense was created correctly
4. Check that remaining occurrences decreased
5. Test editing and deleting recurring expenses

### Automated Testing
- Set up a test recurring expense for today's date
- Run the manual trigger function
- Verify the expense creation and logging

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own recurring expenses
- Proper authentication checks in all functions

### Data Validation
- Input validation on all forms
- Database constraints for data integrity
- Proper error handling throughout

## Performance Considerations

### Indexing
- Indexes on frequently queried columns
- Optimized queries for better performance
- Efficient pagination for large datasets

### Caching
- Local state management for better UX
- Optimistic updates for immediate feedback
- Proper loading states

## Troubleshooting

### Common Issues

1. **Recurring expenses not being created automatically**
   - Check if the cron job is set up correctly
   - Verify the `create_recurring_expenses()` function works manually
   - Check if the day of month matches the current date

2. **Duplicate expenses being created**
   - The system prevents duplicates by checking existing logs
   - If duplicates occur, check the `recurring_expense_logs` table

3. **Recurring expenses not showing in the UI**
   - Check if the user has proper permissions
   - Verify the `get_user_recurring_expenses()` function
   - Check browser console for errors

### Manual Processing
If automatic processing isn't working, you can manually trigger it:

```sql
SELECT * FROM manual_trigger_recurring_expenses();
```

This will process all due recurring expenses and return statistics about what was processed.

## Future Enhancements

### Potential Improvements
- [ ] Email notifications for processed expenses
- [ ] Recurring expense templates
- [ ] Bulk import/export of recurring expenses
- [ ] Advanced scheduling (weekly, yearly, custom intervals)
- [ ] Recurring expense analytics and insights
- [ ] Integration with calendar applications
- [ ] Mobile push notifications

### Advanced Features
- [ ] Conditional recurring expenses (based on account balance)
- [ ] Recurring expense sharing between users
- [ ] Integration with external payment systems
- [ ] Recurring expense forecasting and budgeting

## Support

For issues or questions about the recurring expenses feature:
1. Check the troubleshooting section above
2. Review the database logs for errors
3. Test with manual trigger functions
4. Check browser console for frontend errors

The feature is designed to be robust and handle edge cases gracefully, but proper testing is recommended before deploying to production.



