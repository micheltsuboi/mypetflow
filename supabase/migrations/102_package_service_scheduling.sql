-- =====================================================
-- MIGRATION 102: Agendamento dinâmico por serviço no pacote
-- Adiciona preferred_days_of_week e preferred_time aos créditos (package_credits)
-- Reescreve generate_package_sessions para ler de cada serviço.
-- =====================================================

ALTER TABLE public.package_credits
  ADD COLUMN IF NOT EXISTS preferred_days_of_week INTEGER[],
  ADD COLUMN IF NOT EXISTS preferred_time TIME;

DROP FUNCTION IF EXISTS public.generate_package_sessions(UUID);
CREATE OR REPLACE FUNCTION public.generate_package_sessions(
  p_customer_package_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_cp         RECORD;
  v_period     RECORD;
  v_credit     RECORD;
  v_day        INTEGER;
  v_days       INTEGER[];
  v_session_counter INTEGER;
  v_sessions_created INTEGER := 0;
  v_session_ts TIMESTAMPTZ;
  v_today      DATE;
  v_start_date DATE;
  v_weeks_ahead INTEGER;
  v_candidate_date DATE;
  v_day_offset INTEGER;
BEGIN
  v_today := CURRENT_DATE;

  SELECT cp.*, sp.validity_type, sp.validity_weeks
  INTO v_cp
  FROM public.customer_packages cp
  JOIN public.service_packages sp ON sp.id = cp.package_id
  WHERE cp.id = p_customer_package_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_cp.period_start IS NOT NULL AND v_cp.period_start >= v_today THEN
    SELECT v_cp.period_start AS period_start, v_cp.period_end AS period_end INTO v_period;
  ELSE
    DECLARE
      v_first_day INTEGER := NULL;
    BEGIN
      -- Tenta achar o primeiro dia configurado em qualquer crédito do pacote
      SELECT c.preferred_days_of_week[1] INTO v_first_day
      FROM public.package_credits c
      WHERE c.customer_package_id = p_customer_package_id
        AND c.preferred_days_of_week IS NOT NULL
        AND array_length(c.preferred_days_of_week, 1) > 0
      LIMIT 1;

      IF v_first_day IS NULL THEN
        IF v_cp.preferred_days_of_week IS NOT NULL AND array_length(v_cp.preferred_days_of_week, 1) > 0 THEN
          v_first_day := v_cp.preferred_days_of_week[1];
        ELSIF v_cp.preferred_day_of_week IS NOT NULL THEN
          v_first_day := v_cp.preferred_day_of_week;
        END IF;
      END IF;

      SELECT * INTO v_period FROM public.get_package_period(v_cp.validity_type, v_cp.validity_weeks, v_today, v_first_day);
    END;
  END IF;

  UPDATE public.customer_packages
  SET period_start = v_period.period_start,
      period_end   = v_period.period_end
  WHERE id = p_customer_package_id;

  v_start_date := GREATEST(v_today, v_period.period_start);

  -- Agora itera sobre OS CRÉDITOS (cada serviço) em vez de package_items
  FOR v_credit IN
    SELECT service_id, total_quantity AS quantity, preferred_days_of_week, preferred_time
    FROM public.package_credits
    WHERE customer_package_id = p_customer_package_id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.package_sessions
      WHERE customer_package_id = p_customer_package_id
        AND service_id = v_credit.service_id
        AND period_start = v_period.period_start
    ) THEN
      CONTINUE;
    END IF;

    v_session_counter := 0;

    -- Define quais dias a usar:
    -- Preferência do crédito individual, ou fallback para a preferência global do pacote
    IF v_credit.preferred_days_of_week IS NOT NULL AND array_length(v_credit.preferred_days_of_week, 1) > 0 THEN
      v_days := v_credit.preferred_days_of_week;
    ELSIF v_cp.preferred_days_of_week IS NOT NULL AND array_length(v_cp.preferred_days_of_week, 1) > 0 THEN
      v_days := v_cp.preferred_days_of_week;
    ELSIF v_cp.preferred_day_of_week IS NOT NULL THEN
      v_days := ARRAY[v_cp.preferred_day_of_week];
    ELSE
      v_days := NULL;
    END IF;

    -- Define qual tempo usar
    DECLARE
      v_pref_time TIME;
    BEGIN
      IF v_credit.preferred_time IS NOT NULL THEN
        v_pref_time := v_credit.preferred_time;
      ELSE
        v_pref_time := v_cp.preferred_time;
      END IF;

      IF v_days IS NOT NULL AND v_pref_time IS NOT NULL THEN
        v_weeks_ahead := 0;

        WHILE v_session_counter < v_credit.quantity LOOP
          FOREACH v_day IN ARRAY v_days LOOP
            IF v_session_counter >= v_credit.quantity THEN EXIT; END IF;

            v_day_offset := (v_day - EXTRACT(DOW FROM v_start_date)::INTEGER + 7) % 7;
            v_candidate_date := v_start_date + v_day_offset + (v_weeks_ahead * 7);

            IF v_candidate_date > v_period.period_end THEN
              v_weeks_ahead := 999; 
              EXIT;
            END IF;

            v_session_ts := (v_candidate_date::TEXT || ' ' || v_pref_time::TEXT || '-03:00')::TIMESTAMPTZ;

            IF EXISTS (
              SELECT 1 FROM public.package_sessions
              WHERE customer_package_id = p_customer_package_id
                AND service_id = v_credit.service_id
                AND scheduled_at = v_session_ts
            ) THEN
              v_session_counter := v_session_counter + 1;
              CONTINUE;
            END IF;

            v_session_counter := v_session_counter + 1;

            INSERT INTO public.package_sessions (
              customer_package_id, service_id, period_start, period_end,
              scheduled_at, status, session_number
            ) VALUES (
              p_customer_package_id, v_credit.service_id, v_period.period_start, v_period.period_end,
              v_session_ts, 'scheduled', v_session_counter
            );
            v_sessions_created := v_sessions_created + 1;
          END LOOP;

          v_weeks_ahead := v_weeks_ahead + 1;
          IF v_weeks_ahead > 52 THEN EXIT; END IF;
        END LOOP;
      ELSE
        FOR i IN 1..v_credit.quantity LOOP
          INSERT INTO public.package_sessions (
            customer_package_id, service_id, period_start, period_end,
            scheduled_at, status, session_number
          ) VALUES (
            p_customer_package_id, v_credit.service_id, v_period.period_start, v_period.period_end,
            NULL, 'pending', i
          );
          v_sessions_created := v_sessions_created + 1;
        END LOOP;
      END IF;
    END;
  END LOOP;

  RETURN v_sessions_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
