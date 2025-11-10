-- Create function to update all user segments
CREATE OR REPLACE FUNCTION public.update_all_user_segments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users
  LOOP
    PERFORM public.update_user_segments(user_record.id);
  END LOOP;
END;
$$;