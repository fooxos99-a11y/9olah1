-- Ensures the local app database has the expected categories state:
-- 1) create "التاريخ" if it is missing
-- 2) delete "سور القرآن" and its questions
-- 3) show a verification summary

INSERT INTO categories (name)
SELECT 'التاريخ'
WHERE NOT EXISTS (
  SELECT 1
  FROM categories
  WHERE name = 'التاريخ'
);

DELETE FROM category_questions
WHERE category_id IN (
  SELECT id
  FROM categories
  WHERE name = 'سور القرآن'
);

DELETE FROM categories
WHERE name = 'سور القرآن';

SELECT
  c.name,
  COUNT(cq.id) AS question_count
FROM categories c
LEFT JOIN category_questions cq ON cq.category_id = c.id
WHERE c.name IN ('التاريخ', 'سور القرآن', 'القرآن الكريم', 'إسلامي', 'أسئلة عامة')
GROUP BY c.name
ORDER BY c.name;