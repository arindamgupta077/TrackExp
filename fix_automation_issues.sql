-- =====================================================
-- COMPREHENSIVE FIX FOR EXPENSE AUTOMATION ISSUES
-- =====================================================

-- This script addresses the most common issues with expense automation
-- Run this in your Supabase SQL Editor

-- =====================================================
-- ISSUE 1: Missing Tables and Functions
-- =====================================================

-- Check if we need to create the basic tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expenses') THEN
        RAISE NOTICE 'Creating recurring_expenses table...';
        
        -- Create recurring_expenses table
        CREATE TABLE IF NOT EXISTS recurring_expenses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            category VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
            description TEXT,
            day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
            time_of_day TIME DEFAULT '00:00:00',
            total_occurrences INTEGER NOT NULL CHECK (total_occurrences > 0),
            remaining_occurrences INTEGER NOT NULL CHECK (remaining_occurrences >= 0),
            start_date DATE NOT NULL DEFAULT CURRENT_DATE,
            end_date DATE,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Create recurring_expense_logs table
        CREATE TABLE IF NOT EXISTS recurring_expense_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
            expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
            scheduled_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
        ALTER TABLE recurring_expense_logs ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies (drop first if they exist)
        DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
        DROP POLICY IF EXISTS "Users can create their own recurring expenses" ON recurring_expenses;
        DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
        DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;
        DROP POLICY IF EXISTS "Users can view their own recurring expense logs" ON recurring_expense_logs;
        DROP POLICY IF EXISTS "System can create recurring expense logs" ON recurring_expense_logs;
        
        CREATE POLICY "Users can view their own recurring expenses" 
        ON recurring_expenses FOR SELECT 
        USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can create their own recurring expenses" 
        ON recurring_expenses FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own recurring expenses" 
        ON recurring_expenses FOR UPDATE 
        USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own recurring expenses" 
        ON recurring_expenses FOR DELETE 
        USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can view their own recurring expense logs" 
        ON recurring_expense_logs FOR SELECT 
        USING (auth.uid() = (SELECT user_id FROM recurring_expenses WHERE id = recurring_expense_id));
        
        CREATE POLICY "System can create recurring expense logs" 
        ON recurring_expense_logs FOR INSERT 
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Tables created successfully';
    ELSE
        RAISE NOTICE '✅ Tables already exist';
    END IF;
END $$;

-- =====================================================
-- ISSUE 2: Missing time_of_day column
-- =====================================================

-- Add time_of_day column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_expenses' AND column_name = 'time_of_day'
    ) THEN
        RAISE NOTICE 'Adding time_of_day column...';
        ALTER TABLE recurring_expenses ADD COLUMN time_of_day TIME DEFAULT '00:00:00';
        RAISE NOTICE '✅ time_of_day column added';
    ELSE
        RAISE NOTICE '✅ time_of_day column already exists';
    END IF;
END $$;

-- =====================================================
-- ISSUE 3: Missing or Incorrect Functions
-- =====================================================

-- Create the main processing function
CREATE OR REPLACE FUNCTION create_recurring_expenses()
RETURNS void AS $$
DECLARE
    recurring_record RECORD;
    expense_datetime TIMESTAMP WITH TIME ZONE;
    current_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current datetime
    current_datetime := NOW();
    
    -- Find all active recurring expenses that should be processed
    -- FIXED: Process expenses that are due today, regardless of exact time
    FOR recurring_record IN 
        SELECT * FROM recurring_expenses 
        WHERE is_active = true 
        AND remaining_occurrences > 0
        AND day_of_month = EXTRACT(DAY FROM current_datetime)
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

-- Create manual trigger function
CREATE OR REPLACE FUNCTION manual_trigger_recurring_expenses()
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

-- Create helper functions
CREATE OR REPLACE FUNCTION get_user_recurring_expenses(target_user_id UUID)
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

-- =====================================================
-- ISSUE 4: Test the Fix
-- =====================================================

-- Test manual processing
DO $$
DECLARE
    result RECORD;
BEGIN
    RAISE NOTICE '=== TESTING MANUAL PROCESSING ===';
    SELECT * INTO result FROM manual_trigger_recurring_expenses();
    RAISE NOTICE 'Result: % expenses processed - %', result.processed_count, result.message;
END $$;

-- =====================================================
-- ISSUE 5: Show Current Status
-- =====================================================

-- Show current recurring expenses
SELECT 
    '=== CURRENT RECURRING EXPENSES ===' as info,
    id,
    category,
    amount,
    day_of_month,
    time_of_day,
    remaining_occurrences,
    total_occurrences,
    is_active,
    start_date
FROM recurring_expenses 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Show what should be processed today
SELECT 
    '=== EXPENSES DUE TODAY ===' as info,
    id,
    category,
    amount,
    day_of_month,
    time_of_day,
    remaining_occurrences,
    CASE 
        WHEN day_of_month = EXTRACT(DAY FROM CURRENT_DATE) THEN '✅ Due today'
        ELSE '⏳ Not today'
    END as status
FROM recurring_expenses 
WHERE user_id = auth.uid()
AND is_active = true
AND remaining_occurrences > 0
AND day_of_month = EXTRACT(DAY FROM CURRENT_DATE)
ORDER BY time_of_day;

-- Show recent automation logs
SELECT 
    '=== RECENT AUTOMATION LOGS ===' as info,
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
-- FINAL STATUS
-- =====================================================

SELECT 
    '🎉 AUTOMATION FIX COMPLETE' as status,
    'Your expense automation should now work for the current month!' as message,
    'Use manual_trigger_recurring_expenses() to test processing' as next_step;
