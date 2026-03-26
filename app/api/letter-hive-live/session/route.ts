import { NextRequest, NextResponse } from "next/server"
import { notFoundResponse } from "@/lib/auth/guards"
import { type LetterHiveLiveMatchRow, resolveMatchRole, sanitizeMatchForClient, sanitizeTeamName } from "@/lib/letter-hive-live"
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

    return NextResponse.json({
      match: sanitizeMatchForClient(match, role, new URL(request.url).origin),
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

    if (!token || !teamName) {
      return NextResponse.json({ error: "الرابط واسم الفريق مطلوبان" }, { status: 400 })
    }

    const match = await findMatchByToken(token)
    if (!match) {
      return notFoundResponse("المباراة غير موجودة")
    }

    const role = resolveMatchRole(match, token)
    if (!role || role === "presenter") {
      return NextResponse.json({ error: "هذا الرابط ليس رابط فريق" }, { status: 403 })
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
    })
  } catch (error) {
    console.error("Error joining live letter hive match:", error)
    return NextResponse.json({ error: "تعذر حفظ اسم الفريق" }, { status: 500 })
  }
}