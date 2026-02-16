-- Fix: Restrict "View Org Data" policies to Staff/Admin only to prevent data leakage between customers

-- 1. Update Customers Policy
DROP POLICY IF EXISTS "Users can view org customers" ON public.customers;
CREATE POLICY "Staff can view org customers" ON public.customers
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

-- 2. Update Pets Policy
DROP POLICY IF EXISTS "Users can view org pets" ON public.pets;
CREATE POLICY "Staff can view org pets" ON public.pets
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE org_id IN (
        SELECT org_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
      )
    )
  );

-- 3. Update Appointments Policy
DROP POLICY IF EXISTS "Users can view org appointments" ON public.appointments;
CREATE POLICY "Staff can view org appointments" ON public.appointments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

-- 4. Update Daily Reports Policy
DROP POLICY IF EXISTS "Users can view org reports" ON public.daily_reports;
CREATE POLICY "Staff can view org reports" ON public.daily_reports
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

-- 5. Update Service Credits Policy (Prevent leakage here too)
DROP POLICY IF EXISTS "Users can view org credits" ON public.service_credits;
CREATE POLICY "Staff can view org credits" ON public.service_credits
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

-- Ensure Tutors can see their own Service Credits (Missing from previous migrations)
CREATE POLICY "Tutors can view own credits" ON public.service_credits
  FOR SELECT USING (
    pet_id IN (
        SELECT id FROM public.pets
        WHERE customer_id IN (
            SELECT id FROM public.customers WHERE user_id = auth.uid()
        )
    )
  );
