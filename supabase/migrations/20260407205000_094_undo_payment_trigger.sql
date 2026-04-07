-- Migration to add a trigger that reverts payment status when a transaction is deleted
-- This ensures that "undoing" a payment in the financial extract reflects in the original record.

CREATE OR REPLACE FUNCTION public.revert_payment_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Depending on the category, we find the related table using reference_id
    IF OLD.reference_id IS NOT NULL THEN
        
        -- Categoría: Pacotes
        IF OLD.category = 'Pacotes' THEN
            UPDATE public.customer_packages
            SET 
                payment_status = 'pending',
                total_paid = 0,
                payment_method = NULL
            WHERE id = OLD.reference_id;

        -- Categoría: Serviços (Agendamentos)
        ELSIF OLD.category = 'Serviços' THEN
            UPDATE public.appointments
            SET 
                payment_status = 'pending',
                paid_at = NULL,
                payment_method = NULL
            WHERE id = OLD.reference_id;

        -- Categoría: Venda Produto (Orders)
        ELSIF OLD.category = 'Venda Produto' THEN
            UPDATE public.orders
            SET 
                payment_status = 'pending',
                payment_method = NULL
            WHERE id = OLD.reference_id;

        -- Categoría: Consulta Veterinária
        ELSIF OLD.category = 'Consulta Veterinária' THEN
            UPDATE public.vet_consultations
            SET 
                payment_status = 'pending',
                payment_method = NULL
            WHERE id = OLD.reference_id;

        -- Categoría: Exame Veterinário
        ELSIF OLD.category = 'Exame Veterinário' THEN
            UPDATE public.vet_exams
            SET 
                payment_status = 'pending',
                payment_method = NULL
            WHERE id = OLD.reference_id;

        -- Categoría: Vacinas
        ELSIF OLD.category = 'Vacinas' THEN
            UPDATE public.pet_vaccines
            SET 
                payment_status = 'pending',
                payment_method = NULL
            WHERE id = OLD.reference_id;

        -- Categoría: Internamento / Hospital
        ELSIF OLD.category = 'Internamento / Hospital' THEN
            UPDATE public.hospital_admissions
            SET 
                payment_status = 'pending',
                payment_method = NULL
            WHERE id = OLD.reference_id;

        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_revert_payment_on_transaction_delete ON public.financial_transactions;

CREATE TRIGGER trg_revert_payment_on_transaction_delete
AFTER DELETE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.revert_payment_on_transaction_delete();
