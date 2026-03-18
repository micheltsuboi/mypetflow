-- Add color and characteristics columns to pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS characteristics TEXT;

-- Refresh schema cache (optional, but good practice if using PostgREST)
COMMENT ON TABLE public.pets IS 'Tabela de animais de estimação atualizada com cor e características';
