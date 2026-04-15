-- Migration: Suporte a Pagamentos Parciais
-- 094_add_partial_payments_schema.sql

DO $$ 
BEGIN
    -- 1. Atualizar financial_transactions
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'financial_transactions' AND COLUMN_NAME = 'reference_type') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN reference_type TEXT;
        CREATE INDEX IF NOT EXISTS idx_financial_transactions_ref ON public.financial_transactions(reference_id, reference_type);
    END IF;

    -- 2. Atualizar vet_consultations
    -- Removemos qualquer constraint anterior para evitar conflitos
    ALTER TABLE public.vet_consultations DROP CONSTRAINT IF EXISTS vet_consultations_payment_status_check;
    ALTER TABLE public.vet_consultations ADD CONSTRAINT vet_consultations_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled'));

    -- 3. Atualizar appointments
    ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_payment_status_check;
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'partial'));

    -- 4. Atualizar customer_packages
    ALTER TABLE public.customer_packages DROP CONSTRAINT IF EXISTS customer_packages_payment_status_check;
    ALTER TABLE public.customer_packages ADD CONSTRAINT customer_packages_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled', 'refunded'));

    -- 5. Atualizar pet_vaccines
    ALTER TABLE public.pet_vaccines DROP CONSTRAINT IF EXISTS pet_vaccines_payment_status_check;
    ALTER TABLE public.pet_vaccines ADD CONSTRAINT pet_vaccines_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'partial'));

END $$;
