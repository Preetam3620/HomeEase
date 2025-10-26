-- Fix infinite recursion in RLS policies by using security definer functions

-- Create helper function to check if user owns a job (breaks circular reference)
CREATE OR REPLACE FUNCTION public.user_owns_job(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs
    WHERE id = _job_id AND user_id = _user_id
  );
$$;

-- Create helper function to check if provider has job in dispatch queue
CREATE OR REPLACE FUNCTION public.provider_has_dispatch(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dispatch_attempts da
    JOIN public.provider_profiles pp ON da.provider_id = pp.id
    WHERE da.job_id = _job_id AND pp.user_id = _user_id
  );
$$;

-- Create helper function to check if provider is assigned to job
CREATE OR REPLACE FUNCTION public.provider_assigned_to_job(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.provider_profiles pp ON j.provider_id = pp.id
    WHERE j.id = _job_id AND pp.user_id = _user_id
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Providers can view jobs in their dispatch queue" ON public.jobs;
DROP POLICY IF EXISTS "Users can view dispatch attempts for their jobs" ON public.dispatch_attempts;

-- Recreate policies using security definer functions
CREATE POLICY "Providers can view jobs in their dispatch queue" 
ON public.jobs 
FOR SELECT 
USING (public.provider_has_dispatch(id, auth.uid()));

CREATE POLICY "Users can view dispatch attempts for their jobs" 
ON public.dispatch_attempts 
FOR SELECT 
USING (public.user_owns_job(job_id, auth.uid()));