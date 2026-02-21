-- Add permissions column to profiles table for granular staff module access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Typical permissions expected: 'banho_tosa', 'creche', 'hospedagem', 'servicos', 'ponto'
-- Only applicable for users with role = 'staff'.
