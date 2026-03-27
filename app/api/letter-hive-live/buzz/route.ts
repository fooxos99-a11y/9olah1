import { NextRequest, NextResponse } from "next/server"
import { notFoundResponse } from "@/lib/auth/guards"
import {
  type LetterHiveLiveMatchRow,
  normalizeLetterHiveLivePlayerSlots,
  resolveLetterHiveLivePlayerSlot,
  resolveMatchRole,
  sanitizeMatchForClient,
  sanitizeTeamName,
} from "@/lib/letter-hive-live"
import { createAdminClient } from "@/lib/supabase/admin"

async function findMatchByToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("letter_hive_live_matches")
    .select("*")
    .or(`presenter_token.eq.${token},team_a_token.eq.${token},team_b_token.eq.${token}`)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as LetterHiveLiveMatchRow | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = sanitizeTeamName(body?.token)
    const playerSlot = resolveLetterHiveLivePlayerSlot(body?.playerSlot)

    if (!token) {
      return NextResponse.json({ error: "رابط الفريق مطلوب" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    const playerRole = role === "presenter" && playerSlot
      ? normalizeLetterHiveLivePlayerSlots(match.metadata).find((entry) => entry.slot === playerSlot)?.color || null
      : role

    if (playerRole !== "team_a" && playerRole !== "team_b") {
      return NextResponse.json({ error: "هذا الرابط ليس رابط فريق" }, { status: 403 })
    }

    if (!match.is_open) {
      return NextResponse.json({ error: "المباراة لم تفتح بعد" }, { status: 409 })
    }

    if (!match.buzz_enabled) {
      return NextResponse.json({ error: "زر السبق غير مفعل الآن" }, { status: 409 })
    }

    if (match.first_buzz_side) {
      return NextResponse.json({ error: "تم تسجيل أول ضغطة بالفعل" }, { status: 409 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("letter_hive_live_matches")
      .update({
        first_buzz_side: playerRole,
        first_buzzed_at: new Date().toISOString(),
        buzz_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id)
      .is("first_buzz_side", null)
      .select("*")
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: "تم تسجيل أول ضغطة من فريق آخر" }, { status: 409 })
    }

    return NextResponse.json({
      match: sanitizeMatchForClient(data as LetterHiveLiveMatchRow, playerRole, new URL(request.url).origin, playerSlot),
      serverNow: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error registering live letter hive buzz:", error)
    return NextResponse.json({ error: "تعذر تسجيل الضغطة" }, { status: 500 })
  }
}