-- Fix signup failure: update handle_new_user() to match current profiles schema (no email column)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a minimal profile row for the new auth user
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, now())
  ON CONFLICT (id) DO NOTHING;

  -- Ensure default role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;