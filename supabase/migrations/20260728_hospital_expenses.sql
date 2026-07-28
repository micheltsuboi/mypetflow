-- =====================================================
-- MIGRATION: 20260728_hospital_expenses.sql
-- DESCRIPTION: Lançamentos Diversos / Despesas Avulsas no Internamento (Hospital)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hospital_admission_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_admission_expenses_org ON public.hospital_admission_expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_hospital_admission_expenses_adm ON public.hospital_admission_expenses(admission_id);

ALTER TABLE public.hospital_admission_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org hospital_admission_expenses" ON public.hospital_admission_expenses
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_admission_expenses" ON public.hospital_admission_expenses
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));
