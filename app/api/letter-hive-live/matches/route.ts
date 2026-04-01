import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getRequestSession } from "@/lib/auth/guards"
import {
  buildLetterHiveLivePlayerSlotsMetadata,
  buildMatchLinks,
  DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM,
  LETTER_HIVE_LIVE_BASE_LETTERS,
  resolveLetterHiveLivePlayersPerTeam,
  shuffleLetters,
} from "@/lib/letter-hive-live"
import { createAdminClient } from "@/lib/supabase/admin"

function generateToken() {
  return randomBytes(18).toString("hex")
}

async function buildAvailableBoardLetters(createdByUserId: string | null, supabase: ReturnType<typeof createAdminClient>) {
  if (!createdByUserId) {
    return shuffleLetters(LETTER_HIVE_LIVE_BASE_LETTERS)
  }

  const { data: matchRows, error: matchError } = await supabase
    .from("letter_hive_live_matches")
    .select("id")
    .eq("created_by_user_id", createdByUserId)

  if (matchError) {
    throw matchError
  }

  const scopedMatchIds = Array.from(new Set((matchRows || []).map((row) => row.id).filter(Boolean)))

  const [{ data: questionRows, error: questionError }, usedResult] = await Promise.all([
    supabase
      .from("letter_hive_live_questions")
      .select("id, letter")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    scopedMatchIds.length > 0
      ? supabase
          .from("letter_hive_live_used_questions")
          .select("question_id")
          .in("match_id", scopedMatchIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (questionError) {
    throw questionError
  }

  if (usedResult.error) {
    throw usedResult.error
  }

  const usedQuestionIds = new Set((usedResult.data || []).map((row) => row.question_id))
  const availableLetters = LETTER_HIVE_LIVE_BASE_LETTERS.filter((letter) =>
    (questionRows || []).some((row) => row.letter === letter && !usedQuestionIds.has(row.id)),
  )

  if (availableLetters.length === 0) {
    return shuffleLetters(LETTER_HIVE_LIVE_BASE_LETTERS)
  }

  const boardLetters: string[] = []

  while (boardLetters.length < LETTER_HIVE_LIVE_BASE_LETTERS.length) {
    boardLetters.push(...shuffleLetters(availableLetters))
  }

  return boardLetters.slice(0, LETTER_HIVE_LIVE_BASE_LETTERS.length)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession(request)

    const supabase = createAdminClient()
    const presenterToken = generateToken()
    const teamAToken = generateToken()
    const teamBToken = generateToken()
    const boardLetters = await buildAvailableBoardLetters(session?.id || null, supabase)
    const claimedCells = Array(25).fill(null)
    let playersPerTeam = DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM
    let routeBase = "/competitions/letter-hive-live"
    let requiresPresenter = true

    try {
      const body = await request.json()
      playersPerTeam = resolveLetterHiveLivePlayersPerTeam(body?.playersPerTeam) ?? DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM
      requiresPresenter = body?.requiresPresenter === false ? false : true
      routeBase = body?.routeBase === "/competitions/letter-hive/online"
        ? "/competitions/letter-hive/online"
        : "/competitions/letter-hive-live"
    } catch {
      playersPerTeam = DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM
      routeBase = "/competitions/letter-hive-live"
    }

    if (routeBase === "/competitions/letter-hive-live") {
      return NextResponse.json({ error: "تم إغلاق التسجيل في هذه الصفحة حاليًا" }, { status: 403 })
    }

    const initialPlayerSlots = !requiresPresenter
      ? buildLetterHiveLivePlayerSlotsMetadata([
          {
            slot: 1,
            name: session?.name || "المضيف",
            color: "team_b",
          },
        ])
      : {}

    const initialTeamOneName = !requiresPresenter
      ? session?.name || "المضيف"
      : null

    const { data, error } = await supabase
      .from("letter_hive_live_matches")
      .insert({
        title: "مباراة خلية الحروف المباشرة",
        created_by_user_id: session?.id || null,
        created_by_name: session?.name || "مضيف اللعبة",
        presenter_token: presenterToken,
        team_a_token: teamAToken,
        team_b_token: teamBToken,
        team_b_name: initialTeamOneName,
        status: "waiting",
        is_open: false,
        buzz_enabled: false,
        board_letters: boardLetters,
        claimed_cells: claimedCells,
        metadata: {
          playersPerTeam,
          requiresPresenter,
          controllerSide: "team_b",
          playerSlots: initialPlayerSlots,
        },
      })
      .select("id, presenter_token, team_a_token, team_b_token, status, created_at, metadata")
      .single()

    if (error) {
      throw error
    }

    const origin = new URL(request.url).origin

    return NextResponse.json({
      matchId: data.id,
      status: data.status,
      createdAt: data.created_at,
      links: buildMatchLinks(origin, {
        presenter_token: data.presenter_token,
        team_a_token: data.team_a_token,
        team_b_token: data.team_b_token,
        metadata: data.metadata,
      }, routeBase),
    })
  } catch (error) {
    console.error("Error creating live letter hive match:", error)
    return NextResponse.json({ error: "تعذر إنشاء اللعبة المباشرة" }, { status: 500 })
  }
}