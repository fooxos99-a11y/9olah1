import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ensureStudentAccess, requireRoles } from "@/lib/auth/guards"
import {
  SURAHS,
  calculateQuranMemorizationProgress,
  getContiguousCompletedJuzRange,
  getJuzBounds,
  getJuzNumbersForPageRange,
  getNextAyahReference,
  getNormalizedCompletedJuzs,
  getPendingMasteryJuzs,
  hasScatteredCompletedJuzs,
  getPageFloatForAyah,
  resolvePlanTotalDays,
  resolvePlanTotalPages,
} from "@/lib/quran-data"
import { getSaudiDateString } from "@/lib/saudi-time"
import { isEvaluatedAttendance } from "@/lib/student-attendance"

const ADVANCING_MEMORIZATION_LEVELS = ["excellent", "good", "very_good"]

function normalizePlanSurahNames<T extends {
  start_surah_number?: number | null
  end_surah_number?: number | null
  start_surah_name?: string | null
  end_surah_name?: string | null
}>(plan: T): T {
  const startSurahName = plan.start_surah_number
    ? SURAHS.find((surah) => surah.number === Number(plan.start_surah_number))?.name
    : null
  const endSurahName = plan.end_surah_number
    ? SURAHS.find((surah) => surah.number === Number(plan.end_surah_number))?.name
    : null

  return {
    ...plan,
    start_surah_name: startSurahName || plan.start_surah_name,
    end_surah_name: endSurahName || plan.end_surah_name,
  }
}

function hasCompletedMemorization(record: any) {
  if (!isEvaluatedAttendance(record.status)) return false

  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if (evaluations.length === 0) return false

  const latestEvaluation = evaluations[evaluations.length - 1]
  return ADVANCING_MEMORIZATION_LEVELS.includes(latestEvaluation?.hafiz_level ?? "")
}

function getScheduledStudyDates(startDate: string, maxSessions: number, endDate = getSaudiDateString()) {
  const scheduledDates: string[] = []
  const currentDate = new Date(startDate)
  const lastDate = new Date(endDate)

  while (currentDate <= lastDate && scheduledDates.length < maxSessions) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      scheduledDates.push(currentDate.toISOString().split("T")[0])
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return scheduledDates
}

function getExpectedNextStart(prevStartSurah?: number | null, prevEndSurah?: number | null, prevEndVerse?: number | null) {
  if (!prevStartSurah || !prevEndSurah || !prevEndVerse) {
    return null
  }

  const previousEndSurahData = SURAHS.find((surah) => surah.number === prevEndSurah)
  if (!previousEndSurahData) return null

  const isDescending = prevStartSurah > prevEndSurah

  if (!isDescending) {
    if (prevEndVerse < previousEndSurahData.verseCount) {
      return { surahNumber: prevEndSurah, verseNumber: prevEndVerse + 1 }
    }

    const nextSurah = SURAHS.find((surah) => surah.number === prevEndSurah + 1)
    return nextSurah ? { surahNumber: nextSurah.number, verseNumber: 1 } : null
  }

  if (prevEndVerse > 1) {
    return { surahNumber: prevEndSurah, verseNumber: prevEndVerse - 1 }
  }

  const previousSurah = SURAHS.find((surah) => surah.number === prevEndSurah - 1)
  return previousSurah
    ? { surahNumber: previousSurah.number, verseNumber: previousSurah.verseCount }
    : null
}

function compareAyahRefs(
  leftSurahNumber: number,
  leftVerseNumber: number,
  rightSurahNumber: number,
  rightVerseNumber: number,
) {
  if (leftSurahNumber !== rightSurahNumber) {
    return leftSurahNumber - rightSurahNumber
  }

  return leftVerseNumber - rightVerseNumber
}

function isStartAllowedAfterPrevious(
  startSurahNumber: number,
  startVerseNumber: number,
  boundarySurahNumber: number,
  boundaryVerseNumber: number,
  previousDirection: "asc" | "desc",
) {
  const comparison = compareAyahRefs(startSurahNumber, startVerseNumber, boundarySurahNumber, boundaryVerseNumber)
  return previousDirection === "desc" ? comparison <= 0 : comparison >= 0
}

// GET - جلب خطط طالب معين أو جلب كل الخطط
export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")
    const planId = searchParams.get("plan_id")

    if (planId) {
      const { data, error } = await supabase
        .from("student_plans")
        .select("*")
        .eq("id", planId)
        .single()
      if (error) throw error
      return NextResponse.json({ plan: normalizePlanSurahNames(data) })
    }

    if (studentId) {
      const studentAccess = await ensureStudentAccess(supabase, session, studentId)
      if ("response" in studentAccess) {
        return studentAccess.response
      }

      const { data: studentData } = await supabase
        .from("students")
        .select("completed_juzs, current_juzs")
        .eq("id", studentId)
        .maybeSingle()
      const pendingMasteryJuzs = getPendingMasteryJuzs(studentData?.current_juzs, studentData?.completed_juzs)

      // جلب الخطة مع عدد الأيام المكتملة
      const { data: plans, error } = await supabase
        .from("student_plans")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })

      if (error) throw error

      if (!plans || plans.length === 0) {
        const quranMemorization = calculateQuranMemorizationProgress(
          {
            completed_juzs: studentData?.completed_juzs || [],
          },
          0,
        )

        return NextResponse.json({
          plan: null,
          completedDays: 0,
          progressPercent: 0,
          quranMemorizedPages: quranMemorization.memorizedPages,
          quranProgressPercent: quranMemorization.progressPercent,
          quranLevel: quranMemorization.level,
          attendanceRecords: [],
          completedRecords: [],
        })
      }

      const rawPlan = normalizePlanSurahNames(plans[0]) // الخطة الأحدث هي الفعالة
      const plan = {
        ...rawPlan,
        completed_juzs: studentData?.completed_juzs || [],
        current_juzs: pendingMasteryJuzs,
        total_pages: resolvePlanTotalPages({
          ...rawPlan,
          completed_juzs: studentData?.completed_juzs || [],
        }),
        total_days: resolvePlanTotalDays({
          ...rawPlan,
          completed_juzs: studentData?.completed_juzs || [],
        }),
      }

      // جلب سجلات الحضور مع تقييماتها (join مع evaluations)
      let attQuery = supabase
        .from("attendance_records")
        .select("id, date, status, is_compensation, created_at, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
        .eq("student_id", studentId)
        .order("date", { ascending: true })

      if (plan.start_date) {
        attQuery = attQuery.gte("date", plan.start_date)
      }

      const { data: attendanceRecords, error: attError } = await attQuery

      if (attError) {
        console.error("[plans] attendance query error:", attError)
        return NextResponse.json({
          plan,
          completedDays: 0,
          progressPercent: 0,
          attendanceRecords: [],
          completedRecords: [],
        })
      }

      const scheduledDates = plan.start_date
        ? getScheduledStudyDates(plan.start_date, plan.total_days || 0)
        : []

      const passingRecords = (attendanceRecords || []).filter(hasCompletedMemorization)
      const compensationRecords = passingRecords
        .filter((record: any) => !!record.is_compensation)
        .sort((left: any, right: any) => left.date.localeCompare(right.date))
      const normalRecords = passingRecords
        .filter((record: any) => !record.is_compensation)
        .sort((left: any, right: any) => {
          const dateComparison = left.date.localeCompare(right.date)
          if (dateComparison !== 0) return dateComparison
          return String(left.created_at || "").localeCompare(String(right.created_at || ""))
        })

      const fulfilledSessions = new Set<number>()
      const assignedRecordsBySession = new Map<number, any>()

      for (const record of compensationRecords) {
        const sessionIndex = scheduledDates.findIndex((scheduledDate) => scheduledDate === record.date) + 1
        if (!sessionIndex || fulfilledSessions.has(sessionIndex)) {
          continue
        }

        fulfilledSessions.add(sessionIndex)
        assignedRecordsBySession.set(sessionIndex, record)
      }

      for (const record of normalRecords) {
        for (let sessionIndex = 1; sessionIndex <= scheduledDates.length; sessionIndex += 1) {
          if (fulfilledSessions.has(sessionIndex)) {
            continue
          }

          fulfilledSessions.add(sessionIndex)
          assignedRecordsBySession.set(sessionIndex, record)
          break
        }
      }

      const completedRecords: any[] = []
      for (let sessionIndex = 1; sessionIndex <= scheduledDates.length; sessionIndex += 1) {
        if (!fulfilledSessions.has(sessionIndex)) {
          break
        }

        const record = assignedRecordsBySession.get(sessionIndex)
        if (record) {
          completedRecords.push(record)
        }
      }

      const completedDays = completedRecords.length
      const progressPercent =
        plan.total_days > 0
          ? Math.min(Math.round((completedDays / plan.total_days) * 100), 100)
          : 0
      const quranMemorization = calculateQuranMemorizationProgress(plan, completedDays)

      return NextResponse.json({
        plan,
        completedDays,
        progressPercent,
        quranMemorizedPages: quranMemorization.memorizedPages,
        quranProgressPercent: quranMemorization.progressPercent,
        quranLevel: quranMemorization.level,
        attendanceRecords: attendanceRecords || [],
        completedRecords,
      })
    }

    return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
  } catch (error) {
    console.error("[plans] GET error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

// POST - إنشاء خطة جديدة للطالب
export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = await createClient()
    const body = await request.json()
    const {
      student_id,
      start_surah_number,
      start_surah_name,
      start_verse,
      end_surah_number,
      end_surah_name,
      end_verse,
      daily_pages, // 0.5 | 1 | 2
      start_date,
      direction,
      total_days: totalDaysOverride,
      has_previous,
      prev_start_surah,
      prev_start_verse,
      prev_end_surah,
      prev_end_verse,
      muraajaa_pages,
      rabt_pages,
    } = body

    const { data: studentMemorizedData } = await supabase
      .from("students")
      .select("memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, completed_juzs, current_juzs")
      .eq("id", student_id)
      .maybeSingle()

    const normalizedCompletedJuzs = getNormalizedCompletedJuzs(studentMemorizedData?.completed_juzs)
    const pendingMasteryJuzs = getPendingMasteryJuzs(studentMemorizedData?.current_juzs, normalizedCompletedJuzs)
    const completedJuzRange = hasScatteredCompletedJuzs(normalizedCompletedJuzs)
      ? null
      : getContiguousCompletedJuzRange(normalizedCompletedJuzs)

    const effectiveHasPrevious =
      Boolean(has_previous) ||
      Boolean(
        (studentMemorizedData?.memorized_start_surah && studentMemorizedData?.memorized_end_surah) ||
        completedJuzRange ||
        normalizedCompletedJuzs.length > 0,
      )

    const effectivePrevStartSurah = prev_start_surah || studentMemorizedData?.memorized_start_surah || completedJuzRange?.startSurahNumber || null
    const effectivePrevStartVerse = prev_start_verse || studentMemorizedData?.memorized_start_verse || completedJuzRange?.startVerseNumber || null
    const effectivePrevEndSurah = prev_end_surah || studentMemorizedData?.memorized_end_surah || completedJuzRange?.endSurahNumber || null
    const effectivePrevEndVerse = prev_end_verse || studentMemorizedData?.memorized_end_verse || completedJuzRange?.endVerseNumber || null

    if (!student_id || !start_surah_number || !end_surah_number || !daily_pages) {
      return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, student_id)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const normalizedDirection = direction || (Number(start_surah_number) > Number(end_surah_number) ? "desc" : "asc")
    let adjustedStartSurahNumber = Number(start_surah_number)
    let adjustedStartVerse = Number(start_verse) || 1
    let adjustedPlanMessage: string | null = null

    const startSurahData = SURAHS.find((surah) => surah.number === adjustedStartSurahNumber)
    const endSurahData = SURAHS.find((surah) => surah.number === Number(end_surah_number))

    if (!startSurahData || !endSurahData) {
      return NextResponse.json({ error: "تعذر تحديد السور المطلوبة" }, { status: 400 })
    }

    const selectedStartPage = getPageFloatForAyah(adjustedStartSurahNumber, adjustedStartVerse)
    const selectedEndAyah = Number(end_verse) || endSurahData.verseCount
    const nextSelectedEndAyah = getNextAyahReference(Number(end_surah_number), selectedEndAyah)
    const selectedEndPage = nextSelectedEndAyah
      ? getPageFloatForAyah(nextSelectedEndAyah.surah, nextSelectedEndAyah.ayah)
      : 605
    const selectedJuzs = getJuzNumbersForPageRange(selectedStartPage, selectedEndPage, normalizedDirection)
    const completedJuzSet = new Set<number>((studentMemorizedData?.completed_juzs || []).filter((juzNumber: number) => Number.isInteger(juzNumber)))
    const overlappingJuzs = selectedJuzs.filter((juzNumber) => completedJuzSet.has(juzNumber))

    if (overlappingJuzs.length > 0) {
      const leadingCompletedJuzs: number[] = []

      for (const juzNumber of selectedJuzs) {
        if (!completedJuzSet.has(juzNumber)) {
          break
        }

        leadingCompletedJuzs.push(juzNumber)
      }

      if (leadingCompletedJuzs.length === selectedJuzs.length) {
        return NextResponse.json({ error: "النطاق المختار محفوظ بالكامل ضمن الأجزاء الناجحة للطالب" }, { status: 400 })
      }

      if (leadingCompletedJuzs.length > 0) {
        const nextJuzNumber = selectedJuzs[leadingCompletedJuzs.length]
        const nextJuzBounds = getJuzBounds(nextJuzNumber)

        if (!nextJuzBounds) {
          return NextResponse.json({ error: "تعذر تحديد بداية النطاق بعد تجاوز الأجزاء الناجحة" }, { status: 400 })
        }

        if (normalizedDirection === "desc") {
          adjustedStartSurahNumber = nextJuzBounds.endSurahNumber
          adjustedStartVerse = nextJuzBounds.endVerseNumber
        } else {
          adjustedStartSurahNumber = nextJuzBounds.startSurahNumber
          adjustedStartVerse = nextJuzBounds.startVerseNumber
        }

        adjustedPlanMessage = `تم تجاوز الأجزاء الناجحة في بداية النطاق تلقائيًا: ${leadingCompletedJuzs.join("، ")}`
      }
    }

    if (effectiveHasPrevious && !hasScatteredCompletedJuzs(normalizedCompletedJuzs)) {
      const expectedNextStart = getExpectedNextStart(effectivePrevStartSurah, effectivePrevEndSurah, effectivePrevEndVerse)
      if (!expectedNextStart) {
        return NextResponse.json({ error: "بيانات الحفظ السابق غير مكتملة" }, { status: 400 })
      }

      const normalizedStartVerse = adjustedStartVerse
      const previousEndSurahData = SURAHS.find((surah) => surah.number === Number(effectivePrevEndSurah))
      const normalizedEndVerse = Number(end_verse) || endSurahData.verseCount
      const normalizedPrevStartVerse = Number(effectivePrevStartVerse) || 1
      const normalizedPrevEndVerse = Number(effectivePrevEndVerse) || previousEndSurahData?.verseCount || 1
      const previousDirection = Number(effectivePrevStartSurah) > Number(effectivePrevEndSurah) ? "desc" : "asc"
      const isMiddlePreviousSkip = previousDirection === "asc" &&
        compareAyahRefs(adjustedStartSurahNumber, normalizedStartVerse, Number(effectivePrevStartSurah), normalizedPrevStartVerse) < 0 &&
        compareAyahRefs(Number(end_surah_number), normalizedEndVerse, Number(effectivePrevEndSurah), normalizedPrevEndVerse) > 0

      if (
        !isMiddlePreviousSkip &&
        !isStartAllowedAfterPrevious(
          adjustedStartSurahNumber,
          normalizedStartVerse,
          expectedNextStart.surahNumber,
          expectedNextStart.verseNumber,
          previousDirection,
        )
      ) {
        const expectedSurah = SURAHS.find((surah) => surah.number === expectedNextStart.surahNumber)
        return NextResponse.json(
          {
            error: `يجب أن يكون بداية المحفوظ عند آخر آية تم حفظها: ${expectedSurah?.name || "السورة"} آية ${expectedNextStart.verseNumber}، أو إعادة حفظ الطالب من جديد`,
          },
          { status: 400 },
        )
      }
    }

    const totalPages = resolvePlanTotalPages({
      start_surah_number: adjustedStartSurahNumber,
      start_verse: adjustedStartVerse,
      end_surah_number,
      end_verse,
      direction: normalizedDirection,
      has_previous: effectiveHasPrevious,
      prev_start_surah: effectivePrevStartSurah,
      prev_start_verse: effectivePrevStartVerse,
      prev_end_surah: effectivePrevEndSurah,
      prev_end_verse: effectivePrevEndVerse,
      completed_juzs: normalizedCompletedJuzs,
    })
    const totalDays =
      totalDaysOverride && Number(totalDaysOverride) > 0
        ? Number(totalDaysOverride)
        : resolvePlanTotalDays({
            start_surah_number: adjustedStartSurahNumber,
            start_verse: adjustedStartVerse,
            end_surah_number,
            end_verse,
            total_pages: totalPages,
            daily_pages,
            direction: normalizedDirection,
            has_previous: effectiveHasPrevious,
            prev_start_surah: effectivePrevStartSurah,
            prev_start_verse: effectivePrevStartVerse,
            prev_end_surah: effectivePrevEndSurah,
            prev_end_verse: effectivePrevEndVerse,
            completed_juzs: normalizedCompletedJuzs,
          })

    const { data: existingPlans, error: existingPlansError } = await supabase
      .from("student_plans")
      .select("id")
      .eq("student_id", student_id)

    if (existingPlansError) {
      throw existingPlansError
    }

    const { data, error } = await supabase
      .from("student_plans")
      .insert([{
        student_id,
        start_surah_number: adjustedStartSurahNumber,
        start_surah_name: SURAHS.find((surah) => surah.number === adjustedStartSurahNumber)?.name || start_surah_name,
        start_verse: adjustedStartVerse || null,
        end_surah_number,
        end_surah_name,
        end_verse: end_verse || null,
        daily_pages,
        total_pages: totalPages,
        total_days: totalDays,
        start_date: start_date || getSaudiDateString(),
        direction: normalizedDirection,
        has_previous: effectiveHasPrevious,
        prev_start_surah: effectivePrevStartSurah,
        prev_start_verse: effectivePrevStartVerse,
        prev_end_surah: effectivePrevEndSurah,
        prev_end_verse: effectivePrevEndVerse,
        muraajaa_pages: muraajaa_pages || null,
        rabt_pages: rabt_pages || null,
      }])
      .select()
      .single()

    if (error) throw error

    const oldPlanIds = (existingPlans || []).map((plan) => plan.id).filter(Boolean)
    if (oldPlanIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from("student_plans")
        .delete()
        .in("id", oldPlanIds)

      if (cleanupError) {
        console.error("[plans] cleanup old plans error:", cleanupError)
      }
    }

    return NextResponse.json({
      success: true,
      plan: {
        ...data,
        completed_juzs: normalizedCompletedJuzs,
        current_juzs: pendingMasteryJuzs,
      },
      message: adjustedPlanMessage,
    }, { status: 201 })
  } catch (error) {
    console.error("[plans] POST error:", error)
    return NextResponse.json({ error: "حدث خطأ في حفظ الخطة" }, { status: 500 })
  }
}

// DELETE - حذف خطة
export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get("plan_id")
    const studentId = searchParams.get("student_id")

    if (planId) {
      const { data: plan, error: planError } = await supabase
        .from("student_plans")
        .select("student_id")
        .eq("id", planId)
        .maybeSingle()

      if (planError) {
        throw planError
      }

      if (!plan?.student_id) {
        return NextResponse.json({ error: "الخطة غير موجودة" }, { status: 404 })
      }

      const studentAccess = await ensureStudentAccess(supabase, session, plan.student_id)
      if ("response" in studentAccess) {
        return studentAccess.response
      }

      const { error } = await supabase.from("student_plans").delete().eq("id", planId)
      if (error) throw error
    } else if (studentId) {
      const studentAccess = await ensureStudentAccess(supabase, session, studentId)
      if ("response" in studentAccess) {
        return studentAccess.response
      }

      const { error } = await supabase.from("student_plans").delete().eq("student_id", studentId)
      if (error) throw error
    } else {
      return NextResponse.json({ error: "معرف مطلوب" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[plans] DELETE error:", error)
    return NextResponse.json({ error: "حدث خطأ في حذف الخطة" }, { status: 500 })
  }
}
