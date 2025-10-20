-- Create credit_card table with same structure as expenses table
CREATE TABLE public.credit_card (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_card ENABLE ROW LEVEL SECURITY;

-- Create policies for credit_card table
CREATE POLICY "Users can view their own credit card expenses" 
ON public.credit_card 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit card expenses" 
ON public.credit_card 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card expenses" 
ON public.credit_card 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card expenses" 
ON public.credit_card 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger to update updated_at column
CREATE TRIGGER update_credit_card_updated_at
  BEFORE UPDATE ON public.credit_card
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
