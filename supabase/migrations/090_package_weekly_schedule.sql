-- =====================================================
-- MIGRATION 090: Agendamento automático de pacotes por dias fixos da semana
-- - Adiciona preferred_days_of_week[] a customer_packages
-- - Adiciona session_number a package_sessions
-- - Atualiza generate_package_sessions para suportar múltiplos dias
-- - Cria view v_appointments_with_package_info
-- =====================================================

-- 1. Adicionar session_number à tabela package_sessions
ALTER TABLE public.package_sessions 
  ADD COLUMN IF NOT EXISTS session_number INTEGER;

-- 2. Adicionar suporte a múltiplos dias preferidos na semana
ALTER TABLE public.customer_packages 
  ADD COLUMN IF NOT EXISTS preferred_days_of_week INTEGER[];

-- 3. Migrar dados existentes: converter preferred_day_of_week (singular) para o array
UPDATE public.customer_packages
SET preferred_days_of_week = ARRAY[preferred_day_of_week]
WHERE preferred_day_of_week IS NOT NULL
  AND preferred_days_of_week IS NULL;

-- 4. Atualizar generate_package_sessions para suportar múltiplos dias e session_number
DROP FUNCTION IF EXISTS public.generate_package_sessions(UUID);
CREATE OR REPLACE FUNCTION public.generate_package_sessions(
  p_customer_package_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_cp         RECORD;
  v_period     RECORD;
  v_items      RECORD;
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

  -- Buscar dados do customer_package + service_package
  SELECT cp.*, sp.validity_type, sp.validity_weeks
  INTO v_cp
  FROM public.customer_packages cp
  JOIN public.service_packages sp ON sp.id = cp.package_id
  WHERE cp.id = p_customer_package_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Calcular período
  IF v_cp.period_start IS NOT NULL AND v_cp.period_start >= v_today THEN
    SELECT v_cp.period_start AS period_start, v_cp.period_end AS period_end INTO v_period;
  ELSE
    -- Usar o primeiro dia preferido (do array) ou today para calcular período
    DECLARE
      v_first_day INTEGER := NULL;
    BEGIN
      IF v_cp.preferred_days_of_week IS NOT NULL AND array_length(v_cp.preferred_days_of_week, 1) > 0 THEN
        v_first_day := v_cp.preferred_days_of_week[1];
      ELSIF v_cp.preferred_day_of_week IS NOT NULL THEN
        v_first_day := v_cp.preferred_day_of_week;
      END IF;
      SELECT * INTO v_period FROM public.get_package_period(v_cp.validity_type, v_cp.validity_weeks, v_today, v_first_day);
    END;
  END IF;

  -- Atualizar período no customer_package
  UPDATE public.customer_packages
  SET period_start = v_period.period_start,
      period_end   = v_period.period_end
  WHERE id = p_customer_package_id;

  -- Determinar array de dias preferidos
  IF v_cp.preferred_days_of_week IS NOT NULL AND array_length(v_cp.preferred_days_of_week, 1) > 0 THEN
    v_days := v_cp.preferred_days_of_week;
  ELSIF v_cp.preferred_day_of_week IS NOT NULL THEN
    v_days := ARRAY[v_cp.preferred_day_of_week];
  ELSE
    v_days := NULL;
  END IF;

  -- Data de início efetiva: a maior entre hoje e period_start
  v_start_date := GREATEST(v_today, v_period.period_start);

  -- Para cada serviço do pacote
  FOR v_items IN
    SELECT pi.service_id, pi.quantity
    FROM public.package_items pi
    WHERE pi.package_id = v_cp.package_id
  LOOP
    -- Evitar duplicação: se já existem sessões para este período, pular
    IF EXISTS (
      SELECT 1 FROM public.package_sessions
      WHERE customer_package_id = p_customer_package_id
        AND service_id = v_items.service_id
        AND period_start = v_period.period_start
    ) THEN
      CONTINUE;
    END IF;

    v_session_counter := 0;

    IF v_days IS NOT NULL AND v_cp.preferred_time IS NOT NULL THEN
      -- Modo com dias fixos: gerar sessões distribuídas nas semanas
      v_weeks_ahead := 0;

      WHILE v_session_counter < v_items.quantity LOOP
        -- Para cada dia preferido desta semana
        FOREACH v_day IN ARRAY v_days LOOP
          IF v_session_counter >= v_items.quantity THEN EXIT; END IF;

          -- Calcular o offset de dias para chegar no dia desejado a partir de v_start_date
          v_day_offset := (v_day - EXTRACT(DOW FROM v_start_date)::INTEGER + 7) % 7;
          v_candidate_date := v_start_date + v_day_offset + (v_weeks_ahead * 7);

          -- Pular datas fora do período
          IF v_candidate_date > v_period.period_end THEN
            -- Saímos do período, parar
            v_weeks_ahead := 999; -- forçar saída do WHILE
            EXIT;
          END IF;

          -- Montar timestamp com horário preferido (fuso -03:00 Brasil)
          v_session_ts := (v_candidate_date::TEXT || ' ' || v_cp.preferred_time::TEXT || '-03:00')::TIMESTAMPTZ;

          -- Evitar duplicação por timestamp
          IF EXISTS (
            SELECT 1 FROM public.package_sessions
            WHERE customer_package_id = p_customer_package_id
              AND service_id = v_items.service_id
              AND scheduled_at = v_session_ts
          ) THEN
            -- Mesmo assim conta como sessão (já existia)
            v_session_counter := v_session_counter + 1;
            CONTINUE;
          END IF;

          v_session_counter := v_session_counter + 1;

          INSERT INTO public.package_sessions (
            customer_package_id, service_id, period_start, period_end,
            scheduled_at, status, session_number
          ) VALUES (
            p_customer_package_id, v_items.service_id, v_period.period_start, v_period.period_end,
            v_session_ts, 'scheduled', v_session_counter
          );
          v_sessions_created := v_sessions_created + 1;
        END LOOP;

        v_weeks_ahead := v_weeks_ahead + 1;

        -- Segurança contra loop infinito
        IF v_weeks_ahead > 52 THEN EXIT; END IF;
      END LOOP;

    ELSE
      -- Sem dias preferidos: criar sessões sem data/hora (status pending)
      FOR i IN 1..v_items.quantity LOOP
        INSERT INTO public.package_sessions (
          customer_package_id, service_id, period_start, period_end,
          scheduled_at, status, session_number
        ) VALUES (
          p_customer_package_id, v_items.service_id, v_period.period_start, v_period.period_end,
          NULL, 'pending', i
        );
        v_sessions_created := v_sessions_created + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_sessions_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar view de agendamentos com informação de sessão de pacote
-- (Usada pelos módulos para exibir "Sessão X de Y")
DROP VIEW IF EXISTS public.v_appointments_with_package_info;
CREATE OR REPLACE VIEW public.v_appointments_with_package_info AS
SELECT
  a.id,
  a.org_id,
  a.pet_id,
  a.service_id,
  a.scheduled_at,
  a.status,
  a.notes,
  a.calculated_price,
  a.final_price,
  a.discount_percent,
  a.discount_type,
  a.discount,
  a.payment_status,
  a.payment_method,
  a.actual_check_in,
  a.actual_check_out,
  a.check_in_date,
  a.check_out_date,
  a.is_package,
  a.package_credit_id,
  a.checklist,
  a.paid_at,
  a.created_at,
  a.updated_at,
  ps.session_number,
  ps.customer_package_id,
  pc.total_quantity AS total_sessions,
  sp.name AS package_name
FROM public.appointments a
LEFT JOIN public.package_sessions ps ON ps.appointment_id = a.id
LEFT JOIN public.package_credits pc ON pc.id = a.package_credit_id
LEFT JOIN public.customer_packages cp ON cp.id = ps.customer_package_id
LEFT JOIN public.service_packages sp ON sp.id = cp.package_id;

-- Grant acesso para os roles do Supabase
GRANT SELECT ON public.v_appointments_with_package_info TO authenticated;
GRANT SELECT ON public.v_appointments_with_package_info TO anon;

-- 6. Preencher session_number retroativamente para sessões existentes sem esse campo
-- (ordena por scheduled_at para manter a sequência lógica)
DO $$
DECLARE
  v_pkg RECORD;
  v_counter INTEGER;
  v_sess RECORD;
BEGIN
  FOR v_pkg IN
    SELECT DISTINCT customer_package_id, service_id
    FROM public.package_sessions
    WHERE session_number IS NULL
  LOOP
    v_counter := 0;
    FOR v_sess IN
      SELECT id FROM public.package_sessions
      WHERE customer_package_id = v_pkg.customer_package_id
        AND service_id = v_pkg.service_id
        AND session_number IS NULL
      ORDER BY COALESCE(scheduled_at, NOW() + INTERVAL '1 year'), created_at
    LOOP
      v_counter := v_counter + 1;
      UPDATE public.package_sessions
      SET session_number = v_counter
      WHERE id = v_sess.id;
    END LOOP;
  END LOOP;
END;
$$;

-- 7. Criar agendamentos automaticamente quando package_session tiver scheduled_at
-- (Trigger que cria/atualiza appointment ao setar scheduled_at numa sessão)
CREATE OR REPLACE FUNCTION public.sync_package_session_to_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_cp    RECORD;
  v_appt_id UUID;
BEGIN
  -- Só processar se scheduled_at foi preenchido/alterado e ainda não tem appointment vinculado
  IF NEW.scheduled_at IS NOT NULL AND NEW.appointment_id IS NULL THEN
    SELECT cp.*, sp.name AS package_name
    INTO v_cp
    FROM public.customer_packages cp
    JOIN public.service_packages sp ON sp.id = cp.package_id
    WHERE cp.id = NEW.customer_package_id;

    IF v_cp IS NOT NULL THEN
      INSERT INTO public.appointments (
        org_id, pet_id, service_id, scheduled_at, status,
        is_package, package_credit_id,
        final_price, calculated_price,
        notes
      )
      SELECT
        cp.org_id,
        COALESCE(cp.pet_id, (
          SELECT pet_id FROM public.package_credits WHERE customer_package_id = NEW.customer_package_id LIMIT 1
        )),
        NEW.service_id,
        NEW.scheduled_at,
        'pending',
        TRUE,
        (SELECT id FROM public.package_credits WHERE customer_package_id = NEW.customer_package_id AND service_id = NEW.service_id LIMIT 1),
        0,
        0,
        'Sessão ' || COALESCE(NEW.session_number::TEXT, '?') || ' - Pacote: ' || v_cp.package_name
      FROM public.customer_packages cp
      WHERE cp.id = NEW.customer_package_id
      RETURNING id INTO v_appt_id;

      -- Vincular o appointment à sessão
      IF v_appt_id IS NOT NULL THEN
        UPDATE public.package_sessions
        SET appointment_id = v_appt_id
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger anterior se existir e recriar
DROP TRIGGER IF EXISTS trg_sync_package_session_to_appointment ON public.package_sessions;
CREATE TRIGGER trg_sync_package_session_to_appointment
  AFTER INSERT ON public.package_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_package_session_to_appointment();
