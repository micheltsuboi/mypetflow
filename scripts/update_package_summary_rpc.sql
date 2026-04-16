-- CORREÇÃO: Adicionando is_subscription ao retorno do resumo de pacotes
DROP FUNCTION IF EXISTS public.get_pet_package_summary(UUID);
CREATE OR REPLACE FUNCTION public.get_pet_package_summary(
  p_pet_id UUID
)
RETURNS TABLE (
  customer_package_id UUID,
  package_name TEXT,
  validity_type TEXT,
  auto_renew BOOLEAN,
  preferred_day_of_week INTEGER,
  preferred_time TIME,
  period_start DATE,
  period_end DATE,
  paused BOOLEAN,
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  service_name TEXT,
  service_id UUID,
  total_qty INTEGER,
  used_qty INTEGER,
  remaining_qty INTEGER,
  is_expired BOOLEAN,
  is_subscription BOOLEAN  -- <--- ADICIONADO
) AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT customer_id INTO v_customer_id FROM public.pets WHERE id = p_pet_id;

  RETURN QUERY
  SELECT
    cp.id as customer_package_id,
    sp.name as package_name,
    sp.validity_type,
    sp.auto_renew,
    cp.preferred_day_of_week,
    cp.preferred_time,
    cp.period_start,
    cp.period_end,
    cp.paused,
    cp.purchased_at,
    cp.expires_at,
    s.name as service_name,
    s.id as service_id,
    pc.total_quantity as total_qty,
    pc.used_quantity as used_qty,
    pc.remaining_quantity as remaining_qty,
    (cp.expires_at IS NOT NULL AND cp.expires_at < now()) as is_expired,
    cp.is_subscription  -- <--- ADICIONADO
  FROM public.package_credits pc
  JOIN public.customer_packages cp ON cp.id = pc.customer_package_id
  JOIN public.service_packages sp ON sp.id = cp.package_id
  JOIN public.services s ON s.id = pc.service_id
  WHERE (cp.pet_id = p_pet_id OR (cp.pet_id IS NULL AND cp.customer_id = v_customer_id))
    AND cp.is_active = true
  ORDER BY
    CASE WHEN cp.pet_id = p_pet_id THEN 0 ELSE 1 END,
    cp.purchased_at DESC,
    s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
