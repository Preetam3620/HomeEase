-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role app_role;
  selected_categories TEXT[];
BEGIN
  -- Get role from user metadata
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'USER'::app_role);
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  -- If provider, create provider profile
  IF user_role = 'PROVIDER' THEN
    INSERT INTO public.provider_profiles (user_id, latitude, longitude, is_active)
    VALUES (NEW.id, 0, 0, true);
    
    -- Insert provider categories if provided
    selected_categories := ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'categories'));
    IF array_length(selected_categories, 1) > 0 THEN
      INSERT INTO public.provider_categories (provider_id, category_id)
      SELECT 
        (SELECT id FROM public.provider_profiles WHERE user_id = NEW.id),
        unnest(selected_categories)::uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();