-- 1. Alterar tabelas existentes
ALTER TABLE public.veterinarians ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS mapa_registration TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS last_controlled_prescription_number INT DEFAULT 0;
ALTER TABLE public.vet_consultations ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT false;
ALTER TABLE public.vet_consultations ADD COLUMN IF NOT EXISTS control_number TEXT;

-- 2. Criar a tabela de receitas (vet_prescriptions)
CREATE TABLE IF NOT EXISTS public.vet_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  veterinarian_id UUID REFERENCES public.veterinarians(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES public.vet_consultations(id) ON DELETE SET NULL,
  is_controlled BOOLEAN NOT NULL DEFAULT false,
  control_number TEXT,
  prescription_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_vet_prescriptions_pet ON public.vet_prescriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_vet_prescriptions_org ON public.vet_prescriptions(org_id);

-- 4. Trigger de updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vet_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Habilitar RLS
ALTER TABLE public.vet_prescriptions ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS
DROP POLICY IF EXISTS "Users can view org vet_prescriptions" ON public.vet_prescriptions;
CREATE POLICY "Users can view org vet_prescriptions" ON public.vet_prescriptions
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tutors can view own pet prescriptions" ON public.vet_prescriptions;
CREATE POLICY "Tutors can view own pet prescriptions" ON public.vet_prescriptions
  FOR SELECT USING (pet_id IN (SELECT id FROM public.pets WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Staff can manage vet_prescriptions" ON public.vet_prescriptions;
CREATE POLICY "Staff can manage vet_prescriptions" ON public.vet_prescriptions
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin'))
  );
