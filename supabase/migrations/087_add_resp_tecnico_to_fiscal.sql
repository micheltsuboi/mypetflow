-- Add Technical Responsible fields to fiscal_config
ALTER TABLE public.fiscal_config 
ADD COLUMN IF NOT EXISTS resp_tecnico_cnpj text,
ADD COLUMN IF NOT EXISTS resp_tecnico_contato text,
ADD COLUMN IF NOT EXISTS resp_tecnico_email text,
ADD COLUMN IF NOT EXISTS resp_tecnico_telefone text,
ADD COLUMN IF NOT EXISTS resp_tecnico_id_csrt text,
ADD COLUMN IF NOT EXISTS resp_tecnico_hash_csrt text;

COMMENT ON COLUMN public.fiscal_config.resp_tecnico_cnpj IS 'CNPJ da empresa desenvolvedora do sistema (Responsável Técnico)';
COMMENT ON COLUMN public.fiscal_config.resp_tecnico_contato IS 'Nome do contato na empresa desenvolvedora';
