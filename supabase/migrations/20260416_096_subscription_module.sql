-- =====================================================
-- MIGRATION 096: Módulo de Mensalidades (Subscriptions)
-- =====================================================

-- 1. Estender service_packages com flags de mensalidade
ALTER TABLE service_packages
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS subscription_days_of_week INTEGER[],
  ADD COLUMN IF NOT EXISTS subscription_time TEXT;

-- 2. Campo de controle nas customer_packages
ALTER TABLE customer_packages
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS next_renewal_date DATE;

-- 3. Função que gera sessões do mês corretamente (4 ou 5 sessões conforme calendário)
CREATE OR REPLACE FUNCTION generate_subscription_sessions_for_month(
  p_customer_package_id UUID,
  p_month_start DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_cp customer_packages%ROWTYPE;
  v_service_id UUID;
  v_day_of_week INT;
  v_session_time TEXT;
  v_month_start DATE;
  v_month_end DATE;
  v_current_date DATE;
  v_session_count INT := 0;
  v_total_sessions INT := 0;
  v_scheduled_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_cp FROM customer_packages WHERE id = p_customer_package_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Define o mês de referência (padrão: mês atual)
  v_month_start := COALESCE(p_month_start, date_trunc('month', CURRENT_DATE)::DATE);
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

  -- Busca o serviço principal do pacote
  SELECT service_id INTO v_service_id
  FROM package_items
  WHERE package_id = v_cp.package_id
  LIMIT 1;

  IF v_service_id IS NULL THEN RETURN 0; END IF;

  v_session_time := COALESCE(v_cp.preferred_time, '09:00');

  -- Para cada dia da semana preferido
  IF v_cp.preferred_days_of_week IS NOT NULL THEN
    FOREACH v_day_of_week IN ARRAY v_cp.preferred_days_of_week
    LOOP
      v_current_date := v_month_start;

      -- Avança até o primeiro dia do mês que corresponde ao dia da semana
      WHILE EXTRACT(DOW FROM v_current_date)::INT != v_day_of_week LOOP
        v_current_date := v_current_date + INTERVAL '1 day';
      END LOOP;

      -- Cria uma sessão para cada ocorrência desse dia no mês
      WHILE v_current_date <= v_month_end LOOP
        v_total_sessions := v_total_sessions + 1;
        v_scheduled_at := (v_current_date::TEXT || ' ' || v_session_time || ':00')::TIMESTAMPTZ;

        -- Evita duplicatas
        IF NOT EXISTS (
          SELECT 1 FROM package_sessions
          WHERE customer_package_id = p_customer_package_id
            AND scheduled_at = v_scheduled_at
        ) THEN
          INSERT INTO package_sessions (
            customer_package_id,
            service_id,
            period_start,
            period_end,
            scheduled_at,
            status,
            session_number
          ) VALUES (
            p_customer_package_id,
            v_service_id,
            v_month_start,
            v_month_end,
            v_scheduled_at,
            'scheduled',
            v_total_sessions
          );
          v_session_count := v_session_count + 1;
        END IF;

        v_current_date := v_current_date + INTERVAL '7 days';
      END LOOP;
    END LOOP;
  END IF;

  -- Atualiza a data de renovação para o próximo mês
  UPDATE customer_packages
  SET
    next_renewal_date = (v_month_start + INTERVAL '1 month')::DATE,
    due_date = (v_month_start + INTERVAL '1 month' - INTERVAL '21 days' + INTERVAL '9 days')::DATE -- Dia 10 do mês atual
  WHERE id = p_customer_package_id;

  RETURN v_session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para criar agendamentos (appointments) a partir das sessões geradas
CREATE OR REPLACE FUNCTION create_appointments_from_subscription_sessions(
  p_customer_package_id UUID,
  p_org_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_cp customer_packages%ROWTYPE;
  v_session RECORD;
  v_appt_id UUID;
  v_count INT := 0;
BEGIN
  SELECT * INTO v_cp FROM customer_packages WHERE id = p_customer_package_id;
  IF NOT FOUND OR v_cp.pet_id IS NULL THEN RETURN 0; END IF;

  FOR v_session IN
    SELECT ps.*, sp.name as service_name
    FROM package_sessions ps
    JOIN services sp ON sp.id = ps.service_id
    WHERE ps.customer_package_id = p_customer_package_id
      AND ps.status = 'scheduled'
      AND ps.appointment_id IS NULL
  LOOP
    INSERT INTO appointments (
      org_id,
      pet_id,
      service_id,
      customer_id,
      scheduled_at,
      status,
      notes,
      calculated_price,
      final_price,
      payment_status,
      discount_percent,
      is_package
    ) VALUES (
      p_org_id,
      v_cp.pet_id,
      v_session.service_id,
      v_cp.customer_id,
      v_session.scheduled_at,
      'pending',
      '📅 Mensalidade — Sessão ' || v_session.session_number,
      0,
      0,
      'package',
      0,
      TRUE
    )
    RETURNING id INTO v_appt_id;

    IF v_appt_id IS NOT NULL THEN
      UPDATE package_sessions
      SET appointment_id = v_appt_id
      WHERE id = v_session.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Permissões
GRANT EXECUTE ON FUNCTION generate_subscription_sessions_for_month(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION create_appointments_from_subscription_sessions(UUID, UUID) TO authenticated;
