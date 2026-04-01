import { NextRequest, NextResponse } from "next/server"
import { notFoundResponse } from "@/lib/auth/guards"
import {
  isLetterHiveLiveCaptainSlot,
  isLetterHiveLivePlayerSlotActive,
  type LetterHiveLiveMatchRow,
  normalizeMatchMetadata,
  normalizeLetterHiveLivePlayerSlots,
  resolveLetterHiveLiveRequiresPresenter,
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
    const playerSlots = normalizeLetterHiveLivePlayerSlots(match.metadata)
    const activePlayerSlot = role === "presenter" && playerSlot && isLetterHiveLivePlayerSlotActive(match.metadata, playerSlot)
      ? playerSlots.find((entry) => entry.slot === playerSlot) || null
      : null
    const playerRole = role === "presenter" && !resolveLetterHiveLiveRequiresPresenter(match.metadata) && !playerSlot
      ? "team_b"
      : role === "presenter" && playerSlot
      ? (isLetterHiveLivePlayerSlotActive(match.metadata, playerSlot)
        ? activePlayerSlot?.color || null
        : null)
      : role

    const effectiveBuzzPlayerName = role === "presenter" && !playerSlot && !resolveLetterHiveLiveRequiresPresenter(match.metadata)
      ? match.team_b_name || match.created_by_name || null
      : activePlayerSlot?.name || null

    const effectiveBuzzPlayerSlot = role === "presenter" && !playerSlot && !resolveLetterHiveLiveRequiresPresenter(match.metadata)
      ? 1
      : activePlayerSlot?.slot || null

    if (playerRole !== "team_a" && playerRole !== "team_b") {
      return NextResponse.json({ error: "هذا الرابط ليس رابط فريق" }, { status: 403 })
    }

    if (!isLetterHiveLiveCaptainSlot(match.metadata, playerRole, effectiveBuzzPlayerSlot)) {
      return NextResponse.json({ error: "فقط اللاعب رقم 1 في كل فريق يستطيع الضغط على الزر" }, { status: 403 })
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
        metadata: {
          ...normalizeMatchMetadata(match.metadata),
          firstBuzzPlayerName: effectiveBuzzPlayerName,
          firstBuzzPlayerSlot: effectiveBuzzPlayerSlot,
        },
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