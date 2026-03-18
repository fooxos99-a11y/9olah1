"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, Loader2, Plus, Save, Search, Trash2 } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { toast } from "@/hooks/use-toast"
import { getSortedAbsenceNotificationTemplateEntries } from "@/lib/absence-notifications"

type AbsenceTemplates = Record<string, string>

type TemplateRow = {
  id: string
  threshold: number
  message: string
}

type StudentAbsenceRow = {
  id: string
  name: string
  account_number: number | null
  halaqah: string | null
  absenceCount: number
}

export default function AdminAbsencesPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الغيابات")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedHalaqah, setSelectedHalaqah] = useState("all")
  const [students, setStudents] = useState<StudentAbsenceRow[]>([])
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>([])

  useEffect(() => {
    if (!authVerified) return
    void fetchAbsences()
  }, [authVerified])

  const fetchAbsences = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/absences", { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب بيانات الغيابات")
      }

      setStudents((data.students || []).map((student: any) => ({
        id: student.id,
        name: student.name,
        account_number: student.account_number,
        halaqah: student.halaqah,
        absenceCount: student.absenceCount,
      })))
      setTemplateRows(
        getSortedAbsenceNotificationTemplateEntries(data.templates || {}).map((entry) => ({
          id: `${entry.threshold}`,
          threshold: entry.threshold,
          message: entry.message,
        })),
      )
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "تعذر جلب بيانات الغيابات", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const halaqat = useMemo(() => {
    return Array.from(new Set(students.map((student) => student.halaqah).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "ar")) as string[]
  }, [students])

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim()

    return students.filter((student) => {
      if (student.absenceCount <= 0) {
        return false
      }

      if (selectedHalaqah !== "all" && student.halaqah !== selectedHalaqah) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        student.name.includes(query)
        || String(student.account_number || "").includes(query)
      )
    })
  }, [searchQuery, selectedHalaqah, students])

  const handleAddTemplate = () => {
    const nextThreshold = (templateRows.at(-1)?.threshold || 4) + 1
    setTemplateRows((prev) => ([
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        threshold: nextThreshold,
        message: "",
      },
    ]))
  }

  const handleTemplateThresholdChange = (id: string, value: string) => {
    const numericValue = Number(value)
    setTemplateRows((prev) => prev.map((row) => (
      row.id === id
        ? { ...row, threshold: Number.isInteger(numericValue) && numericValue > 0 ? numericValue : 1 }
        : row
    )))
  }

  const handleTemplateMessageChange = (id: string, value: string) => {
    setTemplateRows((prev) => prev.map((row) => (row.id === id ? { ...row, message: value } : row)))
  }

  const handleRemoveTemplate = (id: string) => {
    setTemplateRows((prev) => prev.filter((row) => row.id !== id))
  }

  const handleSaveTemplates = async () => {
    try {
      const duplicateThreshold = templateRows.find((row, index) => (
        templateRows.findIndex((candidate) => candidate.threshold === row.threshold) !== index
      ))

      if (duplicateThreshold) {
        throw new Error(`العدد ${duplicateThreshold.threshold} مكرر في التنبيهات`)
      }

      const templatesToSave = templateRows.reduce<AbsenceTemplates>((accumulator, row) => {
        if (Number.isInteger(row.threshold) && row.threshold > 0 && row.message.trim()) {
          accumulator[String(row.threshold)] = row.message.trim()
        }
        return accumulator
      }, {})

      setSaving(true)
      const response = await fetch("/api/admin/absences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: templatesToSave }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ النصوص")
      }

      setTemplateRows(
        getSortedAbsenceNotificationTemplateEntries(data.templates || {}).map((entry) => ({
          id: `${entry.threshold}`,
          threshold: entry.threshold,
          message: entry.message,
        })),
      )
      toast({ title: "تم الحفظ", description: "تم تحديث نصوص إنذارات الغياب" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "تعذر حفظ النصوص", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !authVerified) {
    return <SiteLoader fullScreen />
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dir-rtl font-cairo">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1a2332]">الغيابات</h1>
            <p className="text-sm text-slate-500">عرض غيابات الطلاب وتعديل رسائل التنبيه التلقائية</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-bold text-[#1a2332]">جميع الطلاب وغياباتهم</h2>
          </div>

          <div className="grid gap-4 border-b border-slate-100 px-6 py-5 md:grid-cols-[220px,1fr]">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1a2332]">الحلقة</label>
              <div className="relative">
                <select
                  value={selectedHalaqah}
                  onChange={(event) => setSelectedHalaqah(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">جميع الحلقات</option>
                  {halaqat.map((halaqah) => (
                    <option key={halaqah} value={halaqah}>{halaqah}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-6 text-slate-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1a2332]">بحث</label>
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="اسم الطالب أو رقم الحساب"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-11 pl-4 text-sm outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><SiteLoader /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400">لا توجد نتائج مطابقة.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-[#1a2332]">
                  <tr>
                    <th className="px-6 py-4 text-right font-bold">الطالب</th>
                    <th className="px-6 py-4 text-right font-bold">رقم الحساب</th>
                    <th className="px-6 py-4 text-right font-bold">الحلقة</th>
                    <th className="px-6 py-4 text-right font-bold">عدد الغيابات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-semibold text-[#1a2332]">{student.name}</td>
                      <td className="px-6 py-4 text-slate-600">{student.account_number || "-"}</td>
                      <td className="px-6 py-4 text-slate-600">{student.halaqah || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex min-w-12 justify-center rounded-full px-3 py-1 text-xs font-bold ${student.absenceCount > 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                          {student.absenceCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-bold text-[#1a2332]">نصوص تنبيه الغياب</h2>
            <button
              onClick={handleAddTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 text-sm font-bold text-[#9c7216]"
            >
              <Plus className="h-4 w-4" />
              إضافة تنبيه
            </button>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            {templateRows.map((row) => {
              return (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#1a2332]">عدد الغياب</span>
                      <input
                        type="number"
                        min={1}
                        value={row.threshold}
                        onChange={(event) => handleTemplateThresholdChange(row.id, event.target.value)}
                        className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <button
                      onClick={() => handleRemoveTemplate(row.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  </div>

                  <textarea
                    value={row.message}
                    onChange={(event) => handleTemplateMessageChange(row.id, event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )
            })}
          </div>

          {templateRows.length === 0 && (
            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                لا توجد تنبيهات حالياً. استخدم زر إضافة تنبيه لإنشاء تنبيه جديد.
              </div>
            </div>
          )}

          <div className="px-6 pb-6">
            <button
              onClick={handleSaveTemplates}
              disabled={saving}
              className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ النصوص
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}