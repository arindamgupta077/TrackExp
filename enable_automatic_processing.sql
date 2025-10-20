-- =====================================================
-- ENABLE AUTOMATIC PROCESSING FOR RECURRING EXPENSES
-- =====================================================

-- This script will set up automatic processing of recurring expenses

-- Step 1: Check if pg_cron extension is available
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') 
        THEN '✅ pg_cron extension is available'
        ELSE '❌ pg_cron extension is NOT available - contact Supabase support'
    END as extension_availability;

-- Step 2: Try to enable pg_cron extension
DO $$
BEGIN
    -- Try to create the extension
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        RAISE NOTICE '✅ pg_cron extension enabled successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to enable pg_cron extension: %', SQLERRM;
        RAISE NOTICE 'You may need to contact Supabase support to enable pg_cron';
    END;
END $$;

-- Step 3: Check if extension is now enabled
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN '✅ pg_cron extension is enabled'
        ELSE '❌ pg_cron extension is still not enabled'
    END as extension_status;

-- Step 4: If pg_cron is enabled, set up the cron job
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing cron job if it exists
        DELETE FROM cron.job WHERE jobname = 'process_recurring_expenses';
        
        -- Create new cron job to run every minute
        INSERT INTO cron.job (jobname, schedule, command, active)
        VALUES (
            'process_recurring_expenses',
            '* * * * *', -- Every minute
            'SELECT create_recurring_expenses();',
            true
        );
        
        RAISE NOTICE '✅ Cron job created successfully - will run every minute';
        RAISE NOTICE 'Your recurring expenses will now be processed automatically!';
    ELSE
        RAISE NOTICE '❌ Cannot create cron job - pg_cron extension is not enabled';
    END IF;
END $$;

-- Step 5: Verify cron job was created
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_recurring_expenses') 
        THEN '✅ Cron job exists and is active'
        ELSE '❌ Cron job was not created'
    END as cron_job_status;

-- Step 6: Show current cron jobs
SELECT 
    'Current Cron Jobs:' as info,
    jobname,
    schedule,
    command,
    active,
    created_at
FROM cron.job 
WHERE jobname = 'process_recurring_expenses';

-- Step 7: Alternative solution if pg_cron is not available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE NOTICE '=== ALTERNATIVE SOLUTION ===';
        RAISE NOTICE 'Since pg_cron is not available, you can:';
        RAISE NOTICE '1. Manually run: SELECT manual_trigger_recurring_expenses();';
        RAISE NOTICE '2. Set up a webhook or external cron service';
        RAISE NOTICE '3. Contact Supabase support to enable pg_cron';
        RAISE NOTICE '4. Use the frontend-triggered processing (already implemented)';
    END IF;
END $$;

-- Step 8: Test the automation
SELECT 'Testing automation...' as status;
SELECT * FROM manual_trigger_recurring_expenses();

-- Step 9: Show what will be processed automatically
SELECT 
    'Recurring expenses that will be processed automatically:' as info,
    id,
    category,
    amount,
    day_of_month,
    time_of_day,
    remaining_occurrences,
    is_active,
    CASE 
        WHEN day_of_month = EXTRACT(DAY FROM CURRENT_DATE) THEN '✅ Due today'
        ELSE '⏳ Not today'
    END as processing_status
FROM recurring_expenses 
WHERE user_id = auth.uid()
AND is_active = true
AND remaining_occurrences > 0
ORDER BY day_of_month, time_of_day;



