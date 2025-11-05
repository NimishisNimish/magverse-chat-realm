-- Grant admin access to specified email addresses
DO $$
DECLARE
  user_id_1 uuid;
  user_id_2 uuid;
BEGIN
  -- Get user IDs for the email addresses
  SELECT id INTO user_id_1 FROM auth.users WHERE email = 'magverse4@gmail.com';
  SELECT id INTO user_id_2 FROM auth.users WHERE email = 'nimishkalsi969@gmail.com';
  
  -- Insert admin role for first user if exists
  IF user_id_1 IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_id_1, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Insert admin role for second user if exists
  IF user_id_2 IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_id_2, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;