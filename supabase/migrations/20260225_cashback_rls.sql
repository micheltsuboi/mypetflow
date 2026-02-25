-- Migration: Enable RLS and add org_id to cashbacks for isolation
-- Generated on 2026-02-25

-- 1. Add org_id to cashbacks if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cashbacks' AND column_name='org_id') THEN
        ALTER TABLE public.cashbacks ADD COLUMN org_id UUID REFERENCES organizations(id);
    END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE public.cashbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies for cashback_rules
DROP POLICY IF EXISTS "Owners can manage their org's rules" ON public.cashback_rules;
CREATE POLICY "Owners can manage their org's rules"
ON public.cashback_rules
FOR ALL
TO authenticated
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Create Policies for cashbacks
DROP POLICY IF EXISTS "Owners can manage their org's tutor balances" ON public.cashbacks;
CREATE POLICY "Owners can manage their org's tutor balances"
ON public.cashbacks
FOR ALL
TO authenticated
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Create Policies for cashback_transactions
DROP POLICY IF EXISTS "Owners can manage their org's cashback transactions" ON public.cashback_transactions;
CREATE POLICY "Owners can manage their org's cashback transactions"
ON public.cashback_transactions
FOR ALL
TO authenticated
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
