-- =====================================================
-- MIGRATION: Service Packages System
-- Implementa sistema completo de pacotes de serviços
-- =====================================================

-- =====================================================
-- TABELA: service_packages (Templates de Pacotes)
-- Define os pacotes oferecidos pelo pet shop
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Ex: "Pacote Mensal Premium"
  description TEXT,
  total_price DECIMAL(10,2) NOT NULL, -- Preço único do pacote
  validity_days INTEGER, -- NULL = sem expiração, ou número de dias
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABELA: package_items (Composição dos Pacotes)
-- Define quais serviços e quantidades compõem cada pacote
-- =====================================================
CREATE TABLE IF NOT EXISTS public.package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1, -- Quantidade deste serviço no pacote
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABELA: customer_packages (Pacotes Comprados)
-- Registra quando um cliente compra um pacote
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customer_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.service_packages(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = sem expiração
  total_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit', 'debit', 'pix', 'other')),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABELA: package_credits (Saldo de Serviços do Pacote)
-- Rastreia quantos créditos de cada serviço o cliente tem
-- =====================================================
CREATE TABLE IF NOT EXISTS public.package_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id UUID NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  total_quantity INTEGER NOT NULL, -- Quantidade original
  used_quantity INTEGER DEFAULT 0, -- Quantidade já utilizada
  remaining_quantity INTEGER NOT NULL, -- Quantidade restante (computed)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_service_packages_org ON public.service_packages(org_id);
CREATE INDEX IF NOT EXISTS idx_package_items_package ON public.package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON public.customer_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_org ON public.customer_packages(org_id);
CREATE INDEX IF NOT EXISTS idx_package_credits_package ON public.package_credits(customer_package_id);

-- =====================================================
-- MODIFICAR TABELA: appointments
-- Adicionar referência a créditos de pacotes
-- =====================================================
-- Renomear a coluna antiga credit_id para evitar conflito
ALTER TABLE public.appointments 
  DROP COLUMN IF EXISTS credit_id;

-- Adicionar nova coluna para pacotes
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS package_credit_id UUID REFERENCES public.package_credits(id);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_credits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: Service Packages
-- =====================================================
CREATE POLICY "Users can view org packages" ON public.service_packages
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin can manage packages" ON public.service_packages
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- POLÍTICAS RLS: Package Items
-- =====================================================
CREATE POLICY "Users can view package items" ON public.package_items
  FOR SELECT USING (
    package_id IN (
      SELECT id FROM public.service_packages 
      WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admin can manage package items" ON public.package_items
  FOR ALL USING (
    package_id IN (
      SELECT id FROM public.service_packages 
      WHERE org_id IN (
        SELECT org_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
      )
    )
  );

-- =====================================================
-- POLÍTICAS RLS: Customer Packages
-- =====================================================
CREATE POLICY "Users can view org customer packages" ON public.customer_packages
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Staff can manage customer packages" ON public.customer_packages
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

-- =====================================================
-- POLÍTICAS RLS: Package Credits
-- =====================================================
CREATE POLICY "Users can view package credits" ON public.package_credits
  FOR SELECT USING (
    customer_package_id IN (
      SELECT id FROM public.customer_packages 
      WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Staff can manage package credits" ON public.package_credits
  FOR ALL USING (
    customer_package_id IN (
      SELECT id FROM public.customer_packages 
      WHERE org_id IN (
        SELECT org_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
      )
    )
  );

-- =====================================================
-- FUNÇÃO: use_package_credit (Usar crédito do pacote)
-- =====================================================
CREATE OR REPLACE FUNCTION public.use_package_credit(
  p_customer_id UUID,
  p_service_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_credit_id UUID;
  v_customer_package_id UUID;
BEGIN
  -- Busca crédito disponível (não expirado, com saldo)
  SELECT pc.id, pc.customer_package_id INTO v_credit_id, v_customer_package_id
  FROM public.package_credits pc
  JOIN public.customer_packages cp ON cp.id = pc.customer_package_id
  WHERE cp.customer_id = p_customer_id
    AND pc.service_id = p_service_id
    AND pc.remaining_quantity > 0
    AND cp.is_active = true
    AND (cp.expires_at IS NULL OR cp.expires_at > now())
  ORDER BY cp.expires_at ASC NULLS LAST -- Usa primeiro os que expiram antes
  LIMIT 1;
  
  -- Se encontrou crédito, decrementa
  IF v_credit_id IS NOT NULL THEN
    UPDATE public.package_credits 
    SET 
      used_quantity = used_quantity + 1,
      remaining_quantity = remaining_quantity - 1,
      updated_at = now()
    WHERE id = v_credit_id;
    
    RETURN v_credit_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: return_package_credit (Devolver crédito)
-- Usado quando um agendamento é cancelado
-- =====================================================
CREATE OR REPLACE FUNCTION public.return_package_credit(
  p_credit_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.package_credits 
  SET 
    used_quantity = used_quantity - 1,
    remaining_quantity = remaining_quantity + 1,
    updated_at = now()
  WHERE id = p_credit_id
    AND used_quantity > 0;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: get_customer_package_summary
-- Retorna resumo dos pacotes de um cliente
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_customer_package_summary(
  p_customer_id UUID
)
RETURNS TABLE (
  package_name TEXT,
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  service_name TEXT,
  total_qty INTEGER,
  used_qty INTEGER,
  remaining_qty INTEGER,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name as package_name,
    cp.purchased_at,
    cp.expires_at,
    s.name as service_name,
    pc.total_quantity as total_qty,
    pc.used_quantity as used_qty,
    pc.remaining_quantity as remaining_qty,
    (cp.expires_at IS NOT NULL AND cp.expires_at < now()) as is_expired
  FROM public.package_credits pc
  JOIN public.customer_packages cp ON cp.id = pc.customer_package_id
  JOIN public.service_packages sp ON sp.id = cp.package_id
  JOIN public.services s ON s.id = pc.service_id
  WHERE cp.customer_id = p_customer_id
    AND cp.is_active = true
  ORDER BY cp.purchased_at DESC, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Atualizar updated_at
-- =====================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.package_credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- VIEW: Resumo de pacotes ativos
-- =====================================================
CREATE OR REPLACE VIEW public.active_packages_summary AS
SELECT 
  cp.id as customer_package_id,
  cp.customer_id,
  c.name as customer_name,
  sp.name as package_name,
  cp.purchased_at,
  cp.expires_at,
  CASE 
    WHEN cp.expires_at IS NULL THEN 'Sem expiração'
    WHEN cp.expires_at < now() THEN 'Expirado'
    ELSE 'Ativo'
  END as status,
  COUNT(pc.id) as total_services,
  SUM(pc.remaining_quantity) as total_remaining_credits
FROM public.customer_packages cp
JOIN public.customers c ON c.id = cp.customer_id
JOIN public.service_packages sp ON sp.id = cp.package_id
LEFT JOIN public.package_credits pc ON pc.customer_package_id = cp.id
WHERE cp.is_active = true
GROUP BY cp.id, cp.customer_id, c.name, sp.name, cp.purchased_at, cp.expires_at;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
