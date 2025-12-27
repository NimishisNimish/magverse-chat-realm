-- Create table for caching extracted PDF text
CREATE TABLE public.pdf_text_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_hash TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  extracted_text TEXT NOT NULL,
  word_count INTEGER,
  char_count INTEGER,
  extraction_method TEXT DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for fast lookup by file hash
CREATE INDEX idx_pdf_text_cache_file_hash ON public.pdf_text_cache(file_hash);
CREATE INDEX idx_pdf_text_cache_user_id ON public.pdf_text_cache(user_id);

-- Enable RLS
ALTER TABLE public.pdf_text_cache ENABLE ROW LEVEL SECURITY;

-- Users can view their own cached PDFs
CREATE POLICY "Users can view their own PDF cache"
  ON public.pdf_text_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own PDF cache
CREATE POLICY "Users can insert their own PDF cache"
  ON public.pdf_text_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own PDF cache
CREATE POLICY "Users can delete their own PDF cache"
  ON public.pdf_text_cache
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_pdf_cache()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pdf_text_cache
  WHERE expires_at < NOW();
END;
$$;