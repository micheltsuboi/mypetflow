-- =====================================================
-- MIGRATION: Fix Time Clock RLS
-- =====================================================

-- 1. Limpar políticas existentes para time_entries
DROP POLICY IF EXISTS "Staff can create own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Staff can view own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admin can view org time entries" ON public.time_entries;

-- 2. Staff pode criar próprias entradas
CREATE POLICY "Staff can create own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. Staff pode ver próprias entradas
CREATE POLICY "Staff can view own time entries" ON public.time_entries
  FOR SELECT USING (user_id = auth.uid());

-- 4. Staff pode ATUALIZAR próprias entradas (para registrar saída)
-- Permite atualizar apenas clock_out e justification
CREATE POLICY "Staff can update own time entries" ON public.time_entries
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Admin/Superadmin pode ver todas entradas da org (Não recursivo)
CREATE POLICY "Admin can view org time entries" ON public.time_entries
  FOR SELECT USING (
    org_id = public.get_my_org_id() 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );
