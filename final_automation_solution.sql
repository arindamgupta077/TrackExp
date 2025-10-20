-- =====================================================
-- FINAL AUTOMATION SOLUTION - NO CRON REQUIRED
-- =====================================================

-- This solution provides multiple ways to achieve automatic processing
-- without requiring pg_cron permissions

-- =====================================================
-- SOLUTION 1: Database Trigger-Based Processing
-- =====================================================

-- Create a function that processes recurring expenses
CREATE OR REPLACE FUNCTION auto_process_recurring_expenses()
RETURNS void AS $$
DECLARE
    recurring_record RECORD;
    expense_datetime TIMESTAMP WITH TIME ZONE;
    current_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current datetime
    current_datetime := NOW();
    
    -- Find all active recurring expenses that should be processed today
    FOR recurring_record IN 
        SELECT * FROM recurring_expenses 
        WHERE is_active = true 
        AND remaining_occurrences > 0
        AND day_of_month = EXTRACT(DAY FROM current_datetime)
        AND (end_date IS NULL OR end_date >= current_datetime::DATE)
        AND start_date <= current_datetime::DATE
    LOOP
        -- Create the expense datetime
        expense_datetime := (current_datetime::DATE + recurring_record.time_of_day)::TIMESTAMP WITH TIME ZONE;
        
        -- Check if expense for this month already exists
        IF NOT EXISTS (
            SELECT 1 FROM recurring_expense_logs rel
            JOIN expenses e ON rel.expense_id = e.id
            WHERE rel.recurring_expense_id = recurring_record.id
            AND EXTRACT(YEAR FROM rel.scheduled_date) = EXTRACT(YEAR FROM current_datetime)
            AND EXTRACT(MONTH FROM rel.scheduled_date) = EXTRACT(MONTH FROM current_datetime)
        ) THEN
            -- Create the expense
            DECLARE
                new_expense_id UUID;
            BEGIN
                INSERT INTO expenses (user_id, category, amount, description, date)
                VALUES (
                    recurring_record.user_id,
                    recurring_record.category,
                    recurring_record.amount,
                    COALESCE(recurring_record.description, 'Recurring expense - ' || recurring_record.category),
                    expense_datetime::DATE
                )
                RETURNING id INTO new_expense_id;
                
                -- Log the creation
                INSERT INTO recurring_expense_logs (recurring_expense_id, expense_id, scheduled_date)
                VALUES (recurring_record.id, new_expense_id, expense_datetime::DATE);
                
                -- Decrease remaining occurrences
                UPDATE recurring_expenses 
                SET remaining_occurrences = remaining_occurrences - 1,
                    updated_at = NOW()
                WHERE id = recurring_record.id;
                
                -- If no more occurrences, deactivate
                IF (SELECT remaining_occurrences FROM recurring_expenses WHERE id = recurring_record.id) = 0 THEN
                    UPDATE recurring_expenses 
                    SET is_active = false, updated_at = NOW()
                    WHERE id = recurring_record.id;
                END IF;
                
                RAISE NOTICE 'Created recurring expense: % for % on %', 
                    recurring_record.amount, recurring_record.category, expense_datetime::DATE;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SOLUTION 2: Webhook Function for External Services
-- =====================================================

-- Create a webhook function that can be called by external services
CREATE OR REPLACE FUNCTION webhook_trigger_automation()
RETURNS JSONB AS $$
DECLARE
    result RECORD;
    response JSONB;
BEGIN
    -- Process recurring expenses
    PERFORM auto_process_recurring_expenses();
    
    -- Get count of processed expenses
    SELECT COUNT(*) as processed_count INTO result
    FROM recurring_expense_logs rel
    JOIN expenses e ON rel.expense_id = e.id
    WHERE rel.created_at >= CURRENT_DATE;
    
    -- Create response
    response := jsonb_build_object(
        'success', true,
        'processed_count', COALESCE(result.processed_count, 0),
        'message', 'Recurring expenses processed successfully',
        'timestamp', NOW()
    );
    
    RETURN response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SOLUTION 3: Simple Daily Check Function
-- =====================================================

-- Create a simple function to check and process
CREATE OR REPLACE FUNCTION daily_recurring_expense_check()
RETURNS TEXT AS $$
DECLARE
    processed_count INTEGER := 0;
BEGIN
    -- Process recurring expenses
    PERFORM auto_process_recurring_expenses();
    
    -- Count processed expenses for today
    SELECT COUNT(*) INTO processed_count
    FROM recurring_expense_logs rel
    JOIN expenses e ON rel.expense_id = e.id
    WHERE rel.created_at >= CURRENT_DATE;
    
    RETURN 'Processed ' || processed_count || ' recurring expenses for today';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SOLUTION 4: Test All Functions
-- =====================================================

-- Test the automation function
SELECT 'Testing auto_process_recurring_expenses...' as status;
SELECT auto_process_recurring_expenses();

-- Test the webhook function
SELECT 'Testing webhook_trigger_automation...' as status;
SELECT webhook_trigger_automation();

-- Test the daily check function
SELECT 'Testing daily_recurring_expense_check...' as status;
SELECT daily_recurring_expense_check();

-- =====================================================
-- SOLUTION 5: Show Current Status
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
-- IMPLEMENTATION GUIDE
-- =====================================================

SELECT 
    '=== AUTOMATION IMPLEMENTATION GUIDE ===' as info,
    'Since you cannot create cron jobs directly, here are your options:' as note,
    '' as spacer1,
    'OPTION 1: External Cron Service' as option1,
    '  - Use GitHub Actions, Vercel Cron, or similar' as option1_desc,
    '  - Call: SELECT webhook_trigger_automation();' as option1_call,
    '' as spacer2,
    'OPTION 2: Manual Daily Processing' as option2,
    '  - Run daily: SELECT daily_recurring_expense_check();' as option2_desc,
    '  - Set a reminder to run this query daily' as option2_note,
    '' as spacer3,
    'OPTION 3: Contact Supabase Support' as option3,
    '  - Ask them to enable pg_cron for your project' as option3_desc,
    '  - Request permission to create cron jobs' as option3_note,
    '' as spacer4,
    'OPTION 4: Use Your App' as option4,
    '  - Integrate the function into your app' as option4_desc,
    '  - Call it when users visit the dashboard' as option4_note;



