-- Add is_adapted column to public.pets table
-- Defaults to false so that new pets require adaptation explicitly
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS is_adapted BOOLEAN NOT NULL DEFAULT FALSE;

-- Give it a quick comment
COMMENT ON COLUMN public.pets.is_adapted IS 'Indicates if the pet has undergone the presencial adaptation process for Creche/Hotel';
