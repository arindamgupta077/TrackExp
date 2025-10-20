-- Create a function to delete a user and all their associated data
-- This function should be called by authenticated users to delete their own account

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_to_delete uuid;
BEGIN
    -- Get the current user's ID
    user_id_to_delete := auth.uid();
    
    -- Check if user is authenticated
    IF user_id_to_delete IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to delete account';
    END IF;
    
    -- Delete from all user-related tables (with error handling for missing tables)
    BEGIN
        DELETE FROM profiles WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from profiles';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table profiles does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from profiles: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM expenses WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from expenses';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table expenses does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from expenses: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM credits WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from credits';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table credits does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from credits: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM credit_card WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from credit_card';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table credit_card does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from credit_card: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM monthly_unassigned_credits WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from monthly_unassigned_credits';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table monthly_unassigned_credits does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from monthly_unassigned_credits: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM recurring_expenses WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from recurring_expenses';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table recurring_expenses does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from recurring_expenses: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM categories WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from categories';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table categories does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from categories: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM budgets WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from budgets';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table budgets does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from budgets: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM budget_alerts WHERE user_id = user_id_to_delete;
        RAISE NOTICE 'Deleted from budget_alerts';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table budget_alerts does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from budget_alerts: %', SQLERRM;
    END;
    
    BEGIN
        -- Delete recurring expense logs by joining with recurring_expenses table
        DELETE FROM recurring_expense_logs 
        WHERE recurring_expense_id IN (
            SELECT id FROM recurring_expenses WHERE user_id = user_id_to_delete
        );
        RAISE NOTICE 'Deleted from recurring_expense_logs';
    EXCEPTION
        WHEN undefined_table THEN 
            RAISE NOTICE 'Table recurring_expense_logs does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from recurring_expense_logs: %', SQLERRM;
    END;
    
    -- Delete from auth.users (this will also trigger any cascade deletes)
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    
    -- Log the deletion (optional)
    RAISE NOTICE 'User account deleted: %', user_id_to_delete;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE EXCEPTION 'Failed to delete user account: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION delete_user() IS 'Deletes the current authenticated user and all their associated data. This is a destructive operation that cannot be undone.';
