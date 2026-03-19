-- =====================================================
-- MIGRATION: Sistema de Renovação Automática de Pacotes
-- Validade mensal/semanal com agendamento automático,
-- histórico de sessões e ícone de pacote nos agendamentos
-- =====================================================

-- =====================================================
-- 1. Atualizar service_packages: adicionar validity_type
-- =====================================================
ALTER TABLE public.service_packages
  ADD COLUMN IF NOT EXISTS validity_type TEXT CHECK (validity_type IN ('weekly', 'monthly', 'unlimited')) DEFAULT 'unlimited',
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- Migrar dados existentes: validity_days -> validity_type
UPDATE public.service_packages SET validity_type = 'monthly', auto_renew = true WHERE validity_days = 30;
UPDATE public.service_packages SET validity_type = 'weekly', auto_renew = true WHERE validity_days = 7;

-- Remover a semântica de validity_days mas manter coluna por compatibilidade
-- (não removemos para não quebrar dados existentes)

-- =====================================================
-- 2. Atualizar customer_packages: campos para renovação automática
-- =====================================================
ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS preferred_day_of_week INTEGER CHECK (preferred_day_of_week BETWEEN 0 AND 6), -- 0=Dom, 1=Seg...6=Sab
  ADD COLUMN IF NOT EXISTS preferred_time TIME,                -- Ex: '13:00'
  ADD COLUMN IF NOT EXISTS period_start DATE,                  -- Início do período atual
  ADD COLUMN IF NOT EXISTS period_end DATE,                    -- Fim do período atual
  ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0,    -- Quantas renovações aconteceram
  ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT false,       -- Pacote pausado
  ADD COLUMN IF NOT EXISTS parent_package_id UUID REFERENCES public.customer_packages(id); -- Link com pacote-pai (histórico)

-- =====================================================
-- 3. Criar tabela package_sessions: histórico de sessões
-- =====================================================
CREATE TABLE IF NOT EXISTS public.package_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id UUID NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  scheduled_at TIMESTAMPTZ,       -- Data/hora do agendamento
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'done', 'missed', 'rescheduled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_sessions_cp ON public.package_sessions(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_package_sessions_apt ON public.package_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_package_sessions_period ON public.package_sessions(period_start, period_end);

-- RLS
ALTER TABLE public.package_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view package sessions" ON public.package_sessions
  FOR SELECT USING (
    customer_package_id IN (
      SELECT id FROM public.customer_packages
      WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "Staff can manage package sessions" ON public.package_sessions
  FOR ALL USING (
    customer_package_id IN (
      SELECT id FROM public.customer_packages
      WHERE org_id IN (
        SELECT org_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
      )
    )
  );

-- Trigger updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.package_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 4. Função: calcular período atual de um pacote
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_package_period(
  p_validity_type TEXT,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(period_start DATE, period_end DATE) AS $$
BEGIN
  IF p_validity_type = 'weekly' THEN
    -- Semana começa na Segunda
    RETURN QUERY SELECT
      p_reference_date - EXTRACT(DOW FROM p_reference_date)::INTEGER + 1 AS period_start,
      p_reference_date - EXTRACT(DOW FROM p_reference_date)::INTEGER + 7 AS period_end;
  ELSIF p_validity_type = 'monthly' THEN
    RETURN QUERY SELECT
      DATE_TRUNC('month', p_reference_date)::DATE AS period_start,
      (DATE_TRUNC('month', p_reference_date) + INTERVAL '1 month - 1 day')::DATE AS period_end;
  ELSE
    -- unlimited: sem período fixo
    RETURN QUERY SELECT p_reference_date AS period_start, (p_reference_date + INTERVAL '100 years')::DATE AS period_end;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 5. Função: gerar sessões do período atual para um customer_package
-- =====================================================
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
BEGIN
  -- Buscar dados do customer_package
  SELECT cp.*, sp.validity_type
  INTO v_cp
  FROM public.customer_packages cp
  JOIN public.service_packages sp ON sp.id = cp.package_id
  WHERE cp.id = p_customer_package_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Calcular período
  SELECT * INTO v_period FROM public.get_package_period(v_cp.validity_type);

  -- Atualizar período no customer_package
  UPDATE public.customer_packages
  SET period_start = v_period.period_start, period_end = v_period.period_end
  WHERE id = p_customer_package_id;

  -- Para cada item do pacote, criar sessões
  FOR v_items IN
    SELECT pi.service_id, pi.quantity
    FROM public.package_items pi
    JOIN public.service_packages sp ON sp.id = pi.package_id
    WHERE sp.id = v_cp.package_id
  LOOP
    -- Verificar se sessões já existem para este período
    IF EXISTS (
      SELECT 1 FROM public.package_sessions
      WHERE customer_package_id = p_customer_package_id
        AND service_id = v_items.service_id
        AND period_start = v_period.period_start
    ) THEN
      CONTINUE;
    END IF;

    -- Criar v_items.quantity sessões
    FOR i IN 1..v_items.quantity LOOP
      -- Se tem dia preferencial, calcular a data
      IF v_cp.preferred_day_of_week IS NOT NULL THEN
        -- Calcular próxima ocorrência do dia dentro do período
        v_day_offset := (v_cp.preferred_day_of_week - EXTRACT(DOW FROM v_period.period_start)::INTEGER + 7) % 7;
        v_session_date := v_period.period_start + v_day_offset + ((i - 1) * 7);
        
        -- Garantir que a data está dentro do período
        IF v_session_date > v_period.period_end THEN
          v_session_date := NULL;
        END IF;

        -- Montar timestamp com horário preferencial
        IF v_session_date IS NOT NULL AND v_cp.preferred_time IS NOT NULL THEN
          v_session_ts := (v_session_date::TEXT || ' ' || v_cp.preferred_time::TEXT || '-03:00')::TIMESTAMPTZ;
        ELSE
          v_session_ts := NULL;
        END IF;
      ELSE
        v_session_date := NULL;
        v_session_ts := NULL;
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

-- =====================================================
-- 6. Atualizar get_pet_package_summary para incluir dados novos
-- =====================================================
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

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
