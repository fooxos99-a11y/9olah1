import { NextRequest, NextResponse } from "next/server"
import { notFoundResponse } from "@/lib/auth/guards"
import { canControlLetterHiveLiveMatch, isLetterHiveLiveCaptainSlot, normalizeLetterHiveLivePlayerSlots, normalizeMatchMetadata, resolveLetterHiveLiveBuzzOpponentTimerSeconds, resolveLetterHiveLiveBuzzOwnerTimerSeconds, resolveLetterHiveLivePlayerSlot, resolveLetterHiveLiveRequiresPresenter, type LetterHiveLiveMatchRow, resolveMatchRole, sanitizeMatchForClient, sanitizeTeamName } from "@/lib/letter-hive-live"
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
  "team_a_name",
  "team_b_name",
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
    .or(`presenter_token.eq.${token},team_a_token.eq.${token},team_b_token.eq.${token}`)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as LetterHiveLiveMatchRow | null
}

function resolveActiveBuzzSide(match: LetterHiveLiveMatchRow) {
  if (!match.first_buzz_side || !match.first_buzzed_at) {
    return null
  }

  const firstBuzzAtMs = Date.parse(match.first_buzzed_at)
  if (!Number.isFinite(firstBuzzAtMs)) {
    return null
  }

  const ownerPhaseEndsAtMs = firstBuzzAtMs + resolveLetterHiveLiveBuzzOwnerTimerSeconds(match.metadata) * 1000
  const opponentPhaseEndsAtMs = ownerPhaseEndsAtMs + resolveLetterHiveLiveBuzzOpponentTimerSeconds(match.metadata) * 1000
  const nowMs = Date.now()

  if (nowMs < ownerPhaseEndsAtMs) {
    return match.first_buzz_side
  }

  if (nowMs < opponentPhaseEndsAtMs) {
    return match.first_buzz_side === "team_a" ? "team_b" : "team_a"
  }

  return null
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const token = sanitizeTeamName(body?.token)
    const playerSlot = resolveLetterHiveLivePlayerSlot(body?.playerSlot)

    if (!token) {
      return NextResponse.json({ error: "رابط المقدم مطلوب" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    const playerSlots = normalizeLetterHiveLivePlayerSlots(match.metadata)
    const requiresPresenter = resolveLetterHiveLiveRequiresPresenter(match.metadata)
    const effectiveRole = role === "presenter" && playerSlot
      ? playerSlots.find((entry) => entry.slot === playerSlot)?.color || "player"
      : role === "presenter" && !requiresPresenter
        ? "team_b"
        : role

    const activeBuzzSide = !requiresPresenter ? resolveActiveBuzzSide(match) : null
    const canManageCurrentQuestion = effectiveRole === "team_a" || effectiveRole === "team_b"
      ? activeBuzzSide === effectiveRole
      : false

    if (!canControlLetterHiveLiveMatch(match.metadata, effectiveRole || "player") && !canManageCurrentQuestion) {
      return NextResponse.json({ error: "هذا الرابط لا يملك صلاحية إدارة السؤال" }, { status: 403 })
    }

    if (!requiresPresenter && (effectiveRole === "team_a" || effectiveRole === "team_b")) {
      const effectivePlayerSlot = role === "presenter" && !playerSlot ? 1 : playerSlot

      if (!isLetterHiveLiveCaptainSlot(match.metadata, effectiveRole, effectivePlayerSlot)) {
        return NextResponse.json({ error: "فقط اللاعب رقم 1 في كل فريق يستطيع التحكم بالسؤال" }, { status: 403 })
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const key of ALLOWED_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updatePayload[key] = body[key]
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, "metadata")) {
      updatePayload.metadata = {
        ...normalizeMatchMetadata(match.metadata),
        ...normalizeMatchMetadata(updatePayload.metadata),
      }
    }

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json({ error: "لا يوجد أي تحديث مطلوب" }, { status: 400 })
    }

    if (updatePayload.show_answer === true) {
      if (!match.current_prompt || !match.current_answer) {
        return NextResponse.json({ error: "لا يوجد سؤال جارٍ لعرض جوابه" }, { status: 409 })
      }

      if (!match.first_buzz_side) {
        return NextResponse.json({ error: "لا يمكن إظهار الجواب قبل ضغط الزر" }, { status: 409 })
      }
    }

    if (updatePayload.first_buzz_side === null) {
      updatePayload.first_buzzed_at = null

      const nextMetadata = Object.prototype.hasOwnProperty.call(updatePayload, "metadata")
        ? normalizeMatchMetadata(updatePayload.metadata)
        : normalizeMatchMetadata(match.metadata)

      delete nextMetadata.firstBuzzPlayerName
      delete nextMetadata.firstBuzzPlayerSlot
      updatePayload.metadata = nextMetadata
    }

    if (updatePayload.current_prompt === null || updatePayload.current_cell_index === null) {
      const nextMetadata = Object.prototype.hasOwnProperty.call(updatePayload, "metadata")
        ? normalizeMatchMetadata(updatePayload.metadata)
        : normalizeMatchMetadata(match.metadata)

      delete nextMetadata.questionStartedAt
      updatePayload.metadata = nextMetadata
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
      match: sanitizeMatchForClient(data as LetterHiveLiveMatchRow, effectiveRole || "presenter", new URL(request.url).origin, playerSlot),
      serverNow: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating live letter hive match state:", error)
    return NextResponse.json({ error: "تعذر تحديث حالة المباراة" }, { status: 500 })
  }
}