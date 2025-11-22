-- Create optimized function to get chat history with message counts in a single query
CREATE OR REPLACE FUNCTION public.get_chat_history_with_counts(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  message_count bigint
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ch.id,
    ch.user_id,
    ch.title,
    ch.created_at,
    ch.updated_at,
    COALESCE(COUNT(cm.id), 0)::bigint as message_count
  FROM public.chat_history ch
  LEFT JOIN public.chat_messages cm ON cm.chat_id = ch.id
  WHERE ch.user_id = p_user_id
  GROUP BY ch.id, ch.user_id, ch.title, ch.created_at, ch.updated_at
  ORDER BY ch.updated_at DESC
  LIMIT 100;
END;
$$;