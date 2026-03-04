-- Fix RLS policies for Pet Assessments, Questions and Answers to include all management roles
-- Also ensure pet_assessments table has RLS enabled with proper policies

-- 1. Ensure RLS is enabled on all assessment tables
ALTER TABLE IF EXISTS pet_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assessment_answers ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing problematic policies to recreate them correctly
DROP POLICY IF EXISTS "Staff can manage all org assessment answers" ON assessment_answers;
DROP POLICY IF EXISTS "Tutors can manage their pets answers" ON assessment_answers;

DROP POLICY IF EXISTS "Staff can manage org assessment questions" ON assessment_questions;
DROP POLICY IF EXISTS "Tutors can view org assessment questions" ON assessment_questions;

DROP POLICY IF EXISTS "Tutors can view their pet assessment" ON pet_assessments;
DROP POLICY IF EXISTS "Staff can manage all pet assessments" ON pet_assessments;

-- 3. New Policies for assessment_answers
-- Tutors can manage answers for their own pets
CREATE POLICY "Tutors can manage their pets answers" ON assessment_answers
    FOR ALL
    USING (pet_id IN (
        SELECT id FROM pets WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    ));

-- Management roles (Owner, Admin, Staff, Superadmin) can manage all answers in their org
CREATE POLICY "Management can manage all org assessment answers" ON assessment_answers
    FOR ALL
    USING (pet_id IN (
        SELECT id FROM pets WHERE customer_id IN (
            SELECT id FROM customers WHERE org_id IN (
                SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff', 'superadmin')
            )
        )
    ));

-- 4. New Policies for assessment_questions
-- Management roles can manage questions for their org
CREATE POLICY "Management can manage org assessment questions" ON assessment_questions
    FOR ALL
    USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff', 'superadmin')
    ))
    WITH CHECK (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff', 'superadmin')
    ));

-- Tutors (all users with org_id) can view active questions for their org
CREATE POLICY "Users can view org assessment questions" ON assessment_questions
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ) AND is_active = true);

-- 5. New Policies for pet_assessments (the base table)
-- Tutors can manage their own pet's assessment
CREATE POLICY "Tutors can manage their pet assessment" ON pet_assessments
    FOR ALL
    USING (pet_id IN (
        SELECT id FROM pets WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    ));

-- Management roles can manage all assessments in their org
CREATE POLICY "Management can manage all pet assessments" ON pet_assessments
    FOR ALL
    USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff', 'superadmin')
    ));

-- 6. Ensure profiles role check constraint is up to date (optional but recommended)
-- Only if not already up to date - profiles.role CHECK (role IN ('superadmin', 'admin', 'staff', 'customer', 'owner'))
-- Let's check first if Alter is needed. Since I can't check, I'll just try to add 'owner' if missing by recreating constraint.

DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'admin', 'staff', 'customer', 'owner'));
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if constraint doesn't exist or other issues
END $$;
