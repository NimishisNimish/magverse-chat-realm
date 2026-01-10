-- Fix auth signup "Database error saving new user" by making handle_new_user robust under RLS

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure RLS does not block the trigger inserts even if table owners/roles change
  PERFORM set_config('row_security', 'off', true);

  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Make debugging easier from Postgres logs
    RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;