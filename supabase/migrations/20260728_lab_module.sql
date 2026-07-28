-- =====================================================
-- MIGRATION: 20260728_lab_module.sql
-- DESCRIPTION: Módulo de Laboratório (Exames, Parâmetros, Referências por Idade, Laudos e Resultados)
-- =====================================================

-- 1. TABELA: lab_exams (Catálogo de Exames)
CREATE TABLE IF NOT EXISTS public.lab_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Geral',
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_exams_org ON public.lab_exams(org_id);

-- 2. TABELA: lab_parameters (Analitos/Parâmetros do Exame)
CREATE TABLE IF NOT EXISTS public.lab_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.lab_exams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_parameters_exam ON public.lab_parameters(exam_id);

-- 3. TABELA: lab_reference_ranges (Valores de Referência por Idade / Espécie)
CREATE TABLE IF NOT EXISTS public.lab_reference_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES public.lab_parameters(id) ON DELETE CASCADE,
    species VARCHAR(50) DEFAULT 'all', -- 'dog' | 'cat' | 'other' | 'all'
    age_category VARCHAR(50) DEFAULT 'all', -- 'puppy' | 'adult' | 'senior' | 'all'
    min_value NUMERIC(12, 4),
    max_value NUMERIC(12, 4),
    text_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_reference_ranges_param ON public.lab_reference_ranges(parameter_id);

-- 4. TABELA: lab_requests (Requisições / Pedidos de Exame)
CREATE TABLE IF NOT EXISTS public.lab_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    exam_id UUID NOT NULL REFERENCES public.lab_exams(id) ON DELETE RESTRICT,
    veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'canceled'
    notes TEXT,
    conclusion TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_requests_org ON public.lab_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_pet ON public.lab_requests(pet_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON public.lab_requests(status);

-- 5. TABELA: lab_results (Resultados Medidos de cada Parâmetro)
CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.lab_requests(id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES public.lab_parameters(id) ON DELETE CASCADE,
    observed_value TEXT NOT NULL,
    is_abnormal BOOLEAN DEFAULT false,
    abnormal_type VARCHAR(20), -- 'high' | 'low' | 'text'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_req ON public.lab_results(request_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.lab_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reference_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view org lab_exams" ON public.lab_exams
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org lab_exams" ON public.lab_exams
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

CREATE POLICY "Users can view org lab_parameters" ON public.lab_parameters
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org lab_parameters" ON public.lab_parameters
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

CREATE POLICY "Users can view org lab_reference_ranges" ON public.lab_reference_ranges
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org lab_reference_ranges" ON public.lab_reference_ranges
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

CREATE POLICY "Users can view org lab_requests" ON public.lab_requests
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org lab_requests" ON public.lab_requests
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

CREATE POLICY "Users can view org lab_results" ON public.lab_results
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org lab_results" ON public.lab_results
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));
