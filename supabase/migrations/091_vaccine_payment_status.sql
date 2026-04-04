-- =====================================================
-- MIGRATION: 091_vaccine_payment_status.sql
-- Adiciona suporte a status de pagamento e valor na pet_vaccines
-- =====================================================

ALTER TABLE public.pet_vaccines
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending')),
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Comentário para documentação do campo
COMMENT ON COLUMN public.pet_vaccines.payment_status IS 'Status do pagamento da vacina: paid ou pending';
COMMENT ON COLUMN public.pet_vaccines.price IS 'Valor cobrado pela vacina no momento do registro';
COMMENT ON COLUMN public.pet_vaccines.payment_method IS 'Método de pagamento utilizado (pix, credit, etc) ou NULL se pending';
