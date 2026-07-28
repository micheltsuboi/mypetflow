-- =====================================================
-- MIGRATION: 20260728_hospital_medication_catalog.sql
-- DESCRIPTION: Catálogo de Medicações de Internamento (Hospital)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hospital_medication_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    volume_ml NUMERIC(10, 2) NOT NULL DEFAULT 1,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    default_markup_percent NUMERIC(10, 2) DEFAULT 100,
    sale_price_per_ml NUMERIC(10, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_medication_catalog_org ON public.hospital_medication_catalog(org_id);

ALTER TABLE public.hospital_medication_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org hospital_medication_catalog" ON public.hospital_medication_catalog
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_medication_catalog" ON public.hospital_medication_catalog
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

-- Colunas extras no log de aplicação para auditoria de ML gastos
ALTER TABLE public.hospital_medication_logs 
ADD COLUMN IF NOT EXISTS ml_applied NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10, 2) DEFAULT 0;
