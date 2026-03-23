import fs from "node:fs/promises"
import path from "node:path"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: path.resolve(".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables in .env.local")
}

const sqlPath = path.resolve("sql", "seed-all-user-provided-questions.sql")
const sql = await fs.readFile(sqlPath, "utf8")

const categoryMatch = sql.match(/WITH desired_categories\(name\) AS \(\s*VALUES([\s\S]*?)\),\s*created_categories AS/i)
if (!categoryMatch) {
  throw new Error("Could not parse desired categories from SQL file")
}

const questionMatch = sql.match(/question_bank\(category_name, question, answer, points\) AS \(\s*VALUES([\s\S]*?)\),\s*inserted_questions AS/i)
if (!questionMatch) {
  throw new Error("Could not parse question bank from SQL file")
}

const parseSqlString = (value) => value.replace(/''/g, "'")

const categoryPattern = /\('((?:[^']|'')*)'\)/g
const questionPattern = /\('((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+)\)/g

const desiredCategories = []
for (const match of categoryMatch[1].matchAll(categoryPattern)) {
  desiredCategories.push(parseSqlString(match[1]))
}

const questionBank = []
for (const match of questionMatch[1].matchAll(questionPattern)) {
  questionBank.push({
    categoryName: parseSqlString(match[1]),
    question: parseSqlString(match[2]),
    answer: parseSqlString(match[3]),
    points: Number(match[4]),
  })
}

if (!desiredCategories.length || !questionBank.length) {
  throw new Error("Parsed SQL file is empty")
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: existingCategories, error: existingCategoriesError } = await supabase
  .from("categories")
  .select("id, name")
  .in("name", desiredCategories)

if (existingCategoriesError) {
  throw existingCategoriesError
}

const existingCategoryNames = new Set((existingCategories ?? []).map((category) => category.name))
const categoriesToInsert = desiredCategories
  .filter((name) => !existingCategoryNames.has(name))
  .map((name) => ({ name }))

if (categoriesToInsert.length > 0) {
  const { error: insertCategoriesError } = await supabase
    .from("categories")
    .insert(categoriesToInsert)

  if (insertCategoriesError) {
    throw insertCategoriesError
  }
}

const { data: targetCategories, error: targetCategoriesError } = await supabase
  .from("categories")
  .select("id, name")
  .in("name", desiredCategories)

if (targetCategoriesError) {
  throw targetCategoriesError
}

const categoryIdByName = new Map((targetCategories ?? []).map((category) => [category.name, category.id]))

const questionRows = questionBank.map((entry) => {
  const categoryId = categoryIdByName.get(entry.categoryName)

  if (!categoryId) {
    throw new Error(`Missing category after insert: ${entry.categoryName}`)
  }

  return {
    category_id: categoryId,
    question: entry.question,
    answer: entry.answer,
    points: entry.points,
  }
})

const chunkSize = 100
for (let index = 0; index < questionRows.length; index += chunkSize) {
  const chunk = questionRows.slice(index, index + chunkSize)
  const { error: insertQuestionsError } = await supabase
    .from("category_questions")
    .insert(chunk)

  if (insertQuestionsError) {
    throw insertQuestionsError
  }
}

const insertedCountByCategory = questionRows.reduce((accumulator, row) => {
  const categoryName = (targetCategories ?? []).find((category) => category.id === row.category_id)?.name
  if (!categoryName) {
    return accumulator
  }

  accumulator[categoryName] = (accumulator[categoryName] ?? 0) + 1
  return accumulator
}, {})

console.log(
  JSON.stringify(
    {
      projectUrl: supabaseUrl,
      createdCategoryCount: categoriesToInsert.length,
      insertedQuestionCount: questionRows.length,
      insertedCountByCategory,
    },
    null,
    2,
  ),
)