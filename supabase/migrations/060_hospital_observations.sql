-- MIGRATION: 060_hospital_observations.sql
-- Adiciona tabela para registrar evolução clínica (observações) no prontuário de internação

CREATE TABLE IF NOT EXISTS public.hospital_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
    observation TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_observations_org ON public.hospital_observations(org_id);
CREATE INDEX IF NOT EXISTS idx_hospital_observations_admission ON public.hospital_observations(admission_id);

ALTER TABLE public.hospital_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org hospital_observations" ON public.hospital_observations
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_observations" ON public.hospital_observations
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));
