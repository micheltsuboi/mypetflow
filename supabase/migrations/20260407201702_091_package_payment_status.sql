-- Migration to add payment_status to customer_packages
ALTER TABLE public.customer_packages
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled', 'refunded'));

-- We also want to create a trigger so that if a customer package is updated to 'paid', 
-- all its associated sessions (and appointments) become 'paid'.

CREATE OR REPLACE FUNCTION public.sync_package_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
        -- Mark all related appointments as paid
        UPDATE public.appointments
        SET 
            payment_status = 'paid',
            paid_at = now(),
            payment_method = NEW.payment_method
        WHERE package_credit_id IN (
            SELECT id FROM public.package_credits WHERE customer_package_id = NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_package_payment_status ON public.customer_packages;

CREATE TRIGGER trg_sync_package_payment_status
AFTER UPDATE OF payment_status ON public.customer_packages
FOR EACH ROW
EXECUTE FUNCTION public.sync_package_payment_status();

-- And if an appointment of a package is marked as paid, we want to update the whole package?
-- The user said: "E se qualquer dos cards desse pacote eu marcar como pago, ele marcar pago no pacote."
-- We can add a trigger on `appointments` to update `customer_packages` when a package appointment is paid.

CREATE OR REPLACE FUNCTION public.sync_appointment_payment_to_package()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_package_id UUID;
BEGIN
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' AND NEW.is_package = true AND NEW.package_credit_id IS NOT NULL THEN
        -- Get the customer_package_id
        SELECT customer_package_id INTO v_customer_package_id
        FROM public.package_credits
        WHERE id = NEW.package_credit_id;

        IF v_customer_package_id IS NOT NULL THEN
            -- Update the customer package to paid (this will trigger the first trigger to update the rest of the appointments!)
            UPDATE public.customer_packages
            SET 
                payment_status = 'paid',
                payment_method = NEW.payment_method
            WHERE id = v_customer_package_id AND payment_status != 'paid';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_appointment_payment_to_package ON public.appointments;

CREATE TRIGGER trg_sync_appointment_payment_to_package
AFTER UPDATE OF payment_status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_appointment_payment_to_package();
