-- Migration 101: Add is_deceased column to pets table
ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN DEFAULT false;
