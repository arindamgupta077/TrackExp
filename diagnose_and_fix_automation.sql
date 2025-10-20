-- =====================================================
-- DIAGNOSTIC AND FIX SCRIPT FOR EXPENSE AUTOMATION
-- =====================================================

-- Step 1: Check if recurring expenses tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expenses') 
        THEN '✅ recurring_expenses table exists'
        ELSE '❌ recurring_expenses table MISSING - Need to run create_recurring_expenses_tables.sql'
    END as table_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expense_logs') 
        THEN '✅ recurring_expense_logs table exists'
        ELSE '❌ recurring_expense_logs table MISSING - Need to run create_recurring_expenses_tables.sql'
    END as logs_table_status;

-- Step 2: Check if time_of_day column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'recurring_expenses' AND column_name = 'time_of_day'
        ) 
        THEN '✅ time_of_day column exists'
        ELSE '❌ time_of_day column MISSING - Need to run update_recurring_expenses_with_time.sql'
    END as time_column_status;

-- Step 3: Check if functions exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_recurring_expenses') 
        THEN '✅ create_recurring_expenses function exists'
        ELSE '❌ create_recurring_expenses function MISSING'
    END as function_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'manual_trigger_recurring_expenses') 
        THEN '✅ manual_trigger_recurring_expenses function exists'
        ELSE '❌ manual_trigger_recurring_expenses function MISSING'
    END as manual_function_status;

-- Step 4: Check if cron extension is enabled
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN '✅ pg_cron extension is enabled'
        ELSE '❌ pg_cron extension NOT enabled - Need to enable it'
    END as cron_extension_status;

-- Step 5: Check if cron job exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_recurring_expenses') 
        THEN '✅ Recurring expenses cron job exists'
        ELSE '❌ Recurring expenses cron job MISSING - Need to run setup_recurring_expenses_cron.sql'
    END as cron_job_status;

-- Step 6: Check current recurring expenses (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expenses') THEN
        RAISE NOTICE '=== CURRENT RECURRING EXPENSES ===';
        -- This will be shown in the results
    ELSE
        RAISE NOTICE 'recurring_expenses table does not exist - cannot check current expenses';
    END IF;
END $$;

-- Show current recurring expenses if table exists
SELECT 
    id,
    category,
    amount,
    day_of_month,
    time_of_day,
    remaining_occurrences,
    total_occurrences,
    is_active,
    start_date,
    created_at
FROM recurring_expenses 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Step 7: Check what should be processed today
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expenses') THEN
        RAISE NOTICE '=== EXPENSES THAT SHOULD BE PROCESSED TODAY ===';
        RAISE NOTICE 'Current date: %', CURRENT_DATE;
        RAISE NOTICE 'Current day of month: %', EXTRACT(DAY FROM CURRENT_DATE);
        RAISE NOTICE 'Current time: %', CURRENT_TIME;
    END IF;
END $$;

-- Show expenses that should be processed today
SELECT 
    id,
    category,
    amount,
    day_of_month,
    time_of_day,
    remaining_occurrences,
    is_active,
    CASE 
        WHEN day_of_month = EXTRACT(DAY FROM CURRENT_DATE) THEN '✅ Should process today'
        ELSE '⏳ Not today'
    END as processing_status
FROM recurring_expenses 
WHERE user_id = auth.uid()
AND is_active = true
AND remaining_occurrences > 0
ORDER BY day_of_month, time_of_day;

-- Step 8: Check if any expenses have been automatically created
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expense_logs') 
        THEN '✅ recurring_expense_logs table exists - checking logs'
        ELSE '❌ recurring_expense_logs table MISSING'
    END as logs_status;

-- Show recent automation logs
SELECT 
    rel.created_at as processed_at,
    rel.scheduled_date,
    e.category,
    e.amount,
    e.description,
    e.date as expense_date
FROM recurring_expense_logs rel
JOIN expenses e ON rel.expense_id = e.id
WHERE e.user_id = auth.uid()
ORDER BY rel.created_at DESC
LIMIT 10;

-- Step 9: Test manual processing (if functions exist)
DO $$
DECLARE
    result RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'manual_trigger_recurring_expenses') THEN
        RAISE NOTICE '=== TESTING MANUAL PROCESSING ===';
        SELECT * INTO result FROM manual_trigger_recurring_expenses();
        RAISE NOTICE 'Manual processing result: % expenses processed - %', result.processed_count, result.message;
    ELSE
        RAISE NOTICE 'manual_trigger_recurring_expenses function does not exist - cannot test manual processing';
    END IF;
END $$;

-- Step 10: Show the fix recommendations
SELECT 
    '🔧 FIX RECOMMENDATIONS' as section,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expenses') 
        THEN '1. Run create_recurring_expenses_tables.sql to create the tables'
        ELSE '1. ✅ Tables exist'
    END as recommendation_1,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_expenses' AND column_name = 'time_of_day') 
        THEN '2. Run update_recurring_expenses_with_time.sql to add time support'
        ELSE '2. ✅ Time support exists'
    END as recommendation_2,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN '3. Enable pg_cron extension in Supabase'
        ELSE '3. ✅ pg_cron extension enabled'
    END as recommendation_3,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_recurring_expenses') 
        THEN '4. Run setup_recurring_expenses_cron.sql to set up automation'
        ELSE '4. ✅ Cron job exists'
    END as recommendation_4;



