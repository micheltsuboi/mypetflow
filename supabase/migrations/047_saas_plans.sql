-- =====================================================
-- MIGRATION: 047_saas_plans.sql
-- DESCRIÇÃO: Criação da tabela de planos SaaS e associação com organizations
-- =====================================================

-- 1. Criar a Tabela de Planos
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  features JSONB DEFAULT '[]'::jsonb, -- Array de strings ex: ["agenda", "customers", "pets", "services", "finance", "timeclock", "creche"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER set_saas_plans_updated_at BEFORE UPDATE ON public.saas_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: Master Admin (superadmin) tem acesso total. Outros têm acesso de leitura (opcional, dependendo de como a UI vai consumir)
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins have full access to saas_plans"
ON public.saas_plans FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

CREATE POLICY "Anyone authenticated can view active saas_plans"
ON public.saas_plans FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Adicionar coluna na tabela organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.saas_plans(id) ON DELETE SET NULL;

-- 3. Inserir o "Plano Completo Ilimitado" por padrão
DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Verificar se já existe (re-entrância)
  SELECT id INTO v_plan_id FROM public.saas_plans WHERE name = 'Plano PRO Completo' LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.saas_plans (name, description, features)
    VALUES (
      'Plano PRO Completo', 
      'Acesso completo a todos os módulos do sistema MyPet Flow.',
      '["agenda", "customers", "pets", "services", "finance", "timeclock", "creche", "petshop", "reports"]'::jsonb
    ) RETURNING id INTO v_plan_id;
  END IF;

  -- 4. Associar todas as organizações existentes a este plano
  UPDATE public.organizations 
  SET plan_id = v_plan_id 
  WHERE plan_id IS NULL;
END $$;
