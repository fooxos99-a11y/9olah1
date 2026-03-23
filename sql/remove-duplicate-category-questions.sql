-- Removes duplicate questions from the four target categories.
-- Keeps exactly one row per question text inside each category.

WITH target_categories AS (
  SELECT id, name
  FROM categories
  WHERE name IN (
    'أسئلة عامة',
    'التاريخ',
    'إسلامي',
    'القرآن الكريم'
  )
),
ranked_questions AS (
  SELECT
    question_rows.id,
    target_categories.name AS category_name,
    ROW_NUMBER() OVER (
      PARTITION BY question_rows.category_id, regexp_replace(trim(question_rows.question), '\s+', ' ', 'g')
      ORDER BY question_rows.id
    ) AS duplicate_rank
  FROM category_questions AS question_rows
  JOIN target_categories ON target_categories.id = question_rows.category_id
),
deleted_rows AS (
  DELETE FROM category_questions
  WHERE id IN (
    SELECT id
    FROM ranked_questions
    WHERE duplicate_rank > 1
  )
  RETURNING id
),
deleted_by_category AS (
  SELECT
    ranked_questions.category_name,
    COUNT(*) AS deleted_duplicate_count
  FROM ranked_questions
  WHERE ranked_questions.duplicate_rank > 1
  GROUP BY ranked_questions.category_name
)
SELECT category_name, deleted_duplicate_count
FROM deleted_by_category
ORDER BY category_name;