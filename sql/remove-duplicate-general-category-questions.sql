-- Removes duplicate questions from the "أسئلة عامة" category.
-- Keeps exactly one row per question text and deletes the extra copies.

WITH ranked_questions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY regexp_replace(trim(question), '\s+', ' ', 'g')
      ORDER BY id
    ) AS duplicate_rank
  FROM category_questions
  WHERE category_id = '18dcd7b9-059a-43ee-aaa8-3fa2471b4d0a'::uuid
),
deleted_rows AS (
  DELETE FROM category_questions
  WHERE id IN (
    SELECT id
    FROM ranked_questions
    WHERE duplicate_rank > 1
  )
  RETURNING id
)
SELECT COUNT(*) AS deleted_duplicate_count
FROM deleted_rows;