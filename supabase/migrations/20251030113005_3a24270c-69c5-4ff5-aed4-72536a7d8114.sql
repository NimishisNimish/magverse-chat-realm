-- Add RLS policy to password_reset_attempts table
-- This table is only accessed via edge functions with service role
-- Users should not have direct access to view reset attempts
CREATE POLICY "No direct user access to reset attempts"
ON password_reset_attempts
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);