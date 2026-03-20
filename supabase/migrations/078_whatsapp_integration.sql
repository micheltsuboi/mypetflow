-- =====================================================
-- MIGRATION: 078_whatsapp_integration.sql
-- Integração Multi-tenant de WhatsApp no banco de dados
-- =====================================================

-- 1. Adicionar colunas de configuração na tabela organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS wa_integration_type TEXT DEFAULT 'system' CHECK (wa_integration_type IN ('system', 'custom')),
  ADD COLUMN IF NOT EXISTS wa_api_url TEXT,
  ADD COLUMN IF NOT EXISTS wa_api_token TEXT;

-- 2. Atualizar políticas para permitir que administradores da organização alterem as integrações
-- Note: A tabela organizations deve ter acesso de update restrito a papéis administrativos da própria org.
DROP POLICY IF EXISTS "Admin can update own organization" ON public.organizations;
CREATE POLICY "Admin can update own organization" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'owner'))
  );
