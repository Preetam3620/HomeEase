-- Create storage bucket for job images
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for job images storage
CREATE POLICY "Users can upload their own job images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Job images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-images');

CREATE POLICY "Users can update their own job images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own job images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add image_url column to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS image_url TEXT;