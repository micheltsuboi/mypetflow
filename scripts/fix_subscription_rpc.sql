-- Script para corrigir a função de geração de sessões de mensalidade
-- Esse script resolve o erro de concatenação de tempo e melhora a precisão das datas

CREATE OR REPLACE FUNCTION generate_subscription_sessions_for_month(
  p_customer_package_id UUID,
  p_month_start DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_cp customer_packages%ROWTYPE;
  v_service_id UUID;
  v_day_of_week INT;
  v_session_time TIME;
  v_month_start DATE;
  v_month_end DATE;
  v_current_date DATE;
  v_session_count INT := 0;
  v_total_sessions INT := 0;
  v_scheduled_at TIMESTAMPTZ;
BEGIN
  -- Busca os dados do contrato
  SELECT * INTO v_cp FROM customer_packages WHERE id = p_customer_package_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Define o mês de referência (padrão: mês atual)
  v_month_start := COALESCE(p_month_start, date_trunc('month', CURRENT_DATE)::DATE);
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

  -- Busca o serviço principal do plano
  SELECT service_id INTO v_service_id
  FROM package_items
  WHERE package_id = v_cp.package_id
  LIMIT 1;

  IF v_service_id IS NULL THEN RETURN 0; END IF;

  -- Converte o horário preferido para o tipo TIME com segurança
  v_session_time := COALESCE(v_cp.preferred_time, '09:00:00')::TIME;

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
        
        -- Soma data + hora e garante o fuso horário (UTC é o padrão do Supabase, o app cuidará do offset de exibição se necessário)
        v_scheduled_at := (v_current_date + v_session_time) AT TIME ZONE 'UTC';

        -- Evita duplicatas para o mesmo contrato e horário
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

  -- Atualiza as datas de controle do contrato
  UPDATE customer_packages
  SET
    next_renewal_date = (v_month_start + INTERVAL '1 month')::DATE,
    due_date = (v_month_start + INTERVAL '1 month' - INTERVAL '21 days' + INTERVAL '9 days')::DATE
  WHERE id = p_customer_package_id;

  RETURN v_session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
