-- Run this SQL script in your Supabase SQL Editor to update existing categories with proper icons

-- First, add the icon column if it doesn't exist
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📦';

-- Update existing categories with appropriate icons based on their names
UPDATE public.categories 
SET icon = CASE 
  -- Default categories
  WHEN LOWER(name) = 'food' THEN '🍽️'
  WHEN LOWER(name) = 'transportation' THEN '🚌'
  WHEN LOWER(name) = 'shopping' THEN '🛒'
  WHEN LOWER(name) = 'entertainment' THEN '🎬'
  WHEN LOWER(name) = 'health' THEN '🏥'
  WHEN LOWER(name) = 'travel' THEN '✈️'
  WHEN LOWER(name) = 'education' THEN '📚'
  WHEN LOWER(name) = 'other' THEN '📦'
  
  -- Custom categories from the user's list
  WHEN LOWER(name) = 'clothing' THEN '👕'
  WHEN LOWER(name) = 'cloud' THEN '☁️'
  WHEN LOWER(name) = 'dinning & entertainment' OR LOWER(name) = 'dining & entertainment' THEN '🍴'
  WHEN LOWER(name) = 'e fund saving in bank' THEN '🏦'
  WHEN LOWER(name) = 'house rent' THEN '🏠'
  WHEN LOWER(name) = 'loan / emi' THEN '💰'
  WHEN LOWER(name) = 'living cost - food' THEN '🥘'
  WHEN LOWER(name) = 'household essentials' THEN '🏡'
  WHEN LOWER(name) = 'house maintenance/repair' THEN '🔧'
  WHEN LOWER(name) = 'phone recharge' THEN '📱'
  WHEN LOWER(name) = 'electric bill' THEN '⚡'
  WHEN LOWER(name) = 'salon/grooming' THEN '💇‍♂️'
  WHEN LOWER(name) = 'internet bill' THEN '🌐'
  WHEN LOWER(name) = 'parent maintenance' THEN '👨‍👩‍👧‍👦'
  WHEN LOWER(name) = 'medicine & healthcare' THEN '💊'
  WHEN LOWER(name) = 'gym subscription' THEN '💪'
  WHEN LOWER(name) = 'protein/fitness needs' THEN '🥤'
  WHEN LOWER(name) = 'petrol & bike maintenance' THEN '🏍️'
  WHEN LOWER(name) = 'petrol & car maintenance' THEN '🚗'
  WHEN LOWER(name) = 'subscription' THEN '📺'
  WHEN LOWER(name) = 'transport' THEN '🚌'
  WHEN LOWER(name) = 'sip' THEN '📈'
  WHEN LOWER(name) = 'celebration expense' THEN '🎉'
  WHEN LOWER(name) = 'mediclaim' THEN '🏥'
  WHEN LOWER(name) = 'upkill myself' THEN '🎓'
  WHEN LOWER(name) = 'emergency fund savings' THEN '🆘'
  WHEN LOWER(name) = 'travel saving' THEN '✈️💰'
  WHEN LOWER(name) = 'gifting cost' THEN '🎁'
  WHEN LOWER(name) = 'personal expense' THEN '👤'
  WHEN LOWER(name) = 'miscellaneous' THEN '📦'
  WHEN LOWER(name) = 'travel expense' THEN '🧳'
  WHEN LOWER(name) = 'beauty & parlour' THEN '💄'
  WHEN LOWER(name) = 'utilities' THEN '💡'
  WHEN LOWER(name) = 'family' THEN '👪'
  WHEN LOWER(name) = 'child' THEN '👶'
  WHEN LOWER(name) = 'entertainment & hobbies' THEN '🎮'
  WHEN LOWER(name) = 'extra curriculum activity' THEN '🎨'
  WHEN LOWER(name) = 'technology' THEN '💻'
  WHEN LOWER(name) = 'marketing' THEN '📢'
  WHEN LOWER(name) = 'business' THEN '💼'
  
  -- Fallback for any other categories
  ELSE '📦'
END
WHERE icon IS NULL OR icon = '📦';

-- Verify the update
SELECT name, icon FROM public.categories ORDER BY name;
