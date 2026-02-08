-- Appointments Category Enhancement Migration
-- Adds service category awareness and date range support for Hospedagem

-- Add category reference to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id);

-- Add date range fields for Hospedagem (boarding)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS check_out_date DATE;

-- Create index for category-based queries
CREATE INDEX IF NOT EXISTS idx_appointments_category ON appointments(service_category_id);

-- Update existing appointments to infer category from their service
UPDATE appointments a
SET service_category_id = s.category_id
FROM services s
WHERE a.service_id = s.id
  AND a.service_category_id IS NULL;

-- For single-day appointments (Banho e Tosa, Creche), set both dates to scheduled_at date
UPDATE appointments
SET check_in_date = DATE(scheduled_at),
    check_out_date = DATE(scheduled_at)
WHERE check_in_date IS NULL;
