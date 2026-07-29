-- Migration para corrigir RLS do módulo de laboratório para usuários com role 'owner' e 'vet'

DROP POLICY IF EXISTS "Staff can manage org lab_exams" ON public.lab_exams;
CREATE POLICY "Staff can manage org lab_exams" ON public.lab_exams
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org lab_parameters" ON public.lab_parameters;
CREATE POLICY "Staff can manage org lab_parameters" ON public.lab_parameters
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org lab_reference_ranges" ON public.lab_reference_ranges;
CREATE POLICY "Staff can manage org lab_reference_ranges" ON public.lab_reference_ranges
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org lab_requests" ON public.lab_requests;
CREATE POLICY "Staff can manage org lab_requests" ON public.lab_requests
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org lab_results" ON public.lab_results;
CREATE POLICY "Staff can manage org lab_results" ON public.lab_results
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));
