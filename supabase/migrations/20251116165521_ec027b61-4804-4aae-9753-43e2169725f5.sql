-- Drop user_activity_log table as feature is being removed
DROP TABLE IF EXISTS user_activity_log CASCADE;

-- Add email digest preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_digest_sent TIMESTAMP WITH TIME ZONE DEFAULT NULL;