-- Update check constraint for origem_tipo in notas_fiscais table to include 'pacote'
DO $$ 
BEGIN 
    -- Drop existing check constraint if it exists
    ALTER TABLE public.notas_fiscais DROP CONSTRAINT IF EXISTS notas_fiscais_origem_tipo_check;
    
    -- Add updated check constraint
    ALTER TABLE public.notas_fiscais ADD CONSTRAINT notas_fiscais_origem_tipo_check 
    CHECK (origem_tipo IN ('atendimento', 'banho_tosa', 'creche', 'pdv', 'pacote'));
END $$;
