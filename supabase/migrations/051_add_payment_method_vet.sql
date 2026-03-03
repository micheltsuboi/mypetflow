-- Adicionar forma de pagamento às consultas e exames
ALTER TABLE public.vet_consultations 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'; -- 'cash', 'credit', 'debit', 'pix'

ALTER TABLE public.vet_exams
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
