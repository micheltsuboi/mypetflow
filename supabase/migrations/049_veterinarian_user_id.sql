-- =====================================================
-- MIGRATION: 049_veterinarian_user_id.sql
-- Adiciona vínculo entre veterinário e usuário do sistema
-- =====================================================

ALTER TABLE public.veterinarians 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_veterinarians_user_id ON public.veterinarians(user_id) WHERE user_id IS NOT NULL;
