import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSessionFromCookieHeader } from "@/lib/auth/session"

function normalizeInput(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120)
}

async function requireAdmin(request: Request) {
  const session = await getSessionFromCookieHeader(request.headers.get("cookie"))

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const teamName = normalizeInput(body?.teamName)
    const playerOneName = normalizeInput(body?.playerOneName)
    const playerTwoName = normalizeInput(body?.playerTwoName)
    const session = await getSessionFromCookieHeader(request.headers.get("cookie"))

    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا لتسجيل الفريق" }, { status: 401 })
    }

    if (!teamName || !playerOneName || !playerTwoName) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("letter_hive_live_registrations")
      .insert({
        team_name: teamName,
        player_one_name: playerOneName,
        player_two_name: playerTwoName,
        submitted_by_user_id: session.id,
        submitted_by_name: session.name || null,
        status: "new",
      })
      .select("id, team_name, player_one_name, player_two_name, status, created_at")
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ registration: data }, { status: 200 })
  } catch (error) {
    console.error("Error creating live letter hive registration:", error)
    return NextResponse.json({ error: "تعذر حفظ التسجيل" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdmin(request)
    if (unauthorized) {
      return unauthorized
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("letter_hive_live_registrations")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ registrations: data || [] }, { status: 200 })
  } catch (error) {
    console.error("Error fetching live letter hive registrations:", error)
    return NextResponse.json({ error: "تعذر جلب التسجيلات" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdmin(request)
    if (unauthorized) {
      return unauthorized
    }

    const body = await request.json()
    const id = normalizeInput(body?.id)
    const status = body?.status === "reviewed" ? "reviewed" : "new"

    if (!id) {
      return NextResponse.json({ error: "المعرف مطلوب" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("letter_hive_live_registrations")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ registration: data }, { status: 200 })
  } catch (error) {
    console.error("Error updating live letter hive registration:", error)
    return NextResponse.json({ error: "تعذر تحديث التسجيل" }, { status: 500 })
  }
}