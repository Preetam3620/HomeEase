-- Allow all providers to view jobs in DISPATCHING status
CREATE POLICY "Providers can view all dispatching jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  status = 'DISPATCHING' 
  AND EXISTS (
    SELECT 1 FROM provider_profiles 
    WHERE provider_profiles.user_id = auth.uid()
  )
);