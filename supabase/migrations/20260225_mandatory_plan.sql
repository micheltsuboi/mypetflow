-- Migration: Mandatory Plan
-- Description: Enforce that all organizations must be linked to a SaaS plan.

-- 1. Ensure any orphan organization gets the default PRO plan (failsafe)
DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id FROM public.saas_plans WHERE name = 'Plano PRO Completo' LIMIT 1;
  
  IF v_plan_id IS NOT NULL THEN
    UPDATE public.organizations 
    SET plan_id = v_plan_id 
    WHERE plan_id IS NULL;
  END IF;
END $$;

-- 2. Make plan_id mandatory
ALTER TABLE public.organizations ALTER COLUMN plan_id SET NOT NULL;
