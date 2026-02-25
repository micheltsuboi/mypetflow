-- =====================================================
-- MIGRATION: n8n_webhooks
-- DESCRIPTION: Cria função e trigger para notificar o N8N
-- via HTTP quando o status de um agendamento muda.
-- REQUISITO: Extensão pg_net deve estar habilitada no Supabase
-- (Dashboard → Database → Extensions → pg_net)
-- =====================================================

-- 1. Habilitar a extensão pg_net (se ainda não estiver ativa)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar a função que dispara o webhook para o Next.js API Route
CREATE OR REPLACE FUNCTION public.notify_n8n_on_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payload JSONB;
    v_app_url TEXT := 'https://mypetflow.com.br'; -- URL de produção da Vercel
    v_secret TEXT := 'mypetflow_n8n_secret_2026';
BEGIN
    -- Monta o payload no formato esperado pelo Next.js
    v_payload := jsonb_build_object(
        'type',       TG_OP,
        'table',      TG_TABLE_NAME,
        'record',     row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );

    -- Apenas dispara para mudanças de status relevantes (INSERT ou UPDATE de status)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        PERFORM net.http_post(
            url     := v_app_url || '/api/n8n-trigger',
            body    := v_payload::TEXT,
            headers := jsonb_build_object(
                'Content-Type',      'application/json',
                'x-webhook-secret',  v_secret
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Criar o trigger na tabela appointments
DROP TRIGGER IF EXISTS on_appointment_status_change ON public.appointments;

CREATE TRIGGER on_appointment_status_change
    AFTER INSERT OR UPDATE OF status ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_on_appointment_change();
