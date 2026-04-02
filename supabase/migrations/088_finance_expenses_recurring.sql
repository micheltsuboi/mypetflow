-- =====================================================
-- MIGRATION: 088_finance_expenses_recurring.sql
-- Gestão de Despesas Fixas, Variáveis e Categorias
-- =====================================================

-- 1. TABELA: expense_categories (Categorias de Despesas)
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON public.expense_categories(org_id);

-- 2. TABELA: recurring_expenses (Contas Fixas)
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  category_name TEXT, -- Denormalizado para fallback
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_org ON public.recurring_expenses(org_id);

-- 3. TABELA: recurring_expense_exceptions (Cancelamentos pontuais)
CREATE TABLE IF NOT EXISTS public.recurring_expense_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Formato "MM-YYYY"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recurring_expense_id, month_year)
);

-- RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_exceptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view org expense categories" ON public.expense_categories
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage expense categories" ON public.expense_categories
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

CREATE POLICY "Users can view org recurring expenses" ON public.recurring_expenses
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage recurring expenses" ON public.recurring_expenses
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')));

CREATE POLICY "Users can manage recurring exceptions" ON public.recurring_expense_exceptions
  FOR ALL USING (recurring_expense_id IN (SELECT id FROM public.recurring_expenses WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())));

-- Triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
