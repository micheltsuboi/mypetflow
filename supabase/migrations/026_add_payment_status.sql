-- Add payment status, paid_at, and discount_percent to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'partial')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0;

-- Update existing appointments: set final_price = calculated_price where not already set
UPDATE public.appointments
SET final_price = calculated_price
WHERE final_price IS NULL AND calculated_price IS NOT NULL;

-- Index for dashboard queries (filtering by payment_status)
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(org_id, payment_status);
