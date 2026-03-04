-- =====================================================
-- MIGRATION: 056_restrict_vet_records_to_veterinarians.sql
-- Restringe a edição/exclusão de consultas, prontuários e exames apenas ao veterinário responsável
-- Owner e outros staff perdem permissão de escrita nessas tabelas (apenas leitura)
-- =====================================================

-- 1. VET_CONSULTATIONS: Limpar políticas existentes e criar restritivas
DROP POLICY IF EXISTS "Staff can manage vet_consultations" ON public.vet_consultations;

-- Permissão para Staff/Owner (Apenas SELECT)
CREATE POLICY "Staff can view vet_consultations" ON public.vet_consultations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff', 'superadmin'))
  );

-- Permissão para Veterinário (Full access apenas ao seu próprio vínculo de usuário)
-- Usamos user_id do perfil que deve estar vinculado à tabela veterinarians
CREATE POLICY "Veterinarians can manage their own consultations" ON public.vet_consultations
  FOR ALL USING (
    veterinarian_id IN (SELECT id FROM public.veterinarians WHERE user_id = auth.uid())
  );

-- Caso a consulta não tenha veterinário (ex: criada manual pelo owner sem vincular), 
-- o owner pode deletar ou editar? O usuário pediu que ÚNICO que possa alterar seja o veterinário.
-- Se não tem veterinário, ninguém altera? Ou criamos uma exceção para o criador original?
-- Conforme pedido ("único que pode alterar ou editar seria o veterinário"), manteremos estrito.


-- 2. VET_RECORDS: Limpar políticas existentes e criar restritivas
DROP POLICY IF EXISTS "Staff can manage vet_records" ON public.vet_records;

CREATE POLICY "Staff can view vet_records" ON public.vet_records
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff', 'superadmin'))
  );

CREATE POLICY "Veterinarians can manage their own records" ON public.vet_records
  FOR ALL USING (
    veterinarian_id IN (SELECT id FROM public.veterinarians WHERE user_id = auth.uid())
  );


-- 3. VET_EXAMS: Limpar políticas existentes e criar restritivas
DROP POLICY IF EXISTS "Staff can manage vet_exams" ON public.vet_exams;

CREATE POLICY "Staff can view vet_exams" ON public.vet_exams
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff', 'superadmin'))
  );

CREATE POLICY "Veterinarians can manage their own exams" ON public.vet_exams
  FOR ALL USING (
    veterinarian_id IN (SELECT id FROM public.veterinarians WHERE user_id = auth.uid())
  );

-- 4. Polling Policy for ASSESSMENT_ANSWERS (O opcional: apenas veterinário mexe em saúde?)
-- No momento assessment é compartilhado, mas se o usuário quiser restringir a categoria 'health', 
-- seria necessário uma lógica mais complexa. Por enquanto, focaremos em Consultas/Prontuários/Exames.
