-- Adiciona colunas de desconto e método de pagamento à tabela vet_exams
ALTER TABLE public.vet_exams ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';
ALTER TABLE public.vet_exams ADD COLUMN IF NOT EXISTS discount_fixed DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.vet_exams ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Garante que vet_consultations também tenha se necessário
ALTER TABLE public.vet_consultations ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';
ALTER TABLE public.vet_consultations ADD COLUMN IF NOT EXISTS discount_fixed DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.vet_consultations ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
