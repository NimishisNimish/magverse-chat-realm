-- Create helper function to get inactive users for re-engagement campaign
CREATE OR REPLACE FUNCTION public.get_inactive_users(days INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.created_at
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.chat_messages cm
    WHERE cm.user_id = p.id 
    AND cm.created_at >= NOW() - (days || ' days')::INTERVAL
  )
  AND p.created_at < NOW() - (days || ' days')::INTERVAL;
END;
$$;