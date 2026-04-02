-- =====================================================
-- MIGRATION: 089_vaccination_finance.sql
-- Melhora gestão de vacinas com integração financeira
-- =====================================================

-- Adicionar campos à pet_vaccines para rastreabilidade
ALTER TABLE public.pet_vaccines 
ADD COLUMN IF NOT EXISTS vaccine_batch_id UUID REFERENCES public.vaccine_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS financial_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS applied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Adicionar org_id para facilitar RLS na pet_vaccines (opcional mas recomendado)
ALTER TABLE public.pet_vaccines 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Atualizar org_id das vacinas existentes (baseado nos pets)
UPDATE public.pet_vaccines pv
SET org_id = p.org_id
FROM public.pets p
WHERE pv.pet_id = p.id AND pv.org_id IS NULL;

-- Garantir que vaccine_batches tenha campos para financeiro se não existirem
-- (Já existem no 002, mas vamos garantir e adicionar total)
ALTER TABLE public.vaccine_batches
ADD COLUMN IF NOT EXISTS cost_total DECIMAL(10,2) DEFAULT 0;

-- Trigger para baixar estoque automaticamente ao aplicar vacina
CREATE OR REPLACE FUNCTION public.fn_decrement_vaccine_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vaccine_batch_id IS NOT NULL THEN
    UPDATE public.vaccine_batches
    SET quantity = quantity - 1
    WHERE id = NEW.vaccine_batch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_decrement_vaccine_stock ON public.pet_vaccines;
CREATE TRIGGER tr_decrement_vaccine_stock
AFTER INSERT ON public.pet_vaccines
FOR EACH ROW EXECUTE FUNCTION public.fn_decrement_vaccine_stock();
