-- Migration: Add RLS policies for appointment_daily_reports
-- Ensures security where Staff can manage and Customers can view reports for their own pets

-- Enable RLS on the table (in case it is not already enabled)
ALTER TABLE public.appointment_daily_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Staff can view org daily reports" ON public.appointment_daily_reports;
DROP POLICY IF EXISTS "Staff can manage org daily reports" ON public.appointment_daily_reports;
DROP POLICY IF EXISTS "Customers can view own pet daily reports" ON public.appointment_daily_reports;

-- 1. SELECT policy for Staff/Admin/Superadmin of the organization
CREATE POLICY "Staff can view org daily reports" ON public.appointment_daily_reports
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
        )
    );

-- 2. ALL (INSERT, UPDATE, DELETE) policy for Staff/Admin/Superadmin to manage daily reports
CREATE POLICY "Staff can manage org daily reports" ON public.appointment_daily_reports
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
        )
    );

-- 3. SELECT policy for Customers (Tutors) to view daily reports of their own pets
CREATE POLICY "Customers can view own pet daily reports" ON public.appointment_daily_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            JOIN public.pets p ON p.id = a.pet_id
            JOIN public.customers c ON c.id = p.customer_id
            WHERE a.id = appointment_daily_reports.appointment_id
              AND c.user_id = auth.uid()
        )
    );
