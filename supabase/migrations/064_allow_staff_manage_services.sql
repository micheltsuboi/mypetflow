-- Allow staff members to manage services and pricing matrix
-- This fix addresses the issue where staff logins could not create or edit services.

-- 1. Services Table
DROP POLICY IF EXISTS "Admin can manage services" ON public.services;

CREATE POLICY "Staff and Admin can manage services" ON public.services
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

-- 2. Pricing Matrix Table
DROP POLICY IF EXISTS "Admin can manage pricing" ON public.pricing_matrix;

CREATE POLICY "Staff and Admin can manage pricing" ON public.pricing_matrix
  FOR ALL USING (
    service_id IN (
      SELECT id FROM public.services 
      WHERE org_id IN (
        SELECT org_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
      )
    )
  );

-- 3. Service Categories Table (Just in case, check existing policies)
-- Usually viewable by everyone, but let's ensure management if needed.
-- Check if it exists and has policies. 
DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_categories') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin can manage categories" ON public.service_categories';
    EXECUTE 'CREATE POLICY "Staff and Admin can manage categories" ON public.service_categories
      FOR ALL USING (
        org_id IN (
          SELECT org_id FROM public.profiles 
          WHERE id = auth.uid() AND role IN (''admin'', ''staff'', ''superadmin'')
        )
      )';
  END IF;
END $$;
