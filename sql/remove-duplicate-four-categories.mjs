import dotenv from "dotenv"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: path.resolve(".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables in .env.local")
}

const targetCategoryNames = ["أسئلة عامة", "التاريخ", "إسلامي", "القرآن الكريم"]

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function normalizeQuestion(value) {
  return value.replace(/\s+/g, " ").trim()
}

const { data: categories, error: categoriesError } = await supabase
  .from("categories")
  .select("id, name")
  .in("name", targetCategoryNames)

if (categoriesError) {
  throw categoriesError
}

const categoryIds = (categories ?? []).map((category) => category.id)

if (categoryIds.length === 0) {
  console.log(JSON.stringify({ projectUrl: supabaseUrl, deletedCount: 0, deletedByCategory: {} }, null, 2))
  process.exit(0)
}

const { data: questions, error: questionsError } = await supabase
  .from("category_questions")
  .select("id, category_id, question, created_at")
  .in("category_id", categoryIds)
  .order("created_at", { ascending: true })
  .order("id", { ascending: true })

if (questionsError) {
  throw questionsError
}

const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]))
const firstQuestionIdByKey = new Map()
const duplicateIds = []
const deletedByCategory = {}

for (const questionRow of questions ?? []) {
  const normalizedQuestion = normalizeQuestion(questionRow.question)
  const duplicateKey = `${questionRow.category_id}::${normalizedQuestion}`

  if (!firstQuestionIdByKey.has(duplicateKey)) {
    firstQuestionIdByKey.set(duplicateKey, questionRow.id)
    continue
  }

  duplicateIds.push(questionRow.id)
  const categoryName = categoryNameById.get(questionRow.category_id) ?? questionRow.category_id
  deletedByCategory[categoryName] = (deletedByCategory[categoryName] ?? 0) + 1
}

const chunkSize = 100
for (let index = 0; index < duplicateIds.length; index += chunkSize) {
  const chunk = duplicateIds.slice(index, index + chunkSize)
  const { error: deleteError } = await supabase
    .from("category_questions")
    .delete()
    .in("id", chunk)

  if (deleteError) {
    throw deleteError
  }
}

console.log(
  JSON.stringify(
    {
      projectUrl: supabaseUrl,
      deletedCount: duplicateIds.length,
      deletedByCategory,
    },
    null,
    2,
  ),
)