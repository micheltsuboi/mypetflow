-- SCRIPT DE LIMPEZA E AJUSTE DE MENSALIDADES EXISTENTES
-- Este script corrige as datas de faturamentos das assinaturas atuais para 10/05
-- e remove os créditos que causam duplicidade na aba de pacotes.

BEGIN;

-- 1. Ajustar a data de vencimento para 10/05 para todas as assinaturas ativas
-- (Considerando o pedido do usuário para que o próximo vencimento seja dia 10)
UPDATE public.customer_packages
SET 
  due_date = '2026-05-10',
  next_renewal_date = '2026-05-01',
  notes = notes || ' (Data ajustada via script de correção)'
WHERE is_subscription = true 
  AND is_active = true;

-- 2. Remover os créditos de pacote vinculados a mensalidades
-- Estes créditos não são necessários para mensalidades e causam duplicidade na UI
DELETE FROM public.package_credits
WHERE customer_package_id IN (
  SELECT id FROM public.customer_packages WHERE is_subscription = true
);

COMMIT;

-- Verificação:
-- SELECT id, due_date, is_subscription FROM public.customer_packages WHERE is_subscription = true;
-- SELECT * FROM public.package_credits WHERE customer_package_id IN (SELECT id FROM public.customer_packages WHERE is_subscription = true);
