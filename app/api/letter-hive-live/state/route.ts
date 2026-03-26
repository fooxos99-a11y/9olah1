import { NextRequest, NextResponse } from "next/server"
import { notFoundResponse } from "@/lib/auth/guards"
import { type LetterHiveLiveMatchRow, resolveMatchRole, sanitizeMatchForClient, sanitizeTeamName } from "@/lib/letter-hive-live"
import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED_PATCH_KEYS = [
  "title",
  "status",
  "is_open",
  "buzz_enabled",
  "first_buzz_side",
  "current_prompt",
  "current_answer",
  "current_letter",
  "current_cell_index",
  "show_answer",
  "team_a_score",
  "team_b_score",
  "board_letters",
  "claimed_cells",
  "metadata",
] as const

async function findMatchByToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("letter_hive_live_matches")
    .select("*")
    .eq("presenter_token", token)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as LetterHiveLiveMatchRow | null
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const token = sanitizeTeamName(body?.token)

    if (!token) {
      return NextResponse.json({ error: "رابط المقدم مطلوب" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    if (role !== "presenter") {
      return NextResponse.json({ error: "هذا الرابط ليس رابط مقدم" }, { status: 403 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const key of ALLOWED_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updatePayload[key] = body[key]
      }
    }

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json({ error: "لا يوجد أي تحديث مطلوب" }, { status: 400 })
    }

    if (updatePayload.first_buzz_side === null) {
      updatePayload.first_buzzed_at = null
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("letter_hive_live_matches")
      .update(updatePayload)
      .eq("id", match.id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      match: sanitizeMatchForClient(data as LetterHiveLiveMatchRow, "presenter", new URL(request.url).origin),
    })
  } catch (error) {
    console.error("Error updating live letter hive match state:", error)
    return NextResponse.json({ error: "تعذر تحديث حالة المباراة" }, { status: 500 })
  }
}