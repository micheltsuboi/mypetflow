-- Migration: Cashback History Table and Consolidated Schema
-- Generated on 2026-02-25

-- 1. Create cashback_history table
CREATE TABLE IF NOT EXISTS public.cashback_history (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid references public.organizations(id) not null,
    tutor_id uuid references public.customers(id) not null,
    order_id uuid references public.orders(id) on delete cascade,
    type text check (type in ('earn', 'spend', 'expire')) not null,
    amount numeric not null,
    description text,
    created_at timestamp with time zone default now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_cashback_history_tutor_id ON public.cashback_history(tutor_id);
CREATE INDEX IF NOT EXISTS idx_cashback_history_org_id ON public.cashback_history(org_id);

-- 3. Enable RLS
ALTER TABLE public.cashback_history ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Owners can manage their org's history" ON public.cashback_history;
CREATE POLICY "Owners can manage their org's history"
ON public.cashback_history FOR ALL TO authenticated
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Add any missing columns to previous tables (redundant but safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cashbacks' AND column_name='org_id') THEN
        ALTER TABLE public.cashbacks ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;
