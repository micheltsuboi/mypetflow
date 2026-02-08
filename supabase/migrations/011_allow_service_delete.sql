-- Ensure Admins can delete services
-- First drop existing policy to avoid conflict if names match, though 'create or replace' isn't supported for policies directly in all versions comfortably without drop.

DROP POLICY IF EXISTS "Admin can manage services" ON public.services;
DROP POLICY IF EXISTS "Services are viewable by everyone in org" ON public.services;

-- Re-create comprehensive policy
CREATE POLICY "Admin can manage services" ON public.services
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Services are viewable by everyone in org" ON public.services
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );
