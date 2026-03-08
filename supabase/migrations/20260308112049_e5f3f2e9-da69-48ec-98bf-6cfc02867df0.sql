-- Create storage bucket for group images
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-images', 'group-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to group images
CREATE POLICY "Public read access for group images"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-images');

-- Allow authenticated users to upload group images
CREATE POLICY "Authenticated users can upload group images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'group-images');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update group images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'group-images');

-- Allow authenticated users to delete group images
CREATE POLICY "Authenticated users can delete group images"
ON storage.objects FOR DELETE
USING (bucket_id = 'group-images');