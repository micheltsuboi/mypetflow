-- =====================================================
-- MIGRATION: 20260728_fix_hospital_rls_owner.sql
-- DESCRIPTION: Permite que perfis com role 'owner' e 'vet' insiram e gerenciem medicações no Hospital
-- =====================================================

DROP POLICY IF EXISTS "Staff can manage org hospital_medications" ON public.hospital_medications;
DROP POLICY IF EXISTS "Staff and Owner can manage org hospital_medications" ON public.hospital_medications;
CREATE POLICY "Staff and Owner can manage org hospital_medications" ON public.hospital_medications
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org hospital_medication_logs" ON public.hospital_medication_logs;
DROP POLICY IF EXISTS "Staff and Owner can manage org hospital_medication_logs" ON public.hospital_medication_logs;
CREATE POLICY "Staff and Owner can manage org hospital_medication_logs" ON public.hospital_medication_logs
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org hospital_admissions" ON public.hospital_admissions;
DROP POLICY IF EXISTS "Staff and Owner can manage org hospital_admissions" ON public.hospital_admissions;
CREATE POLICY "Staff and Owner can manage org hospital_admissions" ON public.hospital_admissions
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org hospital_beds" ON public.hospital_beds;
DROP POLICY IF EXISTS "Staff and Owner can manage org hospital_beds" ON public.hospital_beds;
CREATE POLICY "Staff and Owner can manage org hospital_beds" ON public.hospital_beds
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org hospital_wards" ON public.hospital_wards;
DROP POLICY IF EXISTS "Staff and Owner can manage org hospital_wards" ON public.hospital_wards;
CREATE POLICY "Staff and Owner can manage org hospital_wards" ON public.hospital_wards
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));

DROP POLICY IF EXISTS "Staff can manage org hospital_bed_movements" ON public.hospital_bed_movements;
DROP POLICY IF EXISTS "Staff and Owner can manage org hospital_bed_movements" ON public.hospital_bed_movements;
CREATE POLICY "Staff and Owner can manage org hospital_bed_movements" ON public.hospital_bed_movements
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner', 'vet')));
