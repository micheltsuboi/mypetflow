-- =====================================================
-- MIGRATION: 048_veterinary_module.sql
-- Módulo Clínica Veterinária: Veterinários, Consultas, Prontuários, Exames
-- =====================================================

-- =====================================================
-- 1. TABELA: veterinarians (Cadastro de Veterinários)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.veterinarians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crmv TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  consultation_base_price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_veterinarians_org ON public.veterinarians(org_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.veterinarians
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 2. TABELA: vet_consultations (Consultas / Ficha Médica)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vet_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL,
  consultation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  notes TEXT,
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending', -- 'pending' | 'paid'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vet_consultations_pet ON public.vet_consultations(pet_id);
CREATE INDEX IF NOT EXISTS idx_vet_consultations_org ON public.vet_consultations(org_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vet_consultations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 3. TABELA: vet_records (Prontuários)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vet_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL,
  record_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vet_records_pet ON public.vet_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_vet_records_org ON public.vet_records(org_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vet_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 4. TABELA: vet_exam_types (Catálogo de Exames)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vet_exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vet_exam_types_org ON public.vet_exam_types(org_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vet_exam_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. TABELA: vet_exams (Exames Realizados)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vet_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL,
  exam_type_id UUID REFERENCES public.vet_exam_types(id) ON DELETE SET NULL,
  exam_type_name TEXT NOT NULL, -- denormalizado
  exam_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_notes TEXT,
  file_url TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending', -- 'pending' | 'paid'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vet_exams_pet ON public.vet_exams(pet_id);
CREATE INDEX IF NOT EXISTS idx_vet_exams_org ON public.vet_exams(org_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vet_exams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. ALTERAÇÃO EM pet_vaccines (Adicionar veterinário responsável)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pet_vaccines' AND column_name='veterinarian_id') THEN
        ALTER TABLE public.pet_vaccines ADD COLUMN veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL;
    END IF;
END $$;


-- =====================================================
-- 7. STORAGE BUCKET: vet-exams
-- =====================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vet-exams', 'vet-exams', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for VET-EXAMS bucket
DROP POLICY IF EXISTS "Authenticated users can upload vet-exams" ON storage.objects;
CREATE POLICY "Authenticated users can upload vet-exams"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vet-exams');

DROP POLICY IF EXISTS "Public can view vet-exams" ON storage.objects;
CREATE POLICY "Public can view vet-exams"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'vet-exams');

DROP POLICY IF EXISTS "Users can delete vet-exams" ON storage.objects;
CREATE POLICY "Users can delete vet-exams"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vet-exams');

-- =====================================================
-- 8. HABILITAR RLS
-- =====================================================
ALTER TABLE public.veterinarians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_exams ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. POLÍTICAS RLS Padrões (Isolamento por Org)
-- =====================================================

-- VETERINARIANS --
CREATE POLICY "Users can view org veterinarians" ON public.veterinarians
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage veterinarians" ON public.veterinarians
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
  );

-- VET_CONSULTATIONS --
CREATE POLICY "Users can view org vet_consultations" ON public.vet_consultations
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tutors can view own pet consultations" ON public.vet_consultations
  FOR SELECT USING (pet_id IN (SELECT id FROM public.pets WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())));

CREATE POLICY "Staff can manage vet_consultations" ON public.vet_consultations
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
  );

-- VET_RECORDS --
CREATE POLICY "Users can view org vet_records" ON public.vet_records
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tutors can view own pet records" ON public.vet_records
  FOR SELECT USING (pet_id IN (SELECT id FROM public.pets WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())));

CREATE POLICY "Staff can manage vet_records" ON public.vet_records
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
  );

-- VET_EXAM_TYPES --
CREATE POLICY "Users can view org vet_exam_types" ON public.vet_exam_types
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage vet_exam_types" ON public.vet_exam_types
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
  );

-- VET_EXAMS --
CREATE POLICY "Users can view org vet_exams" ON public.vet_exams
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tutors can view own pet exams" ON public.vet_exams
  FOR SELECT USING (pet_id IN (SELECT id FROM public.pets WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())));

CREATE POLICY "Staff can manage vet_exams" ON public.vet_exams
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
  );
