# Budget Management Update - Past 6 & 12 Months Options

## New Features Added

### 1. Past 6 Months Option
- **Purpose**: Allows users to set or update budgets for the past 6 months in one operation
- **Use Case**: When you want to retroactively set budgets for recent months
- **Behavior**: 
  - Generates 6 months starting from 6 months ago up to 1 month ago
  - Sets the same budget amount for all 6 months
  - Updates existing budgets if they already exist

### 2. Past 12 Months Option
- **Purpose**: Allows users to set or update budgets for the past 12 months in one operation
- **Use Case**: When you want to retroactively set budgets for the entire past year
- **Behavior**:
  - Generates 12 months starting from 12 months ago up to 1 month ago
  - Sets the same budget amount for all 12 months
  - Updates existing budgets if they already exist

## How It Works

### Month Generation Logic
```javascript
// Past 6 Months: Generates months from 6 months ago to 1 month ago
for (let i = 6; i >= 1; i--) {
  const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
  // Creates monthYear format: "2024-01", "2024-02", etc.
}

// Past 12 Months: Generates months from 12 months ago to 1 month ago
for (let i = 12; i >= 1; i--) {
  const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
  // Creates monthYear format: "2023-07", "2023-08", etc.
}
```

### Budget Setting Process
1. **User Selection**: User selects a category and chooses "Past 6 Months" or "Past 12 Months"
2. **Month Generation**: System generates the appropriate month list
3. **Batch Processing**: For each month:
   - Checks if budget already exists
   - Creates new budget or updates existing one
   - Tracks success/failure counts
4. **Feedback**: Shows success message with count of months processed

### UI Updates
- **Dropdown Options**: Added "Past 6 Months" and "Past 12 Months" to month selector
- **Button Text**: Dynamic text based on selection:
  - "Set Budget for Past 6 Months"
  - "Set Budget for Past 12 Months"
- **Card Title**: Updates to reflect the selected option
- **Validation**: Updated to handle new options
- **Filtering**: Existing budgets list filters to show relevant months

## Example Usage

### Setting Past 6 Months Budget
1. Open Budget Manager
2. Select a category (e.g., "Food")
3. Select "Past 6 Months" from month dropdown
4. Enter budget amount (e.g., ₹5000)
5. Click "Set Budget for Past 6 Months"
6. System will set ₹5000 budget for each of the past 6 months

### Setting Past 12 Months Budget
1. Open Budget Manager
2. Select a category (e.g., "Transportation")
3. Select "Past 12 Months" from month dropdown
4. Enter budget amount (e.g., ₹3000)
5. Click "Set Budget for Past 12 Months"
6. System will set ₹3000 budget for each of the past 12 months

## Technical Implementation

### Key Changes Made
1. **Month Options Generation**: Updated to include past months
2. **Budget Setting Logic**: Enhanced to handle batch operations
3. **UI Components**: Updated labels, titles, and validation
4. **Filtering Logic**: Added support for filtering by past months
5. **Error Handling**: Improved error messages for batch operations

### Database Operations
- Uses existing `setBudget` function from `useBudgets` hook
- Handles both creation and updates of existing budgets
- Maintains data consistency with existing budget system
- No database schema changes required

## Benefits

1. **Time Saving**: Set budgets for multiple months in one operation
2. **Retroactive Planning**: Can set budgets for past months
3. **Consistency**: Ensures uniform budget amounts across selected period
4. **Flexibility**: Choose between 6 or 12 months based on needs
5. **User Friendly**: Clear UI indicators and feedback

## Error Handling

- **Partial Failures**: If some months fail, others still succeed
- **Success Count**: Shows how many months were successfully processed
- **Error Count**: Shows how many months failed (if any)
- **Retry Capability**: Can retry failed operations

## Future Enhancements

Potential improvements that could be added:
1. **Custom Date Range**: Allow users to specify custom start/end months
2. **Different Amounts**: Allow setting different amounts for different months
3. **Template Budgets**: Save budget templates for reuse
4. **Bulk Category Operations**: Set budgets for multiple categories at once
