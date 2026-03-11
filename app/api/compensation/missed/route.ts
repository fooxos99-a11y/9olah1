import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getPlanSessionContent } from "@/lib/quran-data"
import { isEvaluatedAttendance } from "@/lib/student-attendance"

interface MissedDayItem {
  date: string
  sessionIndex: number
  content: string
  hafiz_from_surah: string
  hafiz_from_verse: string
  hafiz_to_surah: string
  hafiz_to_verse: string
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")

    if (!studentId) {
      return NextResponse.json({ error: "Missing student_id" }, { status: 400 })
    }

    // 1. Get the current active plan
    const { data: plans } = await supabase
      .from("student_plans")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!plans || plans.length === 0 || !plans[0].start_date) {
      return NextResponse.json({ missedDays: [] }) // No active plan
    }

    const plan = plans[0]

    // 2. Get attendance records from start_date to yesterday
    const today = new Date()
    const saDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))
    saDate.setDate(saDate.getDate() - 1) // yesterday
    const yesterdayStr = saDate.toISOString().split("T")[0]

    const startDate = new Date(plan.start_date)

    if (startDate > saDate) {
        return NextResponse.json({ missedDays: [] }) // Plan starts in the future or started today
    }

    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("id, date, status, evaluations(hafiz_level)")
      .eq("student_id", studentId)
      .gte("date", plan.start_date)
      .lte("date", yesterdayStr)
      .order("date", { ascending: true })

    const ADVANCING_LEVELS = ["excellent", "good", "very_good"]
    
    // Create a Set of completed dates
    const completedDates = new Set()
    
    if (attendanceRecords) {
        for (const r of attendanceRecords) {
        if (isEvaluatedAttendance(r.status)) {
                const evals = Array.isArray(r.evaluations) ? r.evaluations : r.evaluations ? [r.evaluations] : []
                if (evals.length > 0) {
                    const ev = evals[evals.length - 1]
                    if (ADVANCING_LEVELS.includes(ev.hafiz_level ?? "")) {
                        completedDates.add(r.date)
                    }
                }
            }
        }
    }

    const missedDaysList: MissedDayItem[] = []
    
    // اربط كل يوم تدريبي بمقطع الخطة الأصلي لذلك اليوم، وليس بعدّاد المنجز الحالي.
    let d = new Date(plan.start_date)
    let sessionCounter = 1

    while (d <= saDate) {
        const dStr = d.toISOString().split("T")[0]
        const dayOfWeek = d.getDay() // 0: Sunday, 1: Monday, ..., 5: Friday, 6: Saturday
        
        // Skip Friday (5) and Saturday (6)
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        const dailyStr = String(plan.daily_pages)
        const daily = dailyStr === "0.3333" ? 0.3333 : dailyStr === "0.25" ? 0.25 : plan.daily_pages
        const sessionContent = getPlanSessionContent({
          ...plan,
          daily_pages: daily,
        }, sessionCounter)

            if (!completedDates.has(dStr)) {
            if (!sessionContent) {
              sessionCounter++
              d.setDate(d.getDate() + 1)
              continue
            }

                missedDaysList.push({
                    date: dStr,
                    sessionIndex: sessionCounter,
          content: sessionContent.text,
          hafiz_from_surah: sessionContent.fromSurah,
          hafiz_from_verse: sessionContent.fromVerse,
          hafiz_to_surah: sessionContent.toSurah,
          hafiz_to_verse: sessionContent.toVerse,
                })
            }

        sessionCounter++
        }
        d.setDate(d.getDate() + 1)
    }

    return NextResponse.json({ missedDays: missedDaysList })
  } catch (error: any) {
    console.error("[compensation error]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
