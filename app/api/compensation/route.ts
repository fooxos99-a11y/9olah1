import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ensureStudentAccess, ensureTeacherScope, isTeacherRole, requireRoles } from "@/lib/auth/guards"

// POST /api/compensation
export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = await createClient()
    const {
      student_id,
      teacher_id,
      halaqah,
      date,
      hafiz_from_surah,
      hafiz_from_verse,
      hafiz_to_surah,
      hafiz_to_verse,
      compensated_content,
    } = await request.json()

    if (!student_id || !teacher_id || !halaqah || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const teacherScopeError = ensureTeacherScope(session, halaqah, teacher_id)
    if (teacherScopeError) {
      return teacherScopeError
    }

    const studentAccess = await ensureStudentAccess(supabase, session, student_id)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const effectiveTeacherId = isTeacherRole(session.role) ? session.id : teacher_id

    const compensationNote = compensated_content ? `نجح بتعويض: ${compensated_content}` : "نجح بتعويض"

    const { data: existingCompensation } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", student_id)
      .eq("date", date)
      .eq("is_compensation", true)
      .maybeSingle()

    if (existingCompensation) {
      return NextResponse.json({ error: "تم تسجيل هذا التعويض مسبقًا" }, { status: 409 })
    }

    const { data: newRecord, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        student_id,
        teacher_id: effectiveTeacherId,
        halaqah,
        date,
        status: "present",
        is_compensation: true,
        notes: compensationNote,
      })
      .select("id")
      .single()

    if (insertError) throw insertError
    const recordId = newRecord.id

    // 2. تثبيت تقييم التعويض مع نفس النطاق الحفظي حتى يظهر في الملف الشخصي
    await supabase.from("evaluations").delete().eq("attendance_record_id", recordId)

    const { error: evaluationError } = await supabase.from("evaluations").insert({
      attendance_record_id: recordId,
      hafiz_level: "good",
      tikrar_level: "not_completed",
      samaa_level: "not_completed",
      rabet_level: "not_completed",
      hafiz_from_surah: hafiz_from_surah || null,
      hafiz_from_verse: hafiz_from_verse || null,
      hafiz_to_surah: hafiz_to_surah || null,
      hafiz_to_verse: hafiz_to_verse || null,
    })

    if (evaluationError) {
      throw evaluationError
    }

    // 3. إضافة 5 نقاط للطالب
    const { data: studentData } = await supabase
      .from("students")
      .select("points, store_points")
      .eq("id", student_id)
      .single()

    const newPoints = (studentData?.points || 0) + 5
    const newStorePoints = (studentData?.store_points || 0) + 5
    await supabase
      .from("students")
      .update({ points: newPoints, store_points: newStorePoints })
      .eq("id", student_id)

    return NextResponse.json({ success: true, newPoints })
  } catch (error: any) {
    console.error("[compensation error]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
