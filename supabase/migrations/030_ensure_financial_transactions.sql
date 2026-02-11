-- Ensure financial_transactions table exists and is correctly configured
-- This migration re-runs the creation logic from 003 but with IF NOT EXISTS to be safe

DO $$
BEGIN
    -- 1. Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.financial_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
        category TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        payment_method TEXT,
        date TIMESTAMPTZ DEFAULT now(),
        created_by UUID REFERENCES public.profiles(id),
        reference_id UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- 2. Create indices if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_org_date') THEN
        CREATE INDEX idx_transactions_org_date ON public.financial_transactions(org_id, date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_type') THEN
        CREATE INDEX idx_transactions_type ON public.financial_transactions(org_id, type);
    END IF;

    -- 3. Ensure RLS is enabled
    ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

    -- 4. Re-create policies (dropping first to ensure they are correct)
    DROP POLICY IF EXISTS "Users can view org transactions" ON public.financial_transactions;
    DROP POLICY IF EXISTS "Admin can view org transactions" ON public.financial_transactions;
    DROP POLICY IF EXISTS "Admin can manage transactions" ON public.financial_transactions;

    CREATE POLICY "Admin can view org transactions" ON public.financial_transactions
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
    );

    CREATE POLICY "Admin can manage transactions" ON public.financial_transactions
    FOR ALL USING (
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
    );

END $$;
