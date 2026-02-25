-- Migration: fix target_id type in cashback_rules
-- Allow TEXT instead of UUID to support category names
-- Generated on 2026-02-25

ALTER TABLE cashback_rules ALTER COLUMN target_id TYPE TEXT;
