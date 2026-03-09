-- Add checkout_type to appointments to support different checkout modes
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS checkout_type VARCHAR(50);
