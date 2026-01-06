-- =====================================================
-- TASK 1: Fix phone_verification_codes security vulnerability
-- Remove insecure OR (auth.uid() IS NULL) condition
-- =====================================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can view own phone codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can update own phone codes" ON public.phone_verification_codes;

-- Create secure policies that don't allow null user_id access
CREATE POLICY "Users can view own phone codes secure"
ON public.phone_verification_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own phone codes secure"
ON public.phone_verification_codes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add rate limiting check and max attempts
ALTER TABLE public.phone_verification_codes 
  ALTER COLUMN attempts SET DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 5;

-- =====================================================
-- TASK 2: Create newsletter_subscribers table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscribed_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  source text DEFAULT 'footer',
  unsubscribed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can manage own subscription
CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Users can update own subscription
CREATE POLICY "Users can update own subscription"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can view all
CREATE POLICY "Admins can view all subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- =====================================================
-- TASK 3: Create feature_updates (patches) table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feature_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  image_url text,
  version text,
  category text DEFAULT 'feature',
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  notify_subscribers boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.feature_updates ENABLE ROW LEVEL SECURITY;

-- Public can view published updates
CREATE POLICY "Anyone can view published updates"
ON public.feature_updates
FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- Admins can manage all updates
CREATE POLICY "Admins can manage updates"
ON public.feature_updates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- =====================================================
-- TASK 4: Create student trial applications table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.student_trial_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_edu_email boolean DEFAULT false,
  status text DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  trial_start_date timestamptz,
  trial_end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_trial_applications ENABLE ROW LEVEL SECURITY;

-- Users can view own applications
CREATE POLICY "Users can view own applications"
ON public.student_trial_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create applications
CREATE POLICY "Users can create applications"
ON public.student_trial_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can manage all applications
CREATE POLICY "Admins can manage all applications"
ON public.student_trial_applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- =====================================================
-- TASK 5: Fix new user defaults - they should be FREE users
-- =====================================================

-- Update the profiles table default for is_pro to false (already is false)
-- Update subscription_type default to 'free' (already is 'free')
-- The defaults are correct, but let's verify and fix any existing issues

-- Add student subscription type to allowed values
COMMENT ON COLUMN public.profiles.subscription_type IS 'User subscription: free, student, monthly, yearly, lifetime';

-- =====================================================
-- TASK 6: Add sources field to chat_messages for citations
-- =====================================================

ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS sources jsonb DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_sources ON public.chat_messages USING gin(sources) WHERE sources IS NOT NULL;