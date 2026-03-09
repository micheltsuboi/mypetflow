-- Optimization for Hospital Module Performance
-- Adding composite indexes to speed up the dashboard batch queries

CREATE INDEX IF NOT EXISTS idx_hospital_admissions_org_status ON public.hospital_admissions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_hospital_medications_org_active ON public.hospital_medications(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_hospital_beds_org_order ON public.hospital_beds(org_id, "order");
CREATE INDEX IF NOT EXISTS idx_hospital_wards_org_order ON public.hospital_wards(org_id, "order");

-- Optimization for next_dose_at lookups
CREATE INDEX IF NOT EXISTS idx_hospital_medications_next_dose ON public.hospital_medications(next_dose_at) WHERE is_active = true;
