-- Add discount_type to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';

-- Add discount support to veterinary consultations
ALTER TABLE public.vet_consultations ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';
ALTER TABLE public.vet_consultations ADD COLUMN IF NOT EXISTS discount_fixed DECIMAL(10,2) DEFAULT 0;

-- Add discount support to veterinary exams
ALTER TABLE public.vet_exams ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent';
ALTER TABLE public.vet_exams ADD COLUMN IF NOT EXISTS discount_fixed DECIMAL(10,2) DEFAULT 0;
