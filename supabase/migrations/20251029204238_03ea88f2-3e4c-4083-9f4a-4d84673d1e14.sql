-- Make chat-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- Add RLS policy: Users can upload files to their own folder only
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add RLS policy: Users can view their own files only
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add RLS policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);