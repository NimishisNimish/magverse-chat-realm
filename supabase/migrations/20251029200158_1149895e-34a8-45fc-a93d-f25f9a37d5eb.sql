-- Remove email column from profiles table to eliminate exposure risk
-- Email is already stored securely in auth.users table
ALTER TABLE public.profiles DROP COLUMN email;

-- Update the handle_new_user trigger function to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW());
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;