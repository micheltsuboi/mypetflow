-- =====================================================
-- MIGRATION: Adiciona flag is_package nos appointments
-- =====================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_package BOOLEAN DEFAULT false;
