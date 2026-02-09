-- Add status field to pet_assessments table
-- This field is required by the appointment validation logic

ALTER TABLE pet_assessments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';

-- Update any existing records to have approved status
UPDATE pet_assessments
SET status = 'approved'
WHERE status IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN pet_assessments.status IS 'Assessment status: pending, approved, rejected';
