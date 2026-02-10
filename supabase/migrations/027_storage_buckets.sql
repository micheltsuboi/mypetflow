-- Create storage buckets for products, avatars, and pets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('products', 'products', true),
  ('avatars', 'avatars', true),
  ('pets', 'pets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for PRODUCTS bucket
-- Allow authenticated users to upload product images
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'products' 
    AND (
        (storage.foldername(name))[1] IS NULL 
        OR (storage.foldername(name))[1] != 'private'
    )
);

-- Allow public read access to product images
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Allow authenticated users to delete their uploaded product images
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
CREATE POLICY "Users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');


-- Policies for AVATARS bucket
-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
);

-- Allow public read access to avatars (so anyone can see user profiles if needed, or change to auth only)
-- Let's make it public for simplicity in UI, but maybe restrict to auth?
-- Profiles are usually public or internal to org. Public is safer for simple implementation.
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to update/delete their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');


-- Policies for PETS bucket
-- Allow authenticated users to upload pet photos
DROP POLICY IF EXISTS "Authenticated users can upload pet photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload pet photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'pets' 
);

-- Allow public read access to pet photos
DROP POLICY IF EXISTS "Public can view pet photos" ON storage.objects;
CREATE POLICY "Public can view pet photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pets');

-- Allow users to delete pet photos
DROP POLICY IF EXISTS "Users can delete pet photos" ON storage.objects;
CREATE POLICY "Users can delete pet photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pets');
