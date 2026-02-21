-- Create petshop_sales table to track pending and paid product sales to pets

CREATE TABLE IF NOT EXISTS public.petshop_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'partial')) DEFAULT 'paid',
    payment_method TEXT,
    financial_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_petshop_sales_org ON public.petshop_sales(org_id);
CREATE INDEX IF NOT EXISTS idx_petshop_sales_pet ON public.petshop_sales(pet_id);
CREATE INDEX IF NOT EXISTS idx_petshop_sales_status ON public.petshop_sales(org_id, payment_status);

-- RLS
ALTER TABLE public.petshop_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view org petshop_sales" ON public.petshop_sales
FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
);

CREATE POLICY "Admin can manage petshop_sales" ON public.petshop_sales
FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
);
