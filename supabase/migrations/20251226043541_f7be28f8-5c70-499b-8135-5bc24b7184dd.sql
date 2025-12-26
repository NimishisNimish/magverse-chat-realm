-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all annotations" ON public.message_annotations;

-- Create a new policy that restricts users to only viewing their own annotations
CREATE POLICY "Users can view their own annotations" 
ON public.message_annotations 
FOR SELECT 
USING (auth.uid() = user_id);