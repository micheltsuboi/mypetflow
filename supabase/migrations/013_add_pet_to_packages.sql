-- =====================================================
-- MIGRATION: Add Pet Relationship to Packages
-- Permite vincular pacotes a pets específicos
-- =====================================================

-- Adicionar coluna pet_id (opcional) em customer_packages
ALTER TABLE public.customer_packages 
  ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_customer_packages_pet ON public.customer_packages(pet_id);

-- Modificar função use_package_credit para aceitar pet_id
CREATE OR REPLACE FUNCTION public.use_package_credit_for_pet(
  p_pet_id UUID,
  p_service_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_credit_id UUID;
  v_customer_package_id UUID;
  v_customer_id UUID;
BEGIN
  -- Busca customer_id do pet
  SELECT customer_id INTO v_customer_id
  FROM public.pets
  WHERE id = p_pet_id;
  
  -- Busca crédito disponível
  -- Prioridade: 1) Pacote específico do pet, 2) Pacote geral do cliente
  SELECT pc.id, pc.customer_package_id INTO v_credit_id, v_customer_package_id
  FROM public.package_credits pc
  JOIN public.customer_packages cp ON cp.id = pc.customer_package_id
  WHERE (cp.pet_id = p_pet_id OR (cp.pet_id IS NULL AND cp.customer_id = v_customer_id))
    AND pc.service_id = p_service_id
    AND pc.remaining_quantity > 0
    AND cp.is_active = true
    AND (cp.expires_at IS NULL OR cp.expires_at > now())
  ORDER BY 
    CASE WHEN cp.pet_id = p_pet_id THEN 0 ELSE 1 END, -- Prioriza pacotes do pet específico
    cp.expires_at ASC NULLS LAST -- Depois por expiração
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

-- Função para obter resumo de pacotes de um pet específico
CREATE OR REPLACE FUNCTION public.get_pet_package_summary(
  p_pet_id UUID
)
RETURNS TABLE (
  customer_package_id UUID,
  package_name TEXT,
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  service_name TEXT,
  service_id UUID,
  total_qty INTEGER,
  used_qty INTEGER,
  remaining_qty INTEGER,
  is_expired BOOLEAN
) AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Busca customer_id do pet
  SELECT customer_id INTO v_customer_id
  FROM public.pets
  WHERE id = p_pet_id;
  
  -- Retorna pacotes do pet específico + pacotes gerais do cliente
  RETURN QUERY
  SELECT 
    cp.id as customer_package_id,
    sp.name as package_name,
    cp.purchased_at,
    cp.expires_at,
    s.name as service_name,
    s.id as service_id,
    pc.total_quantity as total_qty,
    pc.used_quantity as used_qty,
    pc.remaining_quantity as remaining_qty,
    (cp.expires_at IS NOT NULL AND cp.expires_at < now()) as is_expired
  FROM public.package_credits pc
  JOIN public.customer_packages cp ON cp.id = pc.customer_package_id
  JOIN public.service_packages sp ON sp.id = cp.package_id
  JOIN public.services s ON s.id = pc.service_id
  WHERE (cp.pet_id = p_pet_id OR (cp.pet_id IS NULL AND cp.customer_id = v_customer_id))
    AND cp.is_active = true
    AND pc.remaining_quantity > 0
  ORDER BY 
    CASE WHEN cp.pet_id = p_pet_id THEN 0 ELSE 1 END,
    cp.purchased_at DESC, 
    s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar view para incluir pet_id
DROP VIEW IF EXISTS public.active_packages_summary;
CREATE OR REPLACE VIEW public.active_packages_summary AS
SELECT 
  cp.id as customer_package_id,
  cp.customer_id,
  cp.pet_id,
  c.name as customer_name,
  p.name as pet_name,
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
LEFT JOIN public.pets p ON p.id = cp.pet_id
JOIN public.service_packages sp ON sp.id = cp.package_id
LEFT JOIN public.package_credits pc ON pc.customer_package_id = cp.id
WHERE cp.is_active = true
GROUP BY cp.id, cp.customer_id, cp.pet_id, c.name, p.name, sp.name, cp.purchased_at, cp.expires_at;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
