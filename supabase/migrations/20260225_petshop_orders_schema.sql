CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    payment_status TEXT CHECK (payment_status IN ('paid', 'pending')),
    payment_method TEXT,
    financial_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view orders from their org" ON public.orders
    FOR SELECT USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert orders in their org" ON public.orders
    FOR INSERT WITH CHECK (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can view order_items from their org" ON public.order_items
    FOR SELECT USING (order_id IN (
        SELECT id FROM public.orders WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert order_items in their org" ON public.order_items
    FOR INSERT WITH CHECK (order_id IN (
        SELECT id FROM public.orders WHERE org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    ));
