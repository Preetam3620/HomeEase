-- Add parent_id to categories for grouping
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id);

-- Delete existing categories to start fresh
DELETE FROM public.categories;

-- Create main parent categories
INSERT INTO public.categories (id, slug, name, description, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'housing', 'Housing Services', 'Home repair and maintenance services', NULL),
  ('00000000-0000-0000-0000-000000000002', 'pet', 'Pet Services', 'Pet care and wellness services', NULL),
  ('00000000-0000-0000-0000-000000000003', 'health', 'Health Services', 'Personal health and wellness services', NULL);

-- Housing subcategories
INSERT INTO public.categories (slug, name, description, icon, parent_id) VALUES
  ('electrical', 'Electrical', 'Electrical repairs and installations', '⚡', '00000000-0000-0000-0000-000000000001'),
  ('plumbing', 'Plumbing', 'Plumbing repairs and installations', '🔧', '00000000-0000-0000-0000-000000000001'),
  ('ac-repair', 'AC Repair', 'Air conditioning maintenance and repair', '❄️', '00000000-0000-0000-0000-000000000001'),
  ('carpentry', 'Carpentry', 'Woodwork and furniture repair', '🪚', '00000000-0000-0000-0000-000000000001'),
  ('painting', 'Painting', 'Interior and exterior painting', '🎨', '00000000-0000-0000-0000-000000000001'),
  ('cleaning', 'House Cleaning', 'Home cleaning services', '🧹', '00000000-0000-0000-0000-000000000001');

-- Pet subcategories
INSERT INTO public.categories (slug, name, description, icon, parent_id) VALUES
  ('pet-walking', 'Pet Walking', 'Dog walking and exercise', '🐕', '00000000-0000-0000-0000-000000000002'),
  ('pet-grooming', 'Pet Grooming', 'Pet bathing and grooming', '✂️', '00000000-0000-0000-0000-000000000002'),
  ('pet-training', 'Pet Training', 'Behavior training for pets', '🎓', '00000000-0000-0000-0000-000000000002'),
  ('pet-sitting', 'Pet Sitting', 'In-home pet care', '🏠', '00000000-0000-0000-0000-000000000002'),
  ('veterinary', 'Veterinary Care', 'Pet health checkups and treatment', '🏥', '00000000-0000-0000-0000-000000000002');

-- Health subcategories
INSERT INTO public.categories (slug, name, description, icon, parent_id) VALUES
  ('nursing', 'Nursing Care', 'At-home nursing services', '💉', '00000000-0000-0000-0000-000000000003'),
  ('physiotherapy', 'Physiotherapy', 'Physical therapy and rehabilitation', '🏃', '00000000-0000-0000-0000-000000000003'),
  ('counseling', 'Mental Health Counseling', 'Mental health support', '🧠', '00000000-0000-0000-0000-000000000003'),
  ('nutrition', 'Nutrition Consulting', 'Diet and nutrition planning', '🥗', '00000000-0000-0000-0000-000000000003'),
  ('massage', 'Massage Therapy', 'Therapeutic massage services', '💆', '00000000-0000-0000-0000-000000000003');