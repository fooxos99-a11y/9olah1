import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/admin"
import { createAdminClient, hasMatchingServiceRoleConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const revalidate = 0

type CategoryRow = {
  id: string
  name: string
  created_at?: string | null
  updated_at?: string | null
}

type CategoryQuestionRow = {
  id: string
  category_id: string
  question: string
  answer: string
  points: number
  created_at?: string | null
  updated_at?: string | null
}

async function getReadCategoriesClient() {
  return createClient()
}

async function getWriteCategoriesClient() {
  if (hasMatchingServiceRoleConfig()) {
    return createAdminClient()
  }

  return createClient()
}

export async function GET(request: Request) {
  const auth = await requireAdminSession(request)
  if ("response" in auth) {
    return auth.response
  }

  try {
    const supabase = await getReadCategoriesClient()
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, created_at, updated_at")
      .order("name")

    if (error) throw error

    const categoryRows = (categories ?? []) as CategoryRow[]
    const categoryIds = categoryRows.map((category) => category.id)

    let questionRows: CategoryQuestionRow[] = []
    if (categoryIds.length > 0) {
      const { data: questions, error: questionsError } = await supabase
        .from("category_questions")
        .select("id, category_id, question, answer, points, created_at, updated_at")
        .in("category_id", categoryIds)

      if (questionsError) throw questionsError
      questionRows = (questions ?? []) as CategoryQuestionRow[]
    }

    const questionsByCategoryId = new Map<string, CategoryQuestionRow[]>()
    for (const question of questionRows) {
      const questions = questionsByCategoryId.get(question.category_id) ?? []
      questions.push(question)
      questionsByCategoryId.set(question.category_id, questions)
    }

    const payload = categoryRows.map((category) => ({
      ...category,
      questions: questionsByCategoryId.get(category.id) ?? [],
    }))

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    })
  } catch (error) {
    console.error("Error fetching admin categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession(request)
  if ("response" in auth) {
    return auth.response
  }

  try {
    const supabase = await getWriteCategoriesClient()
    const { name } = await request.json()

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating admin category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminSession(request)
  if ("response" in auth) {
    return auth.response
  }

  try {
    const supabase = await getWriteCategoriesClient()
    const { id, name } = await request.json()

    const { data, error } = await supabase
      .from("categories")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating admin category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminSession(request)
  if ("response" in auth) {
    return auth.response
  }

  try {
    const supabase = await getWriteCategoriesClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting admin category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}