-- Migration to add health fields to pets table
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS existing_conditions TEXT,
ADD COLUMN IF NOT EXISTS vaccination_up_to_date BOOLEAN DEFAULT false;
