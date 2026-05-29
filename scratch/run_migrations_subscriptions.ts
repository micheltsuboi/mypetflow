import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/micheltsuboi/Documents/MY PET FLOW/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('--- EXECUTANDO ATUALIZAÇÃO DA MODELAGEM NO BANCO ---');

  const ddlSql = `
    -- 1. Adiciona recurrence_type na package_items
    ALTER TABLE public.package_items 
    ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('fixed', 'weekly')) DEFAULT 'fixed';

    -- 2. Adiciona recurrence_type na package_credits
    ALTER TABLE public.package_credits 
    ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('fixed', 'weekly')) DEFAULT 'fixed';
  `;

  console.log('Adicionando colunas de tipo de recorrência...');
  const { data: ddlData, error: ddlError } = await supabase.rpc('exec_sql', { sql_query: ddlSql });
  
  if (ddlError) {
    console.error('Erro ao atualizar tabelas no banco:', ddlError);
    return;
  }
  console.log('✅ Colunas recurrence_type adicionadas com sucesso!', ddlData);

  const functionSql = `
    CREATE OR REPLACE FUNCTION public.generate_subscription_sessions_for_month(
      p_customer_package_id UUID,
      p_month_start DATE DEFAULT NULL
    )
    RETURNS INTEGER AS $$
    DECLARE
      v_cp customer_packages%ROWTYPE;
      v_credit RECORD;
      v_day_of_week INT;
      v_session_time TIME;
      v_month_start DATE;
      v_month_end DATE;
      v_current_date DATE;
      v_session_count INT := 0;
      v_scheduled_at TIMESTAMPTZ;
      v_session_counter INT;
      v_weeks_ahead INT;
      v_day_offset INT;
      v_candidate_date DATE;
      v_days INTEGER[];
      v_target_quantity INT;
    BEGIN
      -- 1. Carrega dados do contrato
      SELECT * INTO v_cp FROM public.customer_packages WHERE id = p_customer_package_id;
      IF NOT FOUND THEN RETURN 0; END IF;

      v_month_start := COALESCE(p_month_start, date_trunc('month', CURRENT_DATE)::DATE);
      v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

      -- 2. Itera sobre OS CRÉDITOS (cada serviço) em package_credits associados ao contrato
      FOR v_credit IN
        SELECT service_id, total_quantity AS quantity, preferred_days_of_week, preferred_time, 
               COALESCE(recurrence_type, 'fixed') AS recurrence_type, used_quantity
        FROM public.package_credits
        WHERE customer_package_id = p_customer_package_id
      LOOP
        -- Se já existirem sessões para este serviço geradas neste período (mês atual), pulamos
        -- Isso garante idempotência (útil no retry do n8n)
        IF EXISTS (
          SELECT 1 FROM public.package_sessions
          WHERE customer_package_id = p_customer_package_id
            AND service_id = v_credit.service_id
            AND period_start = v_month_start
        ) THEN
          CONTINUE;
        END IF;

        v_session_counter := 0;

        -- Define quais dias a usar para este serviço (preferencial do crédito individual, ou fallback global da mensalidade)
        IF v_credit.preferred_days_of_week IS NOT NULL AND array_length(v_credit.preferred_days_of_week, 1) > 0 THEN
          v_days := v_credit.preferred_days_of_week;
        ELSIF v_cp.preferred_days_of_week IS NOT NULL AND array_length(v_cp.preferred_days_of_week, 1) > 0 THEN
          v_days := v_cp.preferred_days_of_week;
        ELSIF v_cp.preferred_day_of_week IS NOT NULL THEN
          v_days := ARRAY[v_cp.preferred_day_of_week];
        ELSE
          v_days := NULL;
        END IF;

        -- Define qual tempo usar para este serviço
        IF v_credit.preferred_time IS NOT NULL THEN
          v_session_time := v_credit.preferred_time;
        ELSE
          v_session_time := v_cp.preferred_time;
        END IF;

        -- Se for recorrência semanal, nós calculamos dinamicamente as sessões do calendário.
        -- Para isso, colocamos um limite temporário alto para gerar todas as ocorrências do mês.
        IF v_credit.recurrence_type = 'weekly' THEN
          v_target_quantity := 99; -- Limite alto para cobrir todas as semanas do mês
        ELSE
          v_target_quantity := v_credit.quantity; -- Limite fixo contratado
        END IF;

        -- Se tivermos dias e horário definidos, agendamos automaticamente as sessões correspondentes do mês
        IF v_days IS NOT NULL AND v_session_time IS NOT NULL THEN
          v_weeks_ahead := 0;
          WHILE v_session_counter < v_target_quantity LOOP
            FOREACH v_day_of_week IN ARRAY v_days LOOP
              IF v_session_counter >= v_target_quantity THEN EXIT; END IF;

              -- Encontra a data do dia da semana a partir de v_month_start
              v_current_date := v_month_start;
              v_day_offset := (v_day_of_week - EXTRACT(DOW FROM v_current_date)::INT + 7) % 7;
              v_candidate_date := v_current_date + v_day_offset + (v_weeks_ahead * 7);

              -- Se estourou o mês atual, a geração de sessões no calendário para este mês termina
              IF v_candidate_date > v_month_end THEN
                v_weeks_ahead := 999;
                EXIT;
              END IF;

              v_scheduled_at := (v_candidate_date::TEXT || ' ' || v_session_time::TEXT || '-03:00')::TIMESTAMPTZ;

              -- Insere a sessão se não existir
              IF NOT EXISTS (
                SELECT 1 FROM public.package_sessions
                WHERE customer_package_id = p_customer_package_id
                  AND service_id = v_credit.service_id
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
                  v_credit.service_id,
                  v_month_start,
                  v_month_end,
                  v_scheduled_at,
                  'scheduled',
                  v_session_counter
                );
                v_session_count := v_session_count + 1;
              ELSE
                v_session_counter := v_session_counter + 1;
              END IF;
            END LOOP;
            v_weeks_ahead := v_weeks_ahead + 1;
            IF v_weeks_ahead > 6 THEN EXIT; END IF; -- Prevenção de loop infinito
          END LOOP;

          -- Se for semanal, atualizamos os créditos em package_credits com o número real de sessões geradas
          IF v_credit.recurrence_type = 'weekly' THEN
            UPDATE public.package_credits
            SET total_quantity = v_session_counter,
                remaining_quantity = v_session_counter - used_quantity
            WHERE customer_package_id = p_customer_package_id
              AND service_id = v_credit.service_id;
          ELSE
            -- Se for fixo e a quantidade de créditos do serviço for maior que os dias de semana gerados no mês, o restante fica pendente (flexível)
            WHILE v_session_counter < v_target_quantity LOOP
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
                v_credit.service_id,
                v_month_start,
                v_month_end,
                NULL,
                'pending',
                v_session_counter
              );
              v_session_count := v_session_count + 1;
            END LOOP;
          END IF;

        ELSE
          -- Sem dias ou horários definidos: todas as sessões do serviço são geradas como 'pending'
          -- (Isto só se aplica a serviços fixos, pois os semanais requerem dia da semana definido)
          WHILE v_session_counter < v_target_quantity LOOP
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
              v_credit.service_id,
              v_month_start,
              v_month_end,
              NULL,
              'pending',
              v_session_counter
            );
            v_session_count := v_session_count + 1;
          END LOOP;
        END IF;
      END LOOP;

      -- 3. Atualiza datas de controle do contrato
      UPDATE public.customer_packages
      SET
        next_renewal_date = (v_month_start + INTERVAL '1 month')::DATE,
        due_date = (v_month_start + INTERVAL '1 month' - INTERVAL '21 days' + INTERVAL '9 days')::DATE
      WHERE id = p_customer_package_id;

      RETURN v_session_count;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  console.log('Recriando função generate_subscription_sessions_for_month...');
  const { error: funcError } = await supabase.rpc('exec_sql', { sql_query: functionSql });

  if (funcError) {
    console.error('Erro ao criar função generate_subscription_sessions_for_month:', funcError);
    return;
  }
  console.log('✅ Função generate_subscription_sessions_for_month recriada com sucesso!');
}

run().catch(console.error);
