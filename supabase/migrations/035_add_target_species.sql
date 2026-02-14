-- Migration: Add target_species to services table
-- Enables filtering services by pet species (dog, cat, both)

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS target_species TEXT CHECK (target_species IN ('dog', 'cat', 'both')) DEFAULT 'both';

-- Update existing services based on their category or name (heuristic)
-- This is a best-effort update for existing data
UPDATE public.services 
SET target_species = 'dog' 
WHERE 
  name ILIKE '%tosa%' OR 
  category = 'creche'; -- Usually daycare is for dogs primarily, but can be adjusted

-- You might want to manually review services after this migration
