-- =====================================================
-- ALTERNATIVE AUTOMATION SOLUTIONS
-- =====================================================

-- Since you don't have permission to create cron jobs directly,
-- here are alternative solutions for automatic processing

-- =====================================================
-- SOLUTION 1: Frontend-Triggered Processing
-- =====================================================

-- Create a function that can be called from your frontend
CREATE OR REPLACE FUNCTION process_recurring_expenses_on_visit()
RETURNS TABLE (
    processed_count INTEGER,
    message TEXT,
    processed_expenses JSONB
) AS $$
DECLARE
    processed_count INTEGER := 0;
    expense_record RECORD;
    expense_datetime TIMESTAMP WITH TIME ZONE;
    current_datetime TIMESTAMP WITH TIME ZONE;
    processed_expenses JSONB := '[]'::JSONB;
    expense_json JSONB;
BEGIN
    -- Get current datetime
    current_datetime := NOW();
    
    -- Process all active recurring expenses for today for the current user
    FOR expense_record IN 
        SELECT * FROM recurring_expenses 
        WHERE user_id = auth.uid()
        AND is_active = true 
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
                
                -- Add to processed expenses JSON
                expense_json := jsonb_build_object(
                    'id', new_expense_id,
                    'category', expense_record.category,
                    'amount', expense_record.amount,
                    'date', expense_datetime::DATE,
                    'description', COALESCE(expense_record.description, 'Recurring expense - ' || expense_record.category)
                );
                processed_expenses := processed_expenses || expense_json;
                
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
        END,
        processed_expenses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SOLUTION 2: Webhook-Based Processing
-- =====================================================

-- Create a function that can be called via webhook
CREATE OR REPLACE FUNCTION webhook_process_recurring_expenses()
RETURNS JSONB AS $$
DECLARE
    result RECORD;
    response JSONB;
BEGIN
    -- Process recurring expenses
    SELECT * INTO result FROM process_recurring_expenses_on_visit();
    
    -- Create response
    response := jsonb_build_object(
        'success', true,
        'processed_count', result.processed_count,
        'message', result.message,
        'processed_expenses', result.processed_expenses,
        'timestamp', NOW()
    );
    
    RETURN response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SOLUTION 3: Check and Process Function
-- =====================================================

-- Simple function to check and process recurring expenses
CREATE OR REPLACE FUNCTION check_and_process_my_expenses()
RETURNS TEXT AS $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM process_recurring_expenses_on_visit();
    RETURN result.message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TEST THE SOLUTIONS
-- =====================================================

-- Test Solution 1: Frontend-triggered processing
SELECT 'Testing frontend-triggered processing...' as status;
SELECT * FROM process_recurring_expenses_on_visit();

-- Test Solution 2: Webhook processing
SELECT 'Testing webhook processing...' as status;
SELECT webhook_process_recurring_expenses();

-- Test Solution 3: Simple check and process
SELECT 'Testing simple check and process...' as status;
SELECT check_and_process_my_expenses();

-- =====================================================
-- SHOW CURRENT STATUS
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
-- IMPLEMENTATION INSTRUCTIONS
-- =====================================================

SELECT 
    '=== IMPLEMENTATION OPTIONS ===' as info,
    '1. Frontend Integration: Call process_recurring_expenses_on_visit() when users visit dashboard' as option_1,
    '2. Webhook Service: Use webhook_process_recurring_expenses() with external cron service' as option_2,
    '3. Manual Processing: Call check_and_process_my_expenses() daily' as option_3,
    '4. External Cron: Set up cron job on your server to call the webhook function' as option_4;



