-- Add theme preferences and animation settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_preferences jsonb DEFAULT jsonb_build_object(
  'primary', 'hsl(262, 83%, 58%)',
  'secondary', 'hsl(217, 91%, 60%)',
  'accent', 'hsl(172, 66%, 50%)',
  'background', 'hsl(240, 10%, 3.9%)',
  'foreground', 'hsl(0, 0%, 98%)'
),
ADD COLUMN IF NOT EXISTS animation_preferences jsonb DEFAULT jsonb_build_object(
  'reducedMotion', false,
  'particleEffects', true,
  'pageTransitions', true
);