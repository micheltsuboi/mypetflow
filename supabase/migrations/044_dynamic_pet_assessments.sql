-- Dynamic Pet Assessment Migration

-- 1. Create Assessment Questions Table
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- e.g., 'social', 'routine', 'health', 'care'
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('boolean', 'text', 'select')),
    options JSONB, -- Array of strings for 'select' type (e.g., ["Calmo", "Nervoso"])
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    system_key VARCHAR(100), -- To link back to old hardcoded fields, useful for data migration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_org ON assessment_questions(org_id);

-- 2. Create Assessment Answers Table
CREATE TABLE IF NOT EXISTS assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    answer_boolean BOOLEAN,
    answer_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pet_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_pet ON assessment_answers(pet_id);

-- 3. Update functionality
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessment_questions_update_timestamp
    BEFORE UPDATE ON assessment_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER assessment_answers_update_timestamp
    BEFORE UPDATE ON assessment_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- 4. Enable RLS
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;

-- 5. Policies for assessment_questions
-- Staff/Owner can manage questions for their org
CREATE POLICY "Staff can manage org assessment questions" ON assessment_questions
    USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff')
    ));

-- Tutors can view active questions for their org
CREATE POLICY "Tutors can view org assessment questions" ON assessment_questions
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ) AND is_active = true);

-- 6. Policies for assessment_answers
-- Tutors can manage answers for their own pets
CREATE POLICY "Tutors can manage their pets answers" ON assessment_answers
    USING (pet_id IN (
        SELECT id FROM pets WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    ));

-- Staff/Owner can manage all answers in their org
CREATE POLICY "Staff can manage all org assessment answers" ON assessment_answers
    USING (pet_id IN (
        SELECT id FROM pets WHERE customer_id IN (
            SELECT id FROM customers WHERE org_id IN (
                SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff')
            )
        )
    ));

-- 7. Data Migration: Pre-populate questions for all existing organizations
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM organizations LOOP
        -- Socialização
        INSERT INTO assessment_questions (org_id, category, question_text, question_type, system_key, order_index) VALUES
        (org.id, 'social', 'É sociável com humanos?', 'boolean', 'sociable_with_humans', 10),
        (org.id, 'social', 'É sociável com outros cães?', 'boolean', 'sociable_with_dogs', 20),
        (org.id, 'social', 'Foi socializado na infância (primeiros meses)?', 'boolean', 'socialized_early', 30),
        (org.id, 'social', 'Foi dessensibilizado (acostumado a sons, pessoas, objetos)?', 'boolean', 'desensitized', 40),
        (org.id, 'social', 'É reativo?', 'boolean', 'is_reactive', 50),
        (org.id, 'social', 'Se sim, descreva o comportamento reativo:', 'text', 'reactive_description', 60),
        (org.id, 'social', 'Apresenta sinais de fuga (tentar sair, cavar, pular portões)?', 'boolean', 'shows_escape_signs', 70),
        (org.id, 'social', 'Já mordeu alguma pessoa?', 'boolean', 'has_bitten_person', 80),
        (org.id, 'social', 'Já foi mordido ou atacado por outro cão?', 'boolean', 'has_been_bitten', 90);

        -- Rotina
        INSERT INTO assessment_questions (org_id, category, question_text, question_type, system_key, order_index) VALUES
        (org.id, 'routine', 'Possui rotina organizada?', 'boolean', 'has_routine', 10),
        (org.id, 'routine', 'Faz passeios regularmente?', 'boolean', 'regular_walks', 20),
        (org.id, 'routine', 'Fica em casa sozinho sem estresse?', 'boolean', 'stays_alone_ok', 30),
        (org.id, 'routine', 'Descreva a rotina diária do cão:', 'text', 'daily_routine_description', 40),
        (org.id, 'routine', 'Possui ansiedade de separação?', 'boolean', 'separation_anxiety', 50),
        (org.id, 'routine', 'Possui algum tipo de fobia (barulhos, chuva, pessoas)?', 'boolean', 'has_phobias', 60),
        (org.id, 'routine', 'Se sim, qual fobia?', 'text', 'phobia_description', 70),
        (org.id, 'routine', 'É possessivo com objetos, brinquedos ou pessoas?', 'boolean', 'possessive_behavior', 80),
        (org.id, 'routine', 'Possui traços de humanização? (tratado como bebê, dorme na cama)', 'boolean', 'humanization_traits', 90),
        (org.id, 'routine', 'Obedece a comandos básicos (senta, fica, vem)?', 'boolean', 'obeys_basic_commands', 100),
        (org.id, 'routine', 'Já foi adestrado por profissional?', 'boolean', 'professionally_trained', 110);

        -- Saúde
        INSERT INTO assessment_questions (org_id, category, question_text, question_type, system_key, order_index) VALUES
        (org.id, 'health', 'É braquicefálico? (focinho achatado)', 'boolean', 'is_brachycephalic', 10),
        (org.id, 'health', 'Tem restrições de convivência por idade ou saúde?', 'boolean', 'age_health_restrictions', 20),
        (org.id, 'health', 'Possui (ou já teve) algum problema de saúde?', 'boolean', 'has_health_issues', 30),
        (org.id, 'health', 'Se sim, qual problema de saúde?', 'text', 'health_issues_description', 40),
        (org.id, 'health', 'Possui restrição alimentar?', 'boolean', 'food_restrictions', 50),
        (org.id, 'health', 'Se sim, qual restrição?', 'text', 'food_restrictions_description', 60),
        (org.id, 'health', 'Possui dermatite ou alergias de pele?', 'boolean', 'has_dermatitis', 70),
        (org.id, 'health', 'Possui restrição de atividade física?', 'boolean', 'activity_restrictions', 80),
        (org.id, 'health', 'Possui problema patelar ou ortopédico?', 'boolean', 'patellar_orthopedic_issues', 90),
        (org.id, 'health', 'Outros problemas de saúde, medicações ou cirurgias:', 'text', 'other_health_notes', 100);

        -- Cuidados Específicos
        INSERT INTO assessment_questions (org_id, category, question_text, question_type, options, system_key, order_index) VALUES
        (org.id, 'care', 'Como o pet reage quando entra em contato com água?', 'select', '["calmo", "nervoso", "adora", "medo", "neutro"]'::jsonb, 'water_reaction', 10);
        
        INSERT INTO assessment_questions (org_id, category, question_text, question_type, system_key, order_index) VALUES
        (org.id, 'care', 'O pet tem autorização para uso da piscina?', 'boolean', 'pool_authorized', 20),
        (org.id, 'care', 'Qual ração ele come?', 'text', 'food_brand', 30);
    END LOOP;
END $$;

-- 8. Data Migration: Migrate existing assessment answers
DO $$
DECLARE
    assessment RECORD;
    q RECORD;
BEGIN
    FOR assessment IN SELECT * FROM pet_assessments LOOP
        -- For each assessment, loop through all questions in this org
        FOR q IN SELECT * FROM assessment_questions WHERE org_id = assessment.org_id LOOP
            IF q.system_key = 'sociable_with_humans' AND assessment.sociable_with_humans IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.sociable_with_humans);
            ELSIF q.system_key = 'sociable_with_dogs' AND assessment.sociable_with_dogs IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.sociable_with_dogs);
            ELSIF q.system_key = 'socialized_early' AND assessment.socialized_early IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.socialized_early);
            ELSIF q.system_key = 'desensitized' AND assessment.desensitized IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.desensitized);
            ELSIF q.system_key = 'is_reactive' AND assessment.is_reactive IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.is_reactive);
            ELSIF q.system_key = 'reactive_description' AND assessment.reactive_description IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.reactive_description);
            ELSIF q.system_key = 'shows_escape_signs' AND assessment.shows_escape_signs IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.shows_escape_signs);
            ELSIF q.system_key = 'has_bitten_person' AND assessment.has_bitten_person IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.has_bitten_person);
            ELSIF q.system_key = 'has_been_bitten' AND assessment.has_been_bitten IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.has_been_bitten);
                
            -- Routine
            ELSIF q.system_key = 'has_routine' AND assessment.has_routine IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.has_routine);
            ELSIF q.system_key = 'regular_walks' AND assessment.regular_walks IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.regular_walks);
            ELSIF q.system_key = 'stays_alone_ok' AND assessment.stays_alone_ok IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.stays_alone_ok);
            ELSIF q.system_key = 'daily_routine_description' AND assessment.daily_routine_description IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.daily_routine_description);
            ELSIF q.system_key = 'separation_anxiety' AND assessment.separation_anxiety IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.separation_anxiety);
            ELSIF q.system_key = 'has_phobias' AND assessment.has_phobias IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.has_phobias);
            ELSIF q.system_key = 'phobia_description' AND assessment.phobia_description IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.phobia_description);
            ELSIF q.system_key = 'possessive_behavior' AND assessment.possessive_behavior IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.possessive_behavior);
            ELSIF q.system_key = 'humanization_traits' AND assessment.humanization_traits IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.humanization_traits);
            ELSIF q.system_key = 'obeys_basic_commands' AND assessment.obeys_basic_commands IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.obeys_basic_commands);
            ELSIF q.system_key = 'professionally_trained' AND assessment.professionally_trained IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.professionally_trained);
                
            -- Health
            ELSIF q.system_key = 'is_brachycephalic' AND assessment.is_brachycephalic IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.is_brachycephalic);
            ELSIF q.system_key = 'age_health_restrictions' AND assessment.age_health_restrictions IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.age_health_restrictions);
            ELSIF q.system_key = 'has_health_issues' AND assessment.has_health_issues IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.has_health_issues);
            ELSIF q.system_key = 'health_issues_description' AND assessment.health_issues_description IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.health_issues_description);
            ELSIF q.system_key = 'food_restrictions' AND assessment.food_restrictions IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.food_restrictions);
            ELSIF q.system_key = 'food_restrictions_description' AND assessment.food_restrictions_description IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.food_restrictions_description);
            ELSIF q.system_key = 'has_dermatitis' AND assessment.has_dermatitis IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.has_dermatitis);
            ELSIF q.system_key = 'activity_restrictions' AND assessment.activity_restrictions IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.activity_restrictions);
            ELSIF q.system_key = 'patellar_orthopedic_issues' AND assessment.patellar_orthopedic_issues IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.patellar_orthopedic_issues);
            ELSIF q.system_key = 'other_health_notes' AND assessment.other_health_notes IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.other_health_notes);
                
            -- Care
            ELSIF q.system_key = 'water_reaction' AND assessment.water_reaction IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.water_reaction);
            ELSIF q.system_key = 'pool_authorized' AND assessment.pool_authorized IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_boolean) VALUES (assessment.pet_id, q.id, assessment.pool_authorized);
            ELSIF q.system_key = 'food_brand' AND assessment.food_brand IS NOT NULL THEN
                INSERT INTO assessment_answers (pet_id, question_id, answer_text) VALUES (assessment.pet_id, q.id, assessment.food_brand);
            END IF;
        END LOOP;
    END LOOP;
END $$;
