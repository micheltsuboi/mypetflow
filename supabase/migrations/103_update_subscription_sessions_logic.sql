-- =====================================================
-- MIGRATION 103: Geração de sessões de mensalidade com suporte a múltiplos serviços e quantidades específicas
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_subscription_sessions_for_month(
  p_customer_package_id UUID,
  p_month_start DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_cp customer_packages%ROWTYPE;
  v_item RECORD;
  v_day_of_week INT;
  v_session_time TIME;
  v_month_start DATE;
  v_month_end DATE;
  v_current_date DATE;
  v_session_count INT := 0;
  v_scheduled_at TIMESTAMPTZ;
  v_session_counter INT;
  v_primary_service_id UUID;
  v_weeks_ahead INT;
  v_day_offset INT;
  v_candidate_date DATE;
BEGIN
  -- 1. Carrega dados do contrato
  SELECT * INTO v_cp FROM public.customer_packages WHERE id = p_customer_package_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_month_start := COALESCE(p_month_start, date_trunc('month', CURRENT_DATE)::DATE);
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
  v_session_time := COALESCE(v_cp.preferred_time, '09:00:00')::TIME;

  -- 2. Define o serviço principal da mensalidade (aquele com maior quantidade ou o primeiro cadastrado)
  SELECT service_id INTO v_primary_service_id
  FROM public.package_items
  WHERE package_id = v_cp.package_id
  ORDER BY quantity DESC, created_at ASC
  LIMIT 1;

  IF v_primary_service_id IS NULL THEN RETURN 0; END IF;

  -- 3. Itera sobre todos os serviços do plano da mensalidade
  FOR v_item IN
    SELECT service_id, quantity
    FROM public.package_items
    WHERE package_id = v_cp.package_id
  LOOP
    v_session_counter := 0;

    -- Se for o serviço principal E o contrato tiver dias de semana e horário definidos, agendamos automaticamente
    IF v_item.service_id = v_primary_service_id 
       AND v_cp.preferred_days_of_week IS NOT NULL 
       AND array_length(v_cp.preferred_days_of_week, 1) > 0 
       AND v_session_time IS NOT NULL 
    THEN
      -- Agendamento automático semanal do serviço principal
      v_weeks_ahead := 0;
      WHILE v_session_counter < v_item.quantity LOOP
        FOREACH v_day_of_week IN ARRAY v_cp.preferred_days_of_week LOOP
          IF v_session_counter >= v_item.quantity THEN EXIT; END IF;

          -- Encontra a data do dia da semana a partir de v_month_start
          v_current_date := v_month_start;
          v_day_offset := (v_day_of_week - EXTRACT(DOW FROM v_current_date)::INT + 7) % 7;
          v_candidate_date := v_current_date + v_day_offset + (v_weeks_ahead * 7);

          IF v_candidate_date > v_month_end THEN
            -- Se estourou o mês e ainda precisamos de sessões, as sessões restantes viram pendentes
            v_weeks_ahead := 999;
            EXIT;
          END IF;

          v_scheduled_at := (v_candidate_date::TEXT || ' ' || v_session_time::TEXT || '-03:00')::TIMESTAMPTZ;

          -- Insere se não existir
          IF NOT EXISTS (
            SELECT 1 FROM public.package_sessions
            WHERE customer_package_id = p_customer_package_id
              AND service_id = v_item.service_id
              AND scheduled_at = v_scheduled_at
          ) THEN
            v_session_counter := v_session_counter + 1;
            INSERT INTO public.package_sessions (
              customer_package_id,
              service_id,
              period_start,
              period_end,
              scheduled_at,
              status,
              session_number
            ) VALUES (
              p_customer_package_id,
              v_item.service_id,
              v_month_start,
              v_month_end,
              v_scheduled_at,
              'scheduled',
              v_session_counter
            );
            v_session_count := v_session_count + 1;
          ELSE
            -- Se já existe, apenas conta como gerada
            v_session_counter := v_session_counter + 1;
          END IF;
        END LOOP;
        v_weeks_ahead := v_weeks_ahead + 1;
        IF v_weeks_ahead > 6 THEN EXIT; END IF; -- Prevenção de loop infinito
      END LOOP;
      
      -- Se a quantidade solicitada for maior que os dias gerados no mês, o restante fica pendente (NULL)
      WHILE v_session_counter < v_item.quantity LOOP
        v_session_counter := v_session_counter + 1;
        INSERT INTO public.package_sessions (
          customer_package_id,
          service_id,
          period_start,
          period_end,
          scheduled_at,
          status,
          session_number
        ) VALUES (
          p_customer_package_id,
          v_item.service_id,
          v_month_start,
          v_month_end,
          NULL,
          'pending',
          v_session_counter
        );
        v_session_count := v_session_count + 1;
      END LOOP;

    ELSE
      -- Para os demais serviços (ou se não houver agendamento automático configurado),
      -- gera as sessões como 'pending' com data NULL
      WHILE v_session_counter < v_item.quantity LOOP
        v_session_counter := v_session_counter + 1;
        
        -- Verifica se já não existem sessões pendentes para este serviço neste período
        IF NOT EXISTS (
          SELECT 1 FROM public.package_sessions
          WHERE customer_package_id = p_customer_package_id
            AND service_id = v_item.service_id
            AND period_start = v_month_start
            AND session_number = v_session_counter
        ) THEN
          INSERT INTO public.package_sessions (
            customer_package_id,
            service_id,
            period_start,
            period_end,
            scheduled_at,
            status,
            session_number
          ) VALUES (
            p_customer_package_id,
            v_item.service_id,
            v_month_start,
            v_month_end,
            NULL,
            'pending',
            v_session_counter
          );
          v_session_count := v_session_count + 1;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 4. Atualiza datas do contrato
  UPDATE public.customer_packages
  SET
    next_renewal_date = (v_month_start + INTERVAL '1 month')::DATE,
    due_date = (v_month_start + INTERVAL '1 month' - INTERVAL '21 days' + INTERVAL '9 days')::DATE
  WHERE id = p_customer_package_id;

  RETURN v_session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
