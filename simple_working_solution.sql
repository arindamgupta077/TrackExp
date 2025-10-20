-- =====================================================
-- SIMPLE WORKING SOLUTION - IMMEDIATE AUTOMATION
-- =====================================================

-- This solution provides immediate automation without complex setup

-- =====================================================
-- STEP 1: Create a Simple Processing Function
-- =====================================================

CREATE OR REPLACE FUNCTION process_today_recurring_expenses()
RETURNS TABLE (
    processed_count INTEGER,
    message TEXT
) AS $$
DECLARE
    processed_count INTEGER := 0;
    expense_record RECORD;
    expense_datetime TIMESTAMP WITH TIME ZONE;
    current_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current datetime
    current_datetime := NOW();
    
    -- Process all active recurring expenses for today
    FOR expense_record IN 
        SELECT * FROM recurring_expenses 
        WHERE is_active = true 
        AND remaining_occurrences > 0
        AND day_of_month = EXTRACT(DAY FROM current_datetime)
        AND (end_date IS NULL OR end_date >= current_datetime::DATE)
        AND start_date <= current_datetime::DATE
    LOOP
        -- Create the expense datetime
        expense_datetime := (current_datetime::DATE + expense_record.time_of_day)::TIMESTAMP WITH TIME ZONE;
        
        -- Check if expense for this month already exists
        IF NOT EXISTS (
            SELECT 1 FROM recurring_expense_logs rel
            JOIN expenses e ON rel.expense_id = e.id
            WHERE rel.recurring_expense_id = expense_record.id
            AND EXTRACT(YEAR FROM rel.scheduled_date) = EXTRACT(YEAR FROM current_datetime)
            AND EXTRACT(MONTH FROM rel.scheduled_date) = EXTRACT(MONTH FROM current_datetime)
        ) THEN
            -- Create the expense
            DECLARE
                new_expense_id UUID;
            BEGIN
                INSERT INTO expenses (user_id, category, amount, description, date)
                VALUES (
                    expense_record.user_id,
                    expense_record.category,
                    expense_record.amount,
                    COALESCE(expense_record.description, 'Recurring expense - ' || expense_record.category),
                    expense_datetime::DATE
                )
                RETURNING id INTO new_expense_id;
                
                -- Log the creation
                INSERT INTO recurring_expense_logs (recurring_expense_id, expense_id, scheduled_date)
                VALUES (expense_record.id, new_expense_id, expense_datetime::DATE);
                
                -- Decrease remaining occurrences
                UPDATE recurring_expenses 
                SET remaining_occurrences = remaining_occurrences - 1,
                    updated_at = NOW()
                WHERE id = expense_record.id;
                
                -- If no more occurrences, deactivate
                IF (SELECT remaining_occurrences FROM recurring_expenses WHERE id = expense_record.id) = 0 THEN
                    UPDATE recurring_expenses 
                    SET is_active = false, updated_at = NOW()
                    WHERE id = expense_record.id;
                END IF;
                
                processed_count := processed_count + 1;
            END;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        processed_count,
        CASE 
            WHEN processed_count = 0 THEN 'No recurring expenses to process for today'
            WHEN processed_count = 1 THEN '1 recurring expense processed successfully'
            ELSE processed_count::TEXT || ' recurring expenses processed successfully'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Test the Function
-- =====================================================

-- Test the function
SELECT 'Testing simple processing function...' as status;
SELECT * FROM process_today_recurring_expenses();

-- =====================================================
-- STEP 3: Show Current Status
-- =====================================================

-- Show recurring expenses due today
SELECT 
    'Recurring expenses due today:' as info,
    id,
    category,
    amount,
    day_of_month,
    time_of_day,
    remaining_occurrences,
    is_active
FROM recurring_expenses 
WHERE user_id = auth.uid()
AND is_active = true
AND remaining_occurrences > 0
AND day_of_month = EXTRACT(DAY FROM CURRENT_DATE)
ORDER BY time_of_day;

-- Show recent automation logs
SELECT 
    'Recent automation logs:' as info,
    rel.created_at as processed_at,
    rel.scheduled_date,
    e.category,
    e.amount,
    e.date as expense_date
FROM recurring_expense_logs rel
JOIN expenses e ON rel.expense_id = e.id
WHERE e.user_id = auth.uid()
ORDER BY rel.created_at DESC
LIMIT 5;

-- =====================================================
-- STEP 4: Create a Test Recurring Expense
-- =====================================================

-- Create a test recurring expense for today (if you don't have one)
INSERT INTO recurring_expenses (
    user_id,
    category,
    amount,
    description,
    day_of_month,
    time_of_day,
    total_occurrences,
    remaining_occurrences,
    start_date
) VALUES (
    auth.uid(),
    'Test Category',
    100.00,
    'Test recurring expense for today',
    EXTRACT(DAY FROM CURRENT_DATE), -- Today's day
    '09:00:00', -- 9 AM
    12, -- 12 months
    12, -- 12 remaining
    CURRENT_DATE
) ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 5: Test Again
-- =====================================================

-- Test the function again
SELECT 'Testing with new recurring expense...' as status;
SELECT * FROM process_today_recurring_expenses();

-- =====================================================
-- STEP 6: Show Final Status
-- =====================================================

-- Show all recurring expenses
SELECT 
    'All recurring expenses:' as info,
    id,
    category,
    amount,
    day_of_month,
    time_of_day,
    remaining_occurrences,
    is_active,
    created_at
FROM recurring_expenses 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Show all expenses (including newly created ones)
SELECT 
    'All expenses (including recurring):' as info,
    id,
    category,
    amount,
    description,
    date,
    created_at
FROM expenses 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;



