import { NextRequest, NextResponse } from "next/server"
import { notFoundResponse } from "@/lib/auth/guards"
import {
  buildLetterHiveLivePlayerSlotsMetadata,
  groupLetterHiveLivePlayerNamesByColor,
  isLetterHiveLivePlayerSlotActive,
  type LetterHiveLiveMatchRow,
  normalizeLetterHiveLivePlayerSlots,
  resolveConfiguredLetterHiveLivePlayersPerTeam,
  resolveLetterHiveLivePlayerSlot,
  resolveMatchRole,
  sanitizeMatchForClient,
  sanitizeTeamName,
  type LetterHiveLiveTeamSide,
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = sanitizeTeamName(searchParams.get("token"))
    const playerSlot = resolveLetterHiveLivePlayerSlot(searchParams.get("slot"))

    if (!token) {
      return NextResponse.json({ error: "رمز الجلسة مطلوب" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    if (!role) {
      return notFoundResponse("الرابط غير صالح")
    }

    const playerSlots = normalizeLetterHiveLivePlayerSlots(match.metadata)
    const isActivePlayerSlot = playerSlot ? isLetterHiveLivePlayerSlotActive(match.metadata, playerSlot) : false

    if (role === "presenter" && playerSlot && !isActivePlayerSlot) {
      return NextResponse.json({ error: "رابط اللاعب غير صالح" }, { status: 400 })
    }

    const slotRole = role === "presenter" && playerSlot
      ? playerSlots.find((entry) => entry.slot === playerSlot)?.color || "player"
      : role

    return NextResponse.json({
      match: sanitizeMatchForClient(match, slotRole, new URL(request.url).origin, playerSlot),
      serverNow: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching live letter hive session:", error)
    return NextResponse.json({ error: "تعذر جلب حالة المباراة" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = sanitizeTeamName(body?.token)
    const teamName = sanitizeTeamName(body?.teamName)
    const playerName = sanitizeTeamName(body?.playerName)
    const playerSlot = resolveLetterHiveLivePlayerSlot(body?.playerSlot)
    const selectedColor = body?.selectedColor === "team_a" || body?.selectedColor === "team_b"
      ? (body.selectedColor as LetterHiveLiveTeamSide)
      : null

    if (!token) {
      return NextResponse.json({ error: "الرابط مطلوب" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    if (!role) {
      return NextResponse.json({ error: "هذا الرابط غير صالح" }, { status: 403 })
    }

    if (role === "presenter" && playerSlot) {
      if (!isLetterHiveLivePlayerSlotActive(match.metadata, playerSlot)) {
        return NextResponse.json({ error: "رابط اللاعب غير صالح" }, { status: 400 })
      }

      if (!playerName || !selectedColor) {
        return NextResponse.json({ error: "اسم اللاعب واللون مطلوبان" }, { status: 400 })
      }

      const playerSlots = normalizeLetterHiveLivePlayerSlots(match.metadata)
      const currentSlot = playerSlots.find((entry) => entry.slot === playerSlot)

      if (!currentSlot) {
        return NextResponse.json({ error: "رابط اللاعب غير صالح" }, { status: 400 })
      }

      if (currentSlot.name && (currentSlot.name !== playerName || currentSlot.color !== selectedColor)) {
        return NextResponse.json({ error: "هذا الرابط مثبت مسبقاً للاعب آخر" }, { status: 409 })
      }

      const playersPerTeam = resolveConfiguredLetterHiveLivePlayersPerTeam(match.metadata)
      const playersInSelectedColor = playerSlots.filter((entry) => entry.slot !== playerSlot && entry.color === selectedColor && entry.name)
      if (playersInSelectedColor.length >= playersPerTeam) {
        return NextResponse.json({ error: `هذا اللون اكتمل بعدد ${playersPerTeam} لاعبين بالفعل` }, { status: 409 })
      }

      const nextPlayerSlots = playerSlots.map((entry) => entry.slot === playerSlot ? { ...entry, name: playerName, color: selectedColor } : entry)
      const normalizedMetadata = match.metadata && typeof match.metadata === "object" && !Array.isArray(match.metadata)
        ? { ...(match.metadata as Record<string, unknown>) }
        : {}
      const groupedNames = groupLetterHiveLivePlayerNamesByColor(nextPlayerSlots)
      const supabase = createAdminClient()
      const { error } = await supabase
        .from("letter_hive_live_matches")
        .update({
          metadata: {
            ...normalizedMetadata,
            playerSlots: buildLetterHiveLivePlayerSlotsMetadata(nextPlayerSlots),
          },
          team_a_name: groupedNames.teamAName,
          team_b_name: groupedNames.teamBName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)

      if (error) {
        throw error
      }

      const refreshedMatch = await findMatchByToken(token)
      if (!refreshedMatch) {
        return notFoundResponse("المباراة غير موجودة")
      }

      return NextResponse.json({
        match: sanitizeMatchForClient(refreshedMatch, selectedColor, new URL(request.url).origin, playerSlot),
        serverNow: new Date().toISOString(),
      })
    }

    if (role === "presenter") {
      return NextResponse.json({ error: "هذا الرابط مخصص لروابط اللاعبين فقط" }, { status: 403 })
    }

    if (!teamName) {
      return NextResponse.json({ error: "اسم الفريق مطلوب" }, { status: 400 })
    }

    const columnName = role === "team_a" ? "team_a_name" : "team_b_name"
    const currentName = role === "team_a" ? match.team_a_name : match.team_b_name

    if (currentName && currentName !== teamName) {
      return NextResponse.json({ error: "اسم الفريق مثبت مسبقاً لهذا الرابط" }, { status: 409 })
    }

    if (!currentName) {
      const supabase = createAdminClient()
      const { error } = await supabase
        .from("letter_hive_live_matches")
        .update({
          [columnName]: teamName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)

      if (error) {
        throw error
      }
    }

    const refreshedMatch = await findMatchByToken(token)
    if (!refreshedMatch) {
      return notFoundResponse("المباراة غير موجودة")
    }

    return NextResponse.json({
      match: sanitizeMatchForClient(refreshedMatch, role, new URL(request.url).origin),
      serverNow: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error joining live letter hive match:", error)
    return NextResponse.json({ error: "تعذر حفظ اسم الفريق" }, { status: 500 })
  }
}