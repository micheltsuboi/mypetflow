-- Add logo_url to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for LOGOS bucket
-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'logos' 
);

-- Allow public read access to logos
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Allow users to delete logos
CREATE POLICY "Users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

-- Instructions: Refresh Supabase PostgREST cache if needed.
