import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireRoles } from "@/lib/auth/guards"

function getKsaDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["student"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = await createClient()

    const body = await request.json()
    const { challengeId, answer, isCorrect } = body

    const todayDate = getKsaDateString()

    let challengeQuery = supabase
      .from("daily_challenges")
      .select("id, title, points_reward")
      .eq("date", todayDate)
      .limit(1)

    if (challengeId) {
      challengeQuery = challengeQuery.eq("id", challengeId)
    }

    const { data: challenge, error: challengeError } = await challengeQuery.maybeSingle()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: "تعذر العثور على تحدي اليوم" }, { status: 404 })
    }

    const { data: existingSolution } = await supabase
      .from("daily_challenge_solutions")
      .select("id, is_correct")
      .eq("challenge_id", challenge.id)
      .eq("student_id", session.id)
      .maybeSingle()

    if (existingSolution) {
      return NextResponse.json({
        success: existingSolution.is_correct,
        alreadySolved: true,
        isCorrect: existingSolution.is_correct,
        pointsAwarded: existingSolution.is_correct ? challenge.points_reward || 0 : 0,
        message: existingSolution.is_correct ? "تم احتساب نتيجة التحدي مسبقًا" : "تم تسجيل محاولتك مسبقًا",
      })
    }

    const normalizedCorrect = Boolean(isCorrect)

    const { error: insertError } = await supabase
      .from("daily_challenge_solutions")
      .insert({
        challenge_id: challenge.id,
        student_id: session.id,
        student_name: session.name,
        answer: answer ? JSON.stringify(answer) : null,
        is_correct: normalizedCorrect,
      })

    if (insertError) {
      return NextResponse.json({ error: "تعذر حفظ محاولة التحدي" }, { status: 500 })
    }

    if (normalizedCorrect) {
      const pointsAwarded = challenge.points_reward || 0
      const { data: studentData } = await supabase
        .from("students")
        .select("points, store_points")
        .eq("id", session.id)
        .maybeSingle()

      await supabase
        .from("students")
        .update({
          points: (studentData?.points || 0) + pointsAwarded,
          store_points: (studentData?.store_points || 0) + pointsAwarded,
        })
        .eq("id", session.id)

      return NextResponse.json({
        success: true,
        isCorrect: true,
        pointsAwarded,
        message: `مبروك! حصلت على ${pointsAwarded} نقطة`,
      })
    }

    return NextResponse.json({
      success: false,
      isCorrect: false,
      pointsAwarded: 0,
      message: "تم تسجيل المحاولة، حاول مرة أخرى غداً",
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
