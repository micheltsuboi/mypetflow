-- Pet Behavioral & Health Assessment Migration
-- Creates table for storing comprehensive pet assessment data required for Creche and Hospedagem services

CREATE TABLE IF NOT EXISTS pet_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Socialização
    sociable_with_humans BOOLEAN,
    sociable_with_dogs BOOLEAN,
    socialized_early BOOLEAN,
    desensitized BOOLEAN,
    is_reactive BOOLEAN,
    reactive_description TEXT,
    shows_escape_signs BOOLEAN,
    has_bitten_person BOOLEAN,
    has_been_bitten BOOLEAN,
    
    -- Rotina e comportamento
    has_routine BOOLEAN,
    regular_walks BOOLEAN,
    stays_alone_ok BOOLEAN,
    daily_routine_description TEXT,
    separation_anxiety BOOLEAN,
    has_phobias BOOLEAN,
    phobia_description TEXT,
    possessive_behavior BOOLEAN,
    humanization_traits BOOLEAN,
    obeys_basic_commands BOOLEAN,
    professionally_trained BOOLEAN,
    
    -- Saúde
    is_brachycephalic BOOLEAN,
    age_health_restrictions BOOLEAN,
    has_health_issues BOOLEAN,
    health_issues_description TEXT,
    food_restrictions BOOLEAN,
    food_restrictions_description TEXT,
    has_dermatitis BOOLEAN,
    activity_restrictions BOOLEAN,
    patellar_orthopedic_issues BOOLEAN,
    other_health_notes TEXT,
    
    -- Cuidados específicos
    water_reaction VARCHAR(100), -- "calmo", "nervoso", "adora", etc
    pool_authorized BOOLEAN,
    food_brand VARCHAR(200),
    
    -- Declaração
    owner_declaration_accepted BOOLEAN NOT NULL DEFAULT false,
    declaration_accepted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(pet_id) -- Um assessment por pet
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pet_assessments_pet ON pet_assessments(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_assessments_org ON pet_assessments(org_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pet_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pet_assessments_update_timestamp
    BEFORE UPDATE ON pet_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_pet_assessment_updated_at();
