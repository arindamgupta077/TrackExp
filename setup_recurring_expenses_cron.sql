-- This script sets up automatic execution of recurring expenses
-- Note: This requires the pg_cron extension to be enabled in your Supabase project

-- Enable pg_cron extension (if not already enabled)
-- This needs to be run by a superuser in your Supabase project
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to run recurring expenses daily at midnight IST
-- This will automatically create expenses for users who have recurring expenses scheduled for today
CREATE OR REPLACE FUNCTION schedule_recurring_expenses_daily()
RETURNS void AS $$
BEGIN
    -- Run the recurring expenses function
    PERFORM create_recurring_expenses();
    
    -- Log the execution (optional)
    INSERT INTO recurring_expense_logs (recurring_expense_id, expense_id, scheduled_date)
    SELECT 
        gen_random_uuid(), -- Dummy ID for logging
        gen_random_uuid(), -- Dummy ID for logging
        CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'
    WHERE NOT EXISTS (
        SELECT 1 FROM recurring_expense_logs 
        WHERE scheduled_date = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'
        AND recurring_expense_id = gen_random_uuid() -- This will never match, so it's just for the WHERE clause
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run daily at midnight IST (18:30 UTC)
-- Note: This requires pg_cron extension and superuser privileges
-- Uncomment the line below if you have pg_cron enabled and superuser access
-- SELECT cron.schedule('recurring-expenses-daily', '30 18 * * *', 'SELECT schedule_recurring_expenses_daily();');

-- Alternative: Create a manual trigger function that can be called from your application
CREATE OR REPLACE FUNCTION manual_trigger_recurring_expenses()
RETURNS TABLE (
    processed_count INTEGER,
    message TEXT
) AS $$
DECLARE
    processed_count INTEGER := 0;
    expense_record RECORD;
BEGIN
    -- Get current date in IST
    DECLARE
        current_date_ist DATE := CURRENT_DATE AT TIME ZONE 'Asia/Kolkata';
    BEGIN
        -- Process all active recurring expenses for today
        FOR expense_record IN 
            SELECT * FROM recurring_expenses 
            WHERE is_active = true 
            AND remaining_occurrences > 0
            AND day_of_month = EXTRACT(DAY FROM current_date_ist)
            AND (end_date IS NULL OR end_date >= current_date_ist)
            AND start_date <= current_date_ist
        LOOP
            -- Check if expense for this month already exists
            IF NOT EXISTS (
                SELECT 1 FROM recurring_expense_logs rel
                JOIN expenses e ON rel.expense_id = e.id
                WHERE rel.recurring_expense_id = expense_record.id
                AND EXTRACT(YEAR FROM rel.scheduled_date) = EXTRACT(YEAR FROM current_date_ist)
                AND EXTRACT(MONTH FROM rel.scheduled_date) = EXTRACT(MONTH FROM current_date_ist)
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
                        current_date_ist
                    )
                    RETURNING id INTO new_expense_id;
                    
                    -- Log the creation
                    INSERT INTO recurring_expense_logs (recurring_expense_id, expense_id, scheduled_date)
                    VALUES (expense_record.id, new_expense_id, current_date_ist);
                    
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
    END;
    
    RETURN QUERY SELECT 
        processed_count,
        CASE 
            WHEN processed_count = 0 THEN 'No recurring expenses to process for today'
            WHEN processed_count = 1 THEN '1 recurring expense processed successfully'
            ELSE processed_count::TEXT || ' recurring expenses processed successfully'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view to show upcoming recurring expenses
CREATE OR REPLACE VIEW upcoming_recurring_expenses AS
SELECT 
    re.id,
    re.user_id,
    re.category,
    re.amount,
    re.description,
    re.day_of_month,
    re.remaining_occurrences,
    re.total_occurrences,
    re.is_active,
    re.start_date,
    re.end_date,
    -- Calculate next occurrence date
    CASE 
        WHEN re.day_of_month >= EXTRACT(DAY FROM CURRENT_DATE) THEN
            DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' * (re.day_of_month - 1) + INTERVAL '1 day' - INTERVAL '1 day'
        ELSE
            DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '1 month' * (re.day_of_month - 1) + INTERVAL '1 day' - INTERVAL '1 day'
    END as next_occurrence_date
FROM recurring_expenses re
WHERE re.is_active = true 
AND re.remaining_occurrences > 0
ORDER BY next_occurrence_date;

-- Create a function to get statistics about recurring expenses
CREATE OR REPLACE FUNCTION get_recurring_expenses_stats(target_user_id UUID)
RETURNS TABLE (
    total_active INTEGER,
    total_amount DECIMAL,
    next_occurrence_date DATE,
    total_processed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_active,
        COALESCE(SUM(re.amount), 0) as total_amount,
        MIN(
            CASE 
                WHEN re.day_of_month >= EXTRACT(DAY FROM CURRENT_DATE) THEN
                    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' * (re.day_of_month - 1) + INTERVAL '1 day' - INTERVAL '1 day'
                ELSE
                    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '1 month' * (re.day_of_month - 1) + INTERVAL '1 day' - INTERVAL '1 day'
            END
        )::DATE as next_occurrence_date,
        COALESCE(
            (SELECT COUNT(*)::INTEGER 
             FROM recurring_expense_logs rel 
             JOIN recurring_expenses re2 ON rel.recurring_expense_id = re2.id 
             WHERE re2.user_id = target_user_id), 
            0
        ) as total_processed
    FROM recurring_expenses re
    WHERE re.user_id = target_user_id
    AND re.is_active = true
    AND re.remaining_occurrences > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION schedule_recurring_expenses_daily() IS 'Scheduled function to run recurring expenses daily (requires pg_cron)';
COMMENT ON FUNCTION manual_trigger_recurring_expenses() IS 'Manual function to trigger recurring expenses processing';
COMMENT ON VIEW upcoming_recurring_expenses IS 'View showing upcoming recurring expenses with next occurrence dates';
COMMENT ON FUNCTION get_recurring_expenses_stats(UUID) IS 'Get statistics about user recurring expenses';

-- Example usage:
-- To manually trigger recurring expenses processing:
-- SELECT * FROM manual_trigger_recurring_expenses();

-- To get upcoming recurring expenses:
-- SELECT * FROM upcoming_recurring_expenses WHERE user_id = 'your-user-id';

-- To get recurring expenses statistics:
-- SELECT * FROM get_recurring_expenses_stats('your-user-id');



