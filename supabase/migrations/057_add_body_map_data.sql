-- =====================================================
-- MIGRATION: 057_add_body_map_data.sql
-- Adiciona a coluna body_map_data na tabela vet_consultations
-- para armazenar os pinos/anotações do Body Map.
-- =====================================================

ALTER TABLE "public"."vet_consultations" ADD COLUMN IF NOT EXISTS "body_map_data" jsonb DEFAULT '[]'::jsonb;
