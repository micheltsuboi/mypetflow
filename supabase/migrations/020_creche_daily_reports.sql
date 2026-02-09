-- Migration: Add daily reports and actual check-in/out tracking
-- Enables tracking actual arrival/departure times and daily activity reports with photos

-- Add actual check-in/out times to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS actual_check_in TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_check_out TIMESTAMPTZ;

-- Daily reports table for tracking pet activities during Creche/Banho e Tosa
CREATE TABLE IF NOT EXISTS appointment_daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),
    report_text TEXT,
    photos TEXT[], -- Array of Supabase Storage URLs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(appointment_id) -- One report per appointment
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_reports_appointment ON appointment_daily_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_org ON appointment_daily_reports(org_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_reports_update_timestamp
    BEFORE UPDATE ON appointment_daily_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_report_updated_at();

-- Comments for documentation
COMMENT ON TABLE appointment_daily_reports IS 'Stores daily activity reports and photos for Creche and Banho e Tosa appointments';
COMMENT ON COLUMN appointments.actual_check_in IS 'Actual time pet arrived (vs scheduled_at)';
COMMENT ON COLUMN appointments.actual_check_out IS 'Actual time pet departed';
