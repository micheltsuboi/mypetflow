-- 1. Adicionar coluna wa_client_token na tabela organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS wa_client_token TEXT;
