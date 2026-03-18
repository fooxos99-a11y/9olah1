import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  getAbsenceNotificationTemplates,
  normalizeAbsenceNotificationTemplates,
  saveAbsenceNotificationTemplates,
} from "@/lib/absence-notifications"

type StudentRow = {
  id: string
  name: string | null
  account_number: number | null
  halaqah: string | null
}

type AttendanceRow = {
  student_id: string
  date: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    const [{ data: students, error: studentsError }, { data: absences, error: absencesError }, templates] = await Promise.all([
      supabase.from("students").select("id, name, account_number, halaqah").order("name", { ascending: true }),
      supabase.from("attendance_records").select("student_id, date").eq("status", "absent"),
      getAbsenceNotificationTemplates(supabase),
    ])

    if (studentsError) throw studentsError
    if (absencesError) throw absencesError

    const absenceMap = new Map<string, { count: number; lastDate: string | null }>()

    for (const absence of (absences || []) as AttendanceRow[]) {
      const current = absenceMap.get(absence.student_id) || { count: 0, lastDate: null }
      absenceMap.set(absence.student_id, {
        count: current.count + 1,
        lastDate: !current.lastDate || absence.date > current.lastDate ? absence.date : current.lastDate,
      })
    }

    const rows = ((students || []) as StudentRow[])
      .map((student) => {
        const absenceInfo = absenceMap.get(student.id)

        return {
          id: student.id,
          name: student.name || "طالب غير معرف",
          account_number: student.account_number,
          halaqah: student.halaqah,
          absenceCount: absenceInfo?.count || 0,
          lastAbsenceDate: absenceInfo?.lastDate || null,
        }
      })
      .filter((student) => student.absenceCount > 0)
      .sort((left, right) => {
        if (right.absenceCount !== left.absenceCount) {
          return right.absenceCount - left.absenceCount
        }

        return left.name.localeCompare(right.name, "ar")
      })

    return NextResponse.json({ students: rows, templates })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "تعذر جلب بيانات الغيابات" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const templates = normalizeAbsenceNotificationTemplates(body?.templates)
    const savedTemplates = await saveAbsenceNotificationTemplates(supabase, templates)

    return NextResponse.json({ success: true, templates: savedTemplates })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "تعذر حفظ قوالب الغياب" }, { status: 500 })
  }
}