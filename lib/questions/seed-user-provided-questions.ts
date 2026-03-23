import fs from "node:fs/promises"
import path from "node:path"

type ParsedQuestion = {
  categoryName: string
  question: string
  answer: string
  points: number
}

type SupabaseAdminClient = {
  from: (table: string) => {
    select: (columns: string) => {
      in: (column: string, values: string[]) => Promise<{ data: Array<{ id: string; name: string }> | null; error: { message: string } | null }>
    }
    insert: (values: Array<Record<string, string | number>>) => Promise<{ error: { message: string } | null }>
  }
}

function parseSqlString(value: string) {
  return value.replace(/''/g, "'")
}

async function readSeedFile() {
  const sqlPath = path.resolve(process.cwd(), "sql", "seed-all-user-provided-questions.sql")
  return fs.readFile(sqlPath, "utf8")
}

function parseSeedSql(sql: string) {
  const categoryMatch = sql.match(/WITH desired_categories\(name\) AS \(\s*VALUES([\s\S]*?)\),\s*created_categories AS/i)
  const questionMatch = sql.match(/question_bank\(category_name, question, answer, points\) AS \(\s*VALUES([\s\S]*?)\),\s*inserted_questions AS/i)

  if (!categoryMatch || !questionMatch) {
    throw new Error("Could not parse seed SQL file")
  }

  const categoryPattern = /\('((?:[^']|'')*)'\)/g
  const questionPattern = /\('((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+)\)/g

  const desiredCategories: string[] = []
  for (const match of categoryMatch[1].matchAll(categoryPattern)) {
    desiredCategories.push(parseSqlString(match[1]))
  }

  const questionBank: ParsedQuestion[] = []
  for (const match of questionMatch[1].matchAll(questionPattern)) {
    questionBank.push({
      categoryName: parseSqlString(match[1]),
      question: parseSqlString(match[2]),
      answer: parseSqlString(match[3]),
      points: Number(match[4]),
    })
  }

  if (desiredCategories.length === 0 || questionBank.length === 0) {
    throw new Error("Seed SQL file contains no categories or questions")
  }

  return { desiredCategories, questionBank }
}

export async function seedUserProvidedQuestions(supabase: SupabaseAdminClient) {
  const sql = await readSeedFile()
  const { desiredCategories, questionBank } = parseSeedSql(sql)

  const { data: existingCategories, error: existingCategoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .in("name", desiredCategories)

  if (existingCategoriesError) {
    throw new Error(existingCategoriesError.message)
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
      throw new Error(insertCategoriesError.message)
    }
  }

  const { data: targetCategories, error: targetCategoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .in("name", desiredCategories)

  if (targetCategoriesError) {
    throw new Error(targetCategoriesError.message)
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
      throw new Error(insertQuestionsError.message)
    }
  }

  const insertedCountByCategory = questionBank.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.categoryName] = (accumulator[entry.categoryName] ?? 0) + 1
    return accumulator
  }, {})

  return {
    createdCategoryCount: categoriesToInsert.length,
    insertedQuestionCount: questionRows.length,
    insertedCountByCategory,
  }
}