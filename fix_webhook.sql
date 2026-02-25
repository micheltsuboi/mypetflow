DROP TRIGGER IF EXISTS on_appointment_status_change ON public.appointments;
DROP FUNCTION IF EXISTS public.notify_n8n_on_appointment_change();

CREATE OR REPLACE FUNCTION public.notify_n8n_on_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payload JSONB;
    v_app_url TEXT := 'https://mypetflow.vercel.app';
    v_secret TEXT := 'mypetflow_n8n_secret_2026';
    v_request_id BIGINT;
BEGIN
    v_payload := jsonb_build_object(
        'type',       TG_OP,
        'table',      TG_TABLE_NAME,
        'record',     row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );

    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Cast url and body appropriately as required by pg_net
        SELECT net.http_post(
            url := (v_app_url || '/api/n8n-trigger')::text,
            body := v_payload::jsonb,
            headers := jsonb_build_object(
                'Content-Type',      'application/json',
                'x-webhook-secret',  v_secret
            )
        ) INTO v_request_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_status_change
    AFTER INSERT OR UPDATE OF status ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_on_appointment_change();
