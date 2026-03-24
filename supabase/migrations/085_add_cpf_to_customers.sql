-- Migration 085: Add CPF/CNPJ to customers/tutors
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rg TEXT;

COMMENT ON COLUMN customers.cpf_cnpj IS 'CPF ou CNPJ do tutor para emissão de nota fiscal';
