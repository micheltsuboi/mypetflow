-- Migration: Consolidated Cashback System
-- Includes: rules, balances, transactions, and RLS policies
-- Generated on 2026-02-25

-- 1. Create cashback rules table
CREATE TABLE IF NOT EXISTS public.cashback_rules (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid references public.organizations(id) not null,
    type text check (type in ('product','category')) not null,
    target_id text not null,
    percent numeric not null check (percent >= 0 and percent <= 100),
    validity_months integer not null default 2,
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default now()
);

-- 2. Create cashback balances table
CREATE TABLE IF NOT EXISTS public.cashbacks (
    id uuid primary key default uuid_generate_v4(),
    tutor_id uuid references public.customers(id) not null,
    org_id uuid references public.organizations(id) not null,
    balance numeric not null default 0,
    updated_at timestamp with time zone default now()
);

-- Ensure org_id exists in cashbacks if table already existed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cashbacks' AND column_name='org_id') THEN
        ALTER TABLE public.cashbacks ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- 3. Create individual transactions table
CREATE TABLE IF NOT EXISTS public.cashback_transactions (
    id uuid primary key default uuid_generate_v4(),
    tutor_id uuid references public.customers(id) not null,
    org_id uuid references public.organizations(id) not null,
    order_id uuid references public.orders(id) on delete cascade,
    amount numeric not null default 0,
    original_amount numeric not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- Ensure org_id and validity_months exists in rules if table already existed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cashback_rules' AND column_name='org_id') THEN
        ALTER TABLE public.cashback_rules ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cashback_rules' AND column_name='validity_months') THEN
        ALTER TABLE public.cashback_rules ADD COLUMN validity_months INTEGER NOT NULL DEFAULT 2;
    END IF;

    -- Drop valid_until if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cashback_rules' AND column_name='valid_until') THEN
        ALTER TABLE public.cashback_rules DROP COLUMN valid_until;
    END IF;

    -- Update target_id to TEXT if it's UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cashback_rules' AND column_name='target_id' AND data_type='uuid') THEN
        ALTER TABLE public.cashback_rules ALTER COLUMN target_id TYPE TEXT;
    END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_cashbacks_tutor_id ON public.cashbacks(tutor_id);
CREATE INDEX IF NOT EXISTS idx_cashback_rules_org_id ON public.cashback_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_cashback_transactions_tutor_expiry ON public.cashback_transactions(tutor_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_cashback_transactions_org_id ON public.cashback_transactions(org_id);

-- 5. Enable RLS
ALTER TABLE public.cashbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;

-- 6. Policies
DROP POLICY IF EXISTS "Owners can manage their org's rules" ON public.cashback_rules;
CREATE POLICY "Owners can manage their org's rules"
ON public.cashback_rules FOR ALL TO authenticated
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage their org's tutor balances" ON public.cashbacks;
CREATE POLICY "Owners can manage their org's tutor balances"
ON public.cashbacks FOR ALL TO authenticated
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage their org's cashback transactions" ON public.cashback_transactions;
CREATE POLICY "Owners can manage their org's cashback transactions"
ON public.cashback_transactions FOR ALL TO authenticated
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
