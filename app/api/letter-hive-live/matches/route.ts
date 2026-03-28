import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { forbiddenResponse, getRequestSession, unauthorizedResponse } from "@/lib/auth/guards"
import {
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

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession(request)
    if (!session) {
      return unauthorizedResponse()
    }

    if (session.role !== "admin") {
      return forbiddenResponse("إنشاء اللعبة متاح فقط لحساب الأدمن")
    }

    const supabase = createAdminClient()
    const presenterToken = generateToken()
    const teamAToken = generateToken()
    const teamBToken = generateToken()
    const boardLetters = shuffleLetters(LETTER_HIVE_LIVE_BASE_LETTERS)
    const claimedCells = Array(25).fill(null)
    let playersPerTeam = DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM

    try {
      const body = await request.json()
      playersPerTeam = resolveLetterHiveLivePlayersPerTeam(body?.playersPerTeam) ?? DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM
    } catch {
      playersPerTeam = DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM
    }

    const { data, error } = await supabase
      .from("letter_hive_live_matches")
      .insert({
        title: "مباراة خلية الحروف المباشرة",
        created_by_user_id: session.id,
        created_by_name: session.name,
        presenter_token: presenterToken,
        team_a_token: teamAToken,
        team_b_token: teamBToken,
        status: "waiting",
        is_open: false,
        buzz_enabled: false,
        board_letters: boardLetters,
        claimed_cells: claimedCells,
        metadata: {
          playersPerTeam,
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
      }),
    })
  } catch (error) {
    console.error("Error creating live letter hive match:", error)
    return NextResponse.json({ error: "تعذر إنشاء اللعبة المباشرة" }, { status: 500 })
  }
}