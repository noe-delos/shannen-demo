-- Create the storage bucket for agent images
INSERT INTO storage.buckets (id, name, public)
VALUES ('agents', 'agents', true);

-- Set up RLS policies for the storage bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload agent images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'agents' AND 
  auth.role() = 'authenticated'
);

-- Allow everyone to view agent images (since bucket is public)
CREATE POLICY "Allow everyone to view agent images" ON storage.objects
FOR SELECT USING (bucket_id = 'agents');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Allow authenticated users to update agent images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'agents' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete agent images
CREATE POLICY "Allow authenticated users to delete agent images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'agents' AND 
  auth.role() = 'authenticated'
); 