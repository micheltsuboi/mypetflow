-- Adicionar payment_method em vet_consultations
ALTER TABLE public.vet_consultations 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix';
