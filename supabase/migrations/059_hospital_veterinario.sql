-- =====================================================
-- MIGRATION: 059_hospital_veterinario.sql
-- DESCRIPTION: Módulo de Hospital Veterinário (Internamento, Leitos, Medicações, D&D)
-- =====================================================

-- 1. TABELA: hospital_wards (Setores / Alas)
CREATE TABLE IF NOT EXISTS public.hospital_wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_wards_org ON public.hospital_wards(org_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hospital_wards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. TABELA: hospital_beds (Leitos / Card)
CREATE TABLE IF NOT EXISTS public.hospital_beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ward_id UUID NOT NULL REFERENCES public.hospital_wards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'available', -- 'available' | 'occupied' | 'maintenance'
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_beds_org ON public.hospital_beds(org_id);
CREATE INDEX IF NOT EXISTS idx_hospital_beds_ward ON public.hospital_beds(ward_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hospital_beds
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. TABELA: hospital_admissions (Internações ativas e histórico)
CREATE TABLE IF NOT EXISTS public.hospital_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES public.hospital_beds(id) ON DELETE RESTRICT,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    vet_consultation_id UUID REFERENCES public.vet_consultations(id) ON DELETE SET NULL,
    veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL,
    admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    discharged_at TIMESTAMPTZ,
    reason TEXT,
    severity VARCHAR(50) DEFAULT 'low', -- 'low' | 'medium' | 'high' | 'critical'
    status VARCHAR(50) DEFAULT 'active', -- 'active' | 'discharged'
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_admissions_org ON public.hospital_admissions(org_id);
CREATE INDEX IF NOT EXISTS idx_hospital_admissions_bed ON public.hospital_admissions(bed_id);
CREATE INDEX IF NOT EXISTS idx_hospital_admissions_pet ON public.hospital_admissions(pet_id);
CREATE INDEX IF NOT EXISTS idx_hospital_admissions_status ON public.hospital_admissions(status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hospital_admissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. TABELA: hospital_medications (Medicamentos prescritos no internamento)
CREATE TABLE IF NOT EXISTS public.hospital_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency_hours INTEGER,
    next_dose_at TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_medications_org ON public.hospital_medications(org_id);
CREATE INDEX IF NOT EXISTS idx_hospital_medications_admission ON public.hospital_medications(admission_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hospital_medications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. TABELA: hospital_medication_logs (Log de aplicação de doses)
CREATE TABLE IF NOT EXISTS public.hospital_medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.hospital_medications(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_medication_logs_org ON public.hospital_medication_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_hospital_medication_logs_med ON public.hospital_medication_logs(medication_id);

-- 6. TABELA: hospital_bed_movements (Histórico de Movimentação do pet - Drag & Drop)
CREATE TABLE IF NOT EXISTS public.hospital_bed_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
    from_bed_id UUID REFERENCES public.hospital_beds(id) ON DELETE SET NULL,
    to_bed_id UUID NOT NULL REFERENCES public.hospital_beds(id) ON DELETE CASCADE,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    moved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_bed_movements_org ON public.hospital_bed_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_hospital_bed_movements_admission ON public.hospital_bed_movements(admission_id);


-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.hospital_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_bed_movements ENABLE ROW LEVEL SECURITY;

-- Wards
CREATE POLICY "Users can view org hospital_wards" ON public.hospital_wards
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_wards" ON public.hospital_wards
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

-- Beds
CREATE POLICY "Users can view org hospital_beds" ON public.hospital_beds
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_beds" ON public.hospital_beds
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

-- Admissions
CREATE POLICY "Users can view org hospital_admissions" ON public.hospital_admissions
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_admissions" ON public.hospital_admissions
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

-- Medications
CREATE POLICY "Users can view org hospital_medications" ON public.hospital_medications
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_medications" ON public.hospital_medications
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

-- Medication Logs
CREATE POLICY "Users can view org hospital_medication_logs" ON public.hospital_medication_logs
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_medication_logs" ON public.hospital_medication_logs
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

-- Bed Movements
CREATE POLICY "Users can view org hospital_bed_movements" ON public.hospital_bed_movements
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage org hospital_bed_movements" ON public.hospital_bed_movements
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));
