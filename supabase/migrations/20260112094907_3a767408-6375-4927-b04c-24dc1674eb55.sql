-- Create a public-facing view that excludes sensitive admin identity
CREATE OR REPLACE VIEW public.feature_updates_public AS
SELECT 
  id,
  title,
  content,
  summary,
  category,
  version,
  image_url,
  is_published,
  published_at,
  created_at,
  updated_at
  -- Intentionally excluding: created_by, notify_subscribers
FROM public.feature_updates
WHERE is_published = true;

-- Grant access to the view for all users
GRANT SELECT ON public.feature_updates_public TO anon, authenticated;

-- Drop existing public read policy on base table
DROP POLICY IF EXISTS "Anyone can view published feature updates" ON public.feature_updates;
DROP POLICY IF EXISTS "Public can view published updates" ON public.feature_updates;

-- Create restrictive policy: only admins can read the full table with created_by
CREATE POLICY "Only admins can view full feature updates"
ON public.feature_updates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure admins can still manage feature updates
DROP POLICY IF EXISTS "Admins can manage feature updates" ON public.feature_updates;

CREATE POLICY "Admins can insert feature updates"
ON public.feature_updates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feature updates"
ON public.feature_updates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feature updates"
ON public.feature_updates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add comment explaining the security design
COMMENT ON VIEW public.feature_updates_public IS 'Public view of feature updates that excludes admin identity (created_by) for security';