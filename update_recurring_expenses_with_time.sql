-- Update recurring_expenses table to include time scheduling
-- Add time_of_day column to store the exact time when expense should be created

ALTER TABLE recurring_expenses 
ADD COLUMN IF NOT EXISTS time_of_day TIME DEFAULT '00:00:00';

-- Update the comment for the table
COMMENT ON COLUMN recurring_expenses.time_of_day IS 'Time of day when the expense should be created (24-hour format)';

-- Update the create_recurring_expenses function to handle time-based scheduling
CREATE OR REPLACE FUNCTION create_recurring_expenses()
RETURNS void AS $$
DECLARE
    recurring_record RECORD;
    expense_datetime TIMESTAMP WITH TIME ZONE;
    current_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current datetime in IST
    current_datetime := NOW() AT TIME ZONE 'Asia/Kolkata';
    
    -- Find all active recurring expenses that should be processed at the current time
    FOR recurring_record IN 
        SELECT * FROM recurring_expenses 
        WHERE is_active = true 
        AND remaining_occurrences > 0
        AND day_of_month = EXTRACT(DAY FROM current_datetime)
        AND time_of_day = current_datetime::TIME
        AND (end_date IS NULL OR end_date >= current_datetime::DATE)
        AND start_date <= current_datetime::DATE
    LOOP
        -- Create the expense datetime by combining the current date with the scheduled time
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
                
                -- Log the creation with the exact datetime
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
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the get_user_recurring_expenses function to include time_of_day
DROP FUNCTION IF EXISTS get_user_recurring_expenses(UUID);

CREATE FUNCTION get_user_recurring_expenses(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    category VARCHAR(50),
    amount DECIMAL(10,2),
    description TEXT,
    day_of_month INTEGER,
    time_of_day TIME,
    total_occurrences INTEGER,
    remaining_occurrences INTEGER,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        re.id,
        re.category,
        re.amount,
        re.description,
        re.day_of_month,
        re.time_of_day,
        re.total_occurrences,
        re.remaining_occurrences,
        re.start_date,
        re.end_date,
        re.is_active,
        re.created_at,
        re.updated_at
    FROM recurring_expenses re
    WHERE re.user_id = target_user_id
    ORDER BY re.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the update_recurring_expense function to include time_of_day
DROP FUNCTION IF EXISTS update_recurring_expense(UUID, VARCHAR, DECIMAL, TEXT, INTEGER, INTEGER);

CREATE FUNCTION update_recurring_expense(
    expense_id UUID,
    new_category VARCHAR(50),
    new_amount DECIMAL(10,2),
    new_description TEXT,
    new_day_of_month INTEGER,
    new_time_of_day TIME,
    new_total_occurrences INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_used_occurrences INTEGER;
    new_remaining_occurrences INTEGER;
BEGIN
    -- Check if user owns this recurring expense
    IF NOT EXISTS (
        SELECT 1 FROM recurring_expenses 
        WHERE id = expense_id AND user_id = auth.uid()
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate how many occurrences have been used
    SELECT (total_occurrences - remaining_occurrences) INTO current_used_occurrences
    FROM recurring_expenses 
    WHERE id = expense_id;
    
    -- Calculate new remaining occurrences
    new_remaining_occurrences := new_total_occurrences - current_used_occurrences;
    
    -- Update the recurring expense
    UPDATE recurring_expenses 
    SET 
        category = new_category,
        amount = new_amount,
        description = new_description,
        day_of_month = new_day_of_month,
        time_of_day = new_time_of_day,
        total_occurrences = new_total_occurrences,
        remaining_occurrences = GREATEST(0, new_remaining_occurrences),
        updated_at = NOW()
    WHERE id = expense_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the manual trigger function to handle time-based scheduling
DROP FUNCTION IF EXISTS manual_trigger_recurring_expenses();

CREATE FUNCTION manual_trigger_recurring_expenses()
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
    -- Get current datetime in IST
    current_datetime := NOW() AT TIME ZONE 'Asia/Kolkata';
    
    -- Process all active recurring expenses for today at the current time
    FOR expense_record IN 
        SELECT * FROM recurring_expenses 
        WHERE is_active = true 
        AND remaining_occurrences > 0
        AND day_of_month = EXTRACT(DAY FROM current_datetime)
        AND time_of_day = current_datetime::TIME
        AND (end_date IS NULL OR end_date >= current_datetime::DATE)
        AND start_date <= current_datetime::DATE
    LOOP
        -- Create the expense datetime by combining the current date with the scheduled time
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
            WHEN processed_count = 0 THEN 'No recurring expenses to process for the current time'
            WHEN processed_count = 1 THEN '1 recurring expense processed successfully'
            ELSE processed_count::TEXT || ' recurring expenses processed successfully'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the upcoming_recurring_expenses view to include time information
DROP VIEW IF EXISTS upcoming_recurring_expenses;

CREATE VIEW upcoming_recurring_expenses AS
SELECT 
    re.id,
    re.user_id,
    re.category,
    re.amount,
    re.description,
    re.day_of_month,
    re.time_of_day,
    re.remaining_occurrences,
    re.total_occurrences,
    re.is_active,
    re.start_date,
    re.end_date,
    -- Calculate next occurrence datetime
    CASE 
        WHEN re.day_of_month >= EXTRACT(DAY FROM CURRENT_DATE) THEN
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day' * (re.day_of_month - 1) + re.time_of_day)::TIMESTAMP
        ELSE
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '1 day' * (re.day_of_month - 1) + re.time_of_day)::TIMESTAMP
    END as next_occurrence_datetime
FROM recurring_expenses re
WHERE re.is_active = true 
AND re.remaining_occurrences > 0
ORDER BY next_occurrence_datetime;

-- Add comments for the new time functionality
COMMENT ON COLUMN recurring_expenses.time_of_day IS 'Time of day when the expense should be created (24-hour format, e.g., 09:30:00 for 9:30 AM)';
COMMENT ON FUNCTION create_recurring_expenses() IS 'Automatically creates expenses from active recurring expense schedules at the specified time';
COMMENT ON FUNCTION manual_trigger_recurring_expenses() IS 'Manually triggers recurring expenses processing for the current time';

-- Example usage with time:
-- To create a recurring expense that runs at 9:30 AM every 1st of the month:
-- INSERT INTO recurring_expenses (user_id, category, amount, day_of_month, time_of_day, total_occurrences, remaining_occurrences, start_date)
-- VALUES ('user-id', 'SIP', 25000, 1, '09:30:00', 12, 12, CURRENT_DATE);

-- To create a recurring expense that runs at 6:00 PM every 15th of the month:
-- INSERT INTO recurring_expenses (user_id, category, amount, day_of_month, time_of_day, total_occurrences, remaining_occurrences, start_date)
-- VALUES ('user-id', 'Rent', 15000, 15, '18:00:00', 24, 24, CURRENT_DATE);
