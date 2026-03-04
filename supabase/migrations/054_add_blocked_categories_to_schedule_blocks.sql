-- Migration: Add blocked_categories to schedule_blocks
-- Enables blocking specific service categories during a time slot

ALTER TABLE public.schedule_blocks
ADD COLUMN IF NOT EXISTS blocked_categories UUID[] DEFAULT NULL;

-- Comment: If blocked_categories is NULL/Empty AND allowed_species is NULL/Empty, it blocks EVERYTHING.
-- If blocked_categories has values, it blocks ONLY those categories.
