-- =====================================================
-- MIGRATION: 077_allow_owner_role_vet.sql
-- Adiciona o papel 'owner' nas políticas de gerenciamento do módulo veterinário
-- =====================================================

-- 1. veterinaries
DROP POLICY IF EXISTS "Staff can manage veterinarians" ON public.veterinarians;
CREATE POLICY "Staff can manage veterinarians" ON public.veterinarians
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner'))
  );

-- 2. vet_consultations
DROP POLICY IF EXISTS "Staff can manage vet_consultations" ON public.vet_consultations;
CREATE POLICY "Staff can manage vet_consultations" ON public.vet_consultations
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner'))
  );

-- 3. vet_records
DROP POLICY IF EXISTS "Staff can manage vet_records" ON public.vet_records;
CREATE POLICY "Staff can manage vet_records" ON public.vet_records
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner'))
  );

-- 4. vet_exam_types
DROP POLICY IF EXISTS "Staff can manage vet_exam_types" ON public.vet_exam_types;
CREATE POLICY "Staff can manage vet_exam_types" ON public.vet_exam_types
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner'))
  );

-- 5. vet_exams
DROP POLICY IF EXISTS "Staff can manage vet_exams" ON public.vet_exams;
CREATE POLICY "Staff can manage vet_exams" ON public.vet_exams
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner'))
  );

-- 6. financial_transactions (Para quando o exame é marcado como pago)
DROP POLICY IF EXISTS "Admin can manage transactions" ON public.financial_transactions;
CREATE POLICY "Admin can manage transactions" ON public.financial_transactions
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner'))
  );

DROP POLICY IF EXISTS "Admin can view org transactions" ON public.financial_transactions;
CREATE POLICY "Admin can view org transactions" ON public.financial_transactions
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'owner'))
  );
