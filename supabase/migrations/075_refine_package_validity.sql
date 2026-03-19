-- =====================================================
-- MIGRATION: Refinar validade de pacotes para Semanal/Multisemanal
-- Remove 'monthly' e adiciona 'validity_weeks' para maior flexibilidade
-- Garante que o período comece no primeiro dia disponível (evita perda de sessões)
-- =====================================================

-- 1. Migrar dados existentes e adicionar validity_weeks
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS validity_weeks INTEGER DEFAULT 1;

UPDATE public.service_packages 
SET validity_type = 'weekly', validity_weeks = 4 
WHERE validity_type = 'monthly';

-- 2. Alterar restrição de validity_type
ALTER TABLE public.service_packages DROP CONSTRAINT IF EXISTS service_packages_validity_type_check;
ALTER TABLE public.service_packages ADD CONSTRAINT service_packages_validity_type_check 
  CHECK (validity_type IN ('weekly', 'unlimited'));

-- 3. Função: calcular período atual de um pacote
DROP FUNCTION IF EXISTS public.get_package_period(TEXT, INTEGER, DATE, INTEGER);
DROP FUNCTION IF EXISTS public.get_package_period(TEXT, INTEGER, DATE);
DROP FUNCTION IF EXISTS public.get_package_period(TEXT, DATE);

CREATE OR REPLACE FUNCTION public.get_package_period(
  p_validity_type TEXT,
  p_validity_weeks INTEGER DEFAULT 1,
  p_reference_date DATE DEFAULT CURRENT_DATE,
  p_preferred_day INTEGER DEFAULT NULL
)
RETURNS TABLE(period_start DATE, period_end DATE) AS $$
DECLARE
  v_start DATE;
BEGIN
  IF p_validity_type = 'weekly' THEN
    IF p_preferred_day IS NOT NULL THEN
      -- Encontra a próxima ocorrência do dia da semana (pode ser hoje)
      v_start := p_reference_date + (p_preferred_day - EXTRACT(DOW FROM p_reference_date)::INTEGER + 7) % 7;
    ELSE
      -- Sem preferência: começa na data de referência (hoje)
      v_start := p_reference_date;
    END IF;

    RETURN QUERY SELECT
      v_start AS period_start,
      (v_start + (7 * p_validity_weeks) - 1)::DATE AS period_end;
  ELSE
    -- unlimited: sem período fixo
    RETURN QUERY SELECT p_reference_date AS period_start, (p_reference_date + 25550)::DATE AS period_end; -- ~70 anos
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Gerar sessões do período atual para um customer_package
DROP FUNCTION IF EXISTS public.generate_package_sessions(UUID);
CREATE OR REPLACE FUNCTION public.generate_package_sessions(
  p_customer_package_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_cp RECORD;
  v_period RECORD;
  v_items RECORD;
  v_session_date DATE;
  v_sessions_created INTEGER := 0;
  v_day_offset INTEGER;
  v_session_ts TIMESTAMPTZ;
  v_now_date DATE := CURRENT_DATE;
BEGIN
  -- Buscar dados do customer_package
  SELECT cp.*, sp.validity_type, sp.validity_weeks
  INTO v_cp
  FROM public.customer_packages cp
  JOIN public.service_packages sp ON sp.id = cp.package_id
  WHERE cp.id = p_customer_package_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Calcular período baseado no dia preferencial se houver
  -- Se já tiver um period_start (renovação), usamos ele. Senão, calculamos.
  IF v_cp.period_start IS NOT NULL AND v_cp.period_start >= v_now_date THEN
     SELECT v_cp.period_start AS period_start, v_cp.period_end AS period_end INTO v_period;
  ELSE
     -- Cálculo inicial: encontra primeiro dia útil
     SELECT * INTO v_period FROM public.get_package_period(v_cp.validity_type, v_cp.validity_weeks, v_now_date, v_cp.preferred_day_of_week);
  END IF;

  -- Atualizar período no customer_package
  UPDATE public.customer_packages
  SET period_start = v_period.period_start, period_end = v_period.period_end
  WHERE id = p_customer_package_id;

  -- Para cada item do pacote, criar sessões
  FOR v_items IN
    SELECT pi.service_id, pi.quantity
    FROM public.package_items pi
    WHERE pi.package_id = v_cp.package_id
  LOOP
    -- Criar v_items.quantity sessões
    FOR i IN 1..v_items.quantity LOOP
      IF v_cp.preferred_day_of_week IS NOT NULL THEN
        -- Como period_start já é o primeiro dia de sessão (ou a segunda daquela semana)
        -- o offset deve ser zero se usarmos a lógica de get_package_period acima.
        v_day_offset := (v_cp.preferred_day_of_week - EXTRACT(DOW FROM v_period.period_start)::INTEGER + 7) % 7;
        
        -- Distribuir i sessões nas semanas disponíveis
        v_session_date := v_period.period_start + v_day_offset + (FLOOR((i - 1)::FLOAT / (v_items.quantity::FLOAT / v_cp.validity_weeks::FLOAT))::INTEGER * 7);
        
        -- Garantir que a data está dentro do período
        IF v_session_date > v_period.period_end THEN
          v_session_date := NULL;
        END IF;

        IF v_session_date IS NOT NULL AND v_cp.preferred_time IS NOT NULL THEN
          v_session_ts := (v_session_date::TEXT || ' ' || v_cp.preferred_time::TEXT || '-03:00')::TIMESTAMPTZ;
        ELSE
          v_session_ts := NULL;
        END IF;
      ELSE
        v_session_date := NULL;
        v_session_ts := NULL;
      END IF;

      -- Evitar duplicidade
      IF v_session_ts IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.package_sessions 
          WHERE customer_package_id = p_customer_package_id 
            AND service_id = v_items.service_id
            AND scheduled_at = v_session_ts
        ) THEN
          CONTINUE;
        END IF;
      END IF;

      INSERT INTO public.package_sessions (
        customer_package_id, service_id, period_start, period_end, scheduled_at, status
      ) VALUES (
        p_customer_package_id, v_items.service_id, v_period.period_start, v_period.period_end,
        v_session_ts, CASE WHEN v_session_ts IS NOT NULL THEN 'scheduled' ELSE 'pending' END
      );
      v_sessions_created := v_sessions_created + 1;
    END LOOP;
  END LOOP;

  RETURN v_sessions_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atualizar get_pet_package_summary para refletir as mudanças
DROP FUNCTION IF EXISTS public.get_pet_package_summary(UUID);
CREATE OR REPLACE FUNCTION public.get_pet_package_summary(
  p_pet_id UUID
)
RETURNS TABLE (
  customer_package_id UUID,
  package_name TEXT,
  validity_type TEXT,
  validity_weeks INTEGER,
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
  is_expired BOOLEAN
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
    sp.validity_weeks,
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
    (cp.expires_at IS NOT NULL AND cp.expires_at < now()) as is_expired
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
