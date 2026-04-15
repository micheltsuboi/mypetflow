-- Migration 090: Add CEP to customers (tutors)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep TEXT;
COMMENT ON COLUMN public.customers.cep IS 'CEP do endereço do tutor';
