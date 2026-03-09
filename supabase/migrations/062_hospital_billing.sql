-- =====================================================
-- MIGRATION: 062_hospital_billing.sql
-- DESCRIPTION: Adiciona integração de faturamento no Hospital Veterinário
-- =====================================================

-- 1. Inserir Categoria de Serviço "Internamento"
INSERT INTO public.service_categories (name, color, icon)
VALUES ('Internamento', '#3B82F6', '🏥')
ON CONFLICT (name) DO NOTHING;

-- 2. Adicionar campos de faturamento na tabela de admissões hospitalares
ALTER TABLE public.hospital_admissions 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'paid'
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00;
