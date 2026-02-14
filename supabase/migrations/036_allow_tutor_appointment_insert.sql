-- Migration: Allow tutors to insert appointments
-- Fixes the error where tutors cannot create bookings due to RLS

CREATE POLICY "Tutors can create own appointments" ON public.appointments
FOR INSERT WITH CHECK (
    -- The pet must belong to the user
    pet_id IN (
        SELECT id FROM public.pets 
        WHERE customer_id IN (
            SELECT id FROM public.customers WHERE user_id = auth.uid()
        )
    )
    -- AND the customer_id must match the user's customer record
    AND customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
);
