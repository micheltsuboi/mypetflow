-- 057_add_vet_alerts.sql
-- Create vet_alerts table to allow operational staff to notify veterinarians

CREATE TABLE vet_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE, -- Optional, links where the alert came from
    observation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'scheduled')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vet_alerts ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_vet_alerts_org_id ON vet_alerts(org_id);
CREATE INDEX idx_vet_alerts_status ON vet_alerts(status);
CREATE INDEX idx_vet_alerts_pet_id ON vet_alerts(pet_id);

-- Policies

-- 1. Anyone in the organization can create an alert
CREATE POLICY "Users can create vet alerts for their organization"
ON vet_alerts
FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    )
);

-- 2. Anyone in the organization can view alerts
CREATE POLICY "Users can view vet alerts for their organization"
ON vet_alerts
FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    )
);

-- 3. Only veterinarians and admins can update alerts
CREATE POLICY "Veterinarians and Admin can update alerts"
ON vet_alerts
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND org_id = vet_alerts.org_id
        AND (role IN ('superadmin', 'admin', 'owner') OR EXISTS (SELECT 1 FROM veterinarians v WHERE v.user_id = auth.uid()))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND org_id = vet_alerts.org_id
        AND (role IN ('superadmin', 'admin', 'owner') OR EXISTS (SELECT 1 FROM veterinarians v WHERE v.user_id = auth.uid()))
    )
);

-- Insert Trigger for Updated At
CREATE TRIGGER handle_updated_at_vet_alerts
    BEFORE UPDATE ON vet_alerts
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
