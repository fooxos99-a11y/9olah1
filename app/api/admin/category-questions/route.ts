import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/admin"
import { createAdminClient, hasMatchingServiceRoleConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase-server"

async function getCategoryQuestionsClient() {
  if (hasMatchingServiceRoleConfig()) {
    return createAdminClient()
  }

  return createClient()
}

export async function POST(request: Request) {
  const auth = await requireAdminSession(request)
  if ("response" in auth) {
    return auth.response
  }

  try {
    const supabase = await getCategoryQuestionsClient()
    const { category_id, question, answer, points } = await request.json()

    const { data, error } = await supabase
      .from("category_questions")
      .insert([{ category_id, question, answer, points }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating admin question:", error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminSession(request)
  if ("response" in auth) {
    return auth.response
  }

  try {
    const supabase = await getCategoryQuestionsClient()
    const { id, question, answer, points } = await request.json()

    const { data, error } = await supabase
      .from("category_questions")
      .update({ question, answer, points, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating admin question:", error)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminSession(request)
  if ("response" in auth) {
    return auth.response
  }

  try {
    const supabase = await getCategoryQuestionsClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("category_questions")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting admin question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}