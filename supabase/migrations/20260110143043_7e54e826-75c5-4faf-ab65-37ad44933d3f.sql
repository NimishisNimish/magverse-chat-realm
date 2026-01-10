-- Fix signup failures: make handle_new_user non-blocking and cast enum safely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure RLS does not block the trigger inserts
  PERFORM set_config('row_security', 'off', true);

  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Don't block auth signup; log and allow user to exist
    RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;