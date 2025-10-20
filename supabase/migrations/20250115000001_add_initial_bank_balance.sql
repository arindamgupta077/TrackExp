-- Add initial_bank_balance column to profiles table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'initial_bank_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN initial_bank_balance DECIMAL(15,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add has_set_initial_balance column to track if user has set their initial balance
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'has_set_initial_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN has_set_initial_balance BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update existing users to have has_set_initial_balance = TRUE (they can set it later in profile)
UPDATE public.profiles 
SET has_set_initial_balance = TRUE 
WHERE has_set_initial_balance IS NULL;

-- Add comment to document the purpose of these columns
COMMENT ON COLUMN public.profiles.initial_bank_balance IS 'User''s initial bank balance amount when they first signed up';
COMMENT ON COLUMN public.profiles.has_set_initial_balance IS 'Flag to track if user has completed initial bank balance setup';
