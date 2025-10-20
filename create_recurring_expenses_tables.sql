-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    total_occurrences INTEGER NOT NULL CHECK (total_occurrences > 0),
    remaining_occurrences INTEGER NOT NULL CHECK (remaining_occurrences >= 0),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recurring_expense_logs table to track when expenses were created
CREATE TABLE IF NOT EXISTS recurring_expense_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_day_of_month ON recurring_expenses(day_of_month);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_logs_recurring_id ON recurring_expense_logs(recurring_expense_id);

-- Enable Row Level Security
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expense_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recurring_expenses
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring expenses" ON recurring_expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring expenses" ON recurring_expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring expenses" ON recurring_expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for recurring_expense_logs
CREATE POLICY "Users can view their own recurring expense logs" ON recurring_expense_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recurring_expenses 
            WHERE recurring_expenses.id = recurring_expense_logs.recurring_expense_id 
            AND recurring_expenses.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert recurring expense logs" ON recurring_expense_logs
    FOR INSERT WITH CHECK (true);

-- Create function to automatically create expenses from recurring expenses
CREATE OR REPLACE FUNCTION create_recurring_expenses()
RETURNS void AS $$
DECLARE
    recurring_record RECORD;
    expense_date DATE;
    new_expense_id UUID;
BEGIN
    -- Get current date in IST
    expense_date := CURRENT_DATE AT TIME ZONE 'Asia/Kolkata';
    
    -- Find all active recurring expenses that should be processed today
    FOR recurring_record IN 
        SELECT * FROM recurring_expenses 
        WHERE is_active = true 
        AND remaining_occurrences > 0
        AND day_of_month = EXTRACT(DAY FROM expense_date)
        AND (end_date IS NULL OR end_date >= expense_date)
        AND start_date <= expense_date
    LOOP
        -- Check if expense for this month already exists
        IF NOT EXISTS (
            SELECT 1 FROM recurring_expense_logs rel
            JOIN expenses e ON rel.expense_id = e.id
            WHERE rel.recurring_expense_id = recurring_record.id
            AND EXTRACT(YEAR FROM rel.scheduled_date) = EXTRACT(YEAR FROM expense_date)
            AND EXTRACT(MONTH FROM rel.scheduled_date) = EXTRACT(MONTH FROM expense_date)
        ) THEN
            -- Create the expense
            INSERT INTO expenses (user_id, category, amount, description, date)
            VALUES (
                recurring_record.user_id,
                recurring_record.category,
                recurring_record.amount,
                COALESCE(recurring_record.description, 'Recurring expense - ' || recurring_record.category),
                expense_date
            )
            RETURNING id INTO new_expense_id;
            
            -- Log the creation
            INSERT INTO recurring_expense_logs (recurring_expense_id, expense_id, scheduled_date)
            VALUES (recurring_record.id, new_expense_id, expense_date);
            
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
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to get recurring expenses for a user
CREATE OR REPLACE FUNCTION get_user_recurring_expenses(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    category VARCHAR(50),
    amount DECIMAL(10,2),
    description TEXT,
    day_of_month INTEGER,
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

-- Create function to update recurring expense
CREATE OR REPLACE FUNCTION update_recurring_expense(
    expense_id UUID,
    new_category VARCHAR(50),
    new_amount DECIMAL(10,2),
    new_description TEXT,
    new_day_of_month INTEGER,
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
        total_occurrences = new_total_occurrences,
        remaining_occurrences = GREATEST(0, new_remaining_occurrences),
        updated_at = NOW()
    WHERE id = expense_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete recurring expense
CREATE OR REPLACE FUNCTION delete_recurring_expense(expense_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns this recurring expense
    IF NOT EXISTS (
        SELECT 1 FROM recurring_expenses 
        WHERE id = expense_id AND user_id = auth.uid()
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Delete the recurring expense (cascade will handle logs)
    DELETE FROM recurring_expenses WHERE id = expense_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job function (this would typically be set up in your application or using pg_cron extension)
-- For now, we'll create a manual trigger function
CREATE OR REPLACE FUNCTION trigger_recurring_expenses()
RETURNS void AS $$
BEGIN
    PERFORM create_recurring_expenses();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE recurring_expenses IS 'Stores recurring expense schedules for users';
COMMENT ON TABLE recurring_expense_logs IS 'Logs when recurring expenses are automatically created';
COMMENT ON FUNCTION create_recurring_expenses() IS 'Automatically creates expenses from active recurring expense schedules';
COMMENT ON FUNCTION get_user_recurring_expenses(UUID) IS 'Returns all recurring expenses for a specific user';
COMMENT ON FUNCTION update_recurring_expense(UUID, VARCHAR, DECIMAL, TEXT, INTEGER, INTEGER) IS 'Updates a recurring expense schedule';
COMMENT ON FUNCTION delete_recurring_expense(UUID) IS 'Deletes a recurring expense schedule';



