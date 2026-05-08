-- Migration: Adiciona campos de controle de numeração e série para Notas Fiscais
-- Permite que o usuário sincronize a numeração do sistema com a SEFAZ em caso de saltos ou inutilizações.

ALTER TABLE public.fiscal_config
    ADD COLUMN IF NOT EXISTS proximo_numero_nfe integer,
    ADD COLUMN IF NOT EXISTS serie_nfe text,
    ADD COLUMN IF NOT EXISTS proximo_numero_nfce integer,
    ADD COLUMN IF NOT EXISTS serie_nfce text;

COMMENT ON COLUMN public.fiscal_config.proximo_numero_nfe IS 'Número da próxima NF-e (Modelo 55) a ser emitida. Deixe vazio para sequencial automático da Focus NFe.';
COMMENT ON COLUMN public.fiscal_config.proximo_numero_nfce IS 'Número da próxima NFC-e (Modelo 65) a ser emitida. Deixe vazio para sequencial automático da Focus NFe.';
