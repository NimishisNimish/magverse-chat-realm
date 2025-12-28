-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all reactions" ON public.message_reactions;

-- Create a new restrictive policy: users can only view reactions on their own messages
-- Since message_id is a text field referencing chat_messages, we check ownership via chat_messages
CREATE POLICY "Users can view reactions on their messages" 
ON public.message_reactions 
FOR SELECT 
USING (
  -- User can see their own reactions
  auth.uid() = user_id
  OR
  -- User can see reactions on messages they own (from chat_messages table)
  EXISTS (
    SELECT 1 FROM public.chat_messages cm
    WHERE cm.id::text = message_reactions.message_id
    AND cm.user_id = auth.uid()
  )
);