-- Add logo_url to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Instructions: Refresh Supabase PostgREST cache if needed.
