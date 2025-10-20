-- =====================================================
-- FRONTEND-TRIGGERED AUTOMATION SOLUTION
-- =====================================================

-- This solution processes recurring expenses when users interact with the app
-- No need for pg_cron extension

-- Create a function that can be called from the frontend
CREATE OR REPLACE FUNCTION process_recurring_expenses_for_user(target_user_id UUID)
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
    
    -- Process all active recurring expenses for today for this user
    FOR expense_record IN 
        SELECT * FROM recurring_expenses 
        WHERE user_id = target_user_id
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

-- Create a simpler function for frontend calls
CREATE OR REPLACE FUNCTION check_and_process_recurring_expenses()
RETURNS TABLE (
    processed_count INTEGER,
    message TEXT
) AS $$
DECLARE
    result RECORD;
BEGIN
    -- Process recurring expenses for the current user
    SELECT * INTO result FROM process_recurring_expenses_for_user(auth.uid());
    
    RETURN QUERY SELECT result.processed_count, result.message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 'Testing frontend automation...' as status;
SELECT * FROM check_and_process_recurring_expenses();



