-- Fix the security definer view warning by setting SECURITY INVOKER
-- This ensures the view respects the querying user's permissions, not the creator's
ALTER VIEW public.feature_updates_public SET (security_invoker = on);