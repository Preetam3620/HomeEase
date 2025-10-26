-- Remove health and pet related categories, keep only housing services
DELETE FROM categories WHERE parent_id IN (
  SELECT id FROM categories WHERE slug IN ('health', 'pet')
);

DELETE FROM categories WHERE slug IN ('health', 'pet');

-- Ensure we only have housing services remaining
-- The housing category and its subcategories will remain