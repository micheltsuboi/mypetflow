-- Fix RLS policy for assessment_questions insertion
DROP POLICY IF EXISTS "Staff can manage org assessment questions" ON assessment_questions;

CREATE POLICY "Staff can manage org assessment questions" ON assessment_questions
    USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff')
    ))
    WITH CHECK (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff')
    ));
