-- Create storage bucket for patch images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patch-images', 'patch-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Patch images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patch-images');

-- Create policy for authenticated users to upload (admin only will be enforced in app)
CREATE POLICY "Authenticated users can upload patch images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'patch-images' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update their uploads
CREATE POLICY "Authenticated users can update patch images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'patch-images' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to delete patch images
CREATE POLICY "Authenticated users can delete patch images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'patch-images' AND auth.role() = 'authenticated');