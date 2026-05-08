-- Migration: Adiciona suporte a NFC-e (Cupom Fiscal Eletrônico) no sistema fiscal
-- Resolve dois problemas:
-- 1. Constraint CHECK da coluna 'tipo' na tabela notas_fiscais não incluía 'nfce'
-- 2. Constraint de origem_tipo não incluía 'pacote' (já adicionado anteriormente, mas garantindo)

-- 1. Dropar constraint antiga e recriar com 'nfce' incluído
ALTER TABLE public.notas_fiscais
    DROP CONSTRAINT IF EXISTS notas_fiscais_tipo_check;

ALTER TABLE public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_tipo_check
    CHECK (tipo IN ('nfse', 'nfe', 'nfce'));
