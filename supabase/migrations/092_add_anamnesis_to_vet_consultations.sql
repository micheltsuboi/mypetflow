-- Adiciona campo de anamnese na tabela de consultas veterinárias
ALTER TABLE public.vet_consultations 
ADD COLUMN IF NOT EXISTS anamnesis TEXT;
