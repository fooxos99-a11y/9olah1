"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Trophy, Award, Calendar, Star, BarChart3, Medal, Gem, Flame, Zap, Crown, Heart, BookMarked, CheckCircle2, Clock, BookOpen, Library, Check, PlayCircle, Lock } from "lucide-react"
import { SURAHS, formatQuranRange, getActivePlanDayNumber, getAdjustedPlanPreviewRange, getDisplayCompletedDays, getJuzCoverageFromRange, getJuzProgressDetailsFromRange, getPlanMemorizedRange, getPlanSessionContent, getPlanSupportSessionContent, getStoredMemorizedRange, hasScatteredCompletedJuzs, resolvePlanTotalDays, resolvePlanTotalPages } from "@/lib/quran-data"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { EffectSelector } from "@/components/effect-selector"
import { BadgeSelector } from "@/components/badge-selector"
import { FontSelector } from "@/components/font-selector"
import { SiteLoader } from "@/components/ui/site-loader"
import { isEvaluatedAttendance, translateAttendanceStatus } from "@/lib/student-attendance"
import { useVerifiedRoleAccess } from "@/hooks/use-verified-role-access"

interface StudentData {
  id: string
  name: string
  halaqah: string
  account_number: number
  id_number: string | null
  guardian_phone: string | null
  points: number
  rank: number | null
  created_at: string
  completed_juzs?: number[]
  current_juzs?: number[]
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  notes?: string | null
  is_compensation?: boolean
  hafiz_level: string | null
  tikrar_level: string | null
  samaa_level: string | null
  rabet_level: string | null
  hafiz_from_surah?: string | null
  hafiz_from_verse?: string | null
  hafiz_to_surah?: string | null
  hafiz_to_verse?: string | null
  samaa_from_surah?: string | null
  samaa_from_verse?: string | null
  samaa_to_surah?: string | null
  samaa_to_verse?: string | null
  rabet_from_surah?: string | null
  rabet_from_verse?: string | null
  rabet_to_surah?: string | null
  rabet_to_verse?: string | null
}

interface StudentAchievement {
  id: string
  title: string
  icon_type: string
  date: string
}

interface RankingData {
  globalRank: number
  circleRank: number
  circleSize: number
  circleName: string
  points: number
}

function ProfilePage() {
  const { isLoading: authLoading, isAuthorized, user } = useVerifiedRoleAccess(["student"])
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  // تحديث السجلات يدويًا
  const handleRefreshRecords = () => {
    if (studentData?.id) {
      fetchAttendanceRecords(studentData.id)
    }
  }

  // تحديث تلقائي عند العودة للصفحة
  useEffect(() => {
    const handleFocus = () => {
      if (studentData?.id) fetchAttendanceRecords(studentData.id)
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [studentData?.id])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams?.get("tab") || "profile")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [planCompletedDays, setPlanCompletedDays] = useState(0)
  const [planProgress, setPlanProgress] = useState(0)
  const [planAttendance, setPlanAttendance] = useState<any[]>([])
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [achievements, setAchievements] = useState<StudentAchievement[]>([])
  const confirmDialog = useConfirmDialog()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [themeUpdateTrigger, setThemeUpdateTrigger] = useState(0)

  useEffect(() => {
    if (!user) return
    void fetchStudentData(user.accountNumber)
  }, [user])

  useEffect(() => {
    const handleThemeChanged = () => {
      console.log("[v0] Theme changed event received, updating card preview")
      setThemeUpdateTrigger((prev) => prev + 1)
    }

    window.addEventListener("themeChanged", handleThemeChanged as EventListener)

    return () => {
      window.removeEventListener("themeChanged", handleThemeChanged as EventListener)
    }
  }, [])

  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const tab = event.detail.tab
      if (tab) {
        setActiveTab(tab)
      }
    }

    window.addEventListener("tabChange", handleTabChange as EventListener)
    return () => {
      window.removeEventListener("tabChange", handleTabChange as EventListener)
    }
  }, [])

  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const fetchStudentData = async (accountNumber: string) => {
    try {
      console.log("[v0] Fetching student data for account:", accountNumber)

      const response = await fetch(`/api/students?account_number=${accountNumber}`, { cache: "no-store" })
      const data = await response.json()

      const student = (data.students || [])[0]

      if (student) {
        setStudentData(student)
        fetchRankingData(student.id)
        fetchAttendanceRecords(student.id)
        fetchAchievements(student.id)
        fetchPlanData(student.id)
      }
      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
      setIsLoading(false)
    }
  }

  const fetchRankingData = async (studentId: string) => {
    try {
      const response = await fetch(`/api/student-ranking?student_id=${studentId}`)
      const data = await response.json()

      if (data.success && data.ranking) {
        setRankingData(data.ranking)
        console.log("[v0] Ranking data fetched:", data.ranking)
      }
    } catch (error) {
      console.error("[v0] Error fetching ranking data:", error)
    }
  }

  const fetchAchievements = async (studentId: string) => {
    try {
      const res = await fetch(`/api/achievements?student_id=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setAchievements(data.achievements || [])
      }
    } catch (e) {
      console.error("[profile] Error fetching achievements:", e)
    }
  }

  const renderAchievementIcon = (type: string, cls = "w-5 h-5") => {
    const color = "text-[#d8a355]"
    switch (type) {
      case "medal":  return <Medal  className={`${cls} ${color}`} />
      case "gem":    return <Gem    className={`${cls} ${color}`} />
      case "star":   return <Star   className={`${cls} ${color} fill-[#d8a355]/40`} />
      case "flame":  return <Flame  className={`${cls} ${color}`} />
      case "zap":    return <Zap    className={`${cls} ${color}`} />
      case "crown":  return <Crown      className={`${cls} ${color}`} />
      case "heart":  return <Heart      className={`${cls} ${color}`} />
      case "book":   return <BookMarked className={`${cls} ${color}`} />
      default:       return <Trophy className={`${cls} ${color}`} />
    }
  }

  const fetchPlanData = async (studentId: string) => {
    setIsLoadingPlan(true)
    try {
      const res = await fetch(`/api/student-plans?student_id=${studentId}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log("[profile] plan data:", data)
      setPlanData(data.plan ?? null)
      setPlanCompletedDays(data.completedDays ?? 0)
      setPlanProgress(data.progressPercent ?? 0)
      setPlanAttendance(data.completedRecords ?? [])

      // منح إنجاز تلقائي عند اكتمال الخطة 100%
      if ((data.progressPercent ?? 0) >= 100 && data.plan) {
        const plan = data.plan
        const adjustedPlanPreview = getAdjustedPlanPreviewRange({
          startSurahNumber: plan.start_surah_number,
          startVerseNumber: Number(plan.start_verse) || 1,
          endSurahNumber: plan.end_surah_number,
          endVerseNumber: Number(plan.end_verse) || SURAHS.find((surah) => surah.number === plan.end_surah_number)?.verseCount || 1,
          dailyPages: Number(plan.daily_pages) || 0,
          direction: (plan.direction as "asc" | "desc") || "asc",
          prevStartSurah: plan.prev_start_surah,
          prevStartVerse: plan.prev_start_verse,
          prevEndSurah: plan.prev_end_surah,
          prevEndVerse: plan.prev_end_verse,
          completedJuzs: plan.completed_juzs || studentData?.completed_juzs || [],
        })
        const adjustedStartSurahName = SURAHS.find((surah) => surah.number === adjustedPlanPreview.startSurahNumber)?.name || plan.start_surah_name
        const adjustedEndSurahName = SURAHS.find((surah) => surah.number === adjustedPlanPreview.endSurahNumber)?.name || plan.end_surah_name
        const descKey = `plan_${plan.id}`
        const achRes = await fetch(`/api/achievements?student_id=${studentId}`)
        if (achRes.ok) {
          const achData = await achRes.json()
          const existing = (achData.achievements || []).find((a: any) => a.description === descKey)
          if (!existing) {
            await fetch("/api/achievements", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                student_id: studentId,
                title: `إنجاز خطة (${adjustedStartSurahName} إلى ${adjustedEndSurahName})`,
                category: "خطة حفظ",
                date: new Date().toISOString().split("T")[0],
                description: descKey,
                status: "مكتمل",
                level: "ممتاز",
                icon_type: "book",
                achievement_type: "personal",
              }),
            })
            // تحديث قائمة الإنجازات بعد الإضافة
            fetchAchievements(studentId)
          } else {
            setAchievements(achData.achievements || [])
          }
        }
      }
    } catch (e) {
      console.error("[profile] Error fetching plan:", e)
      setPlanData(null)
    } finally {
      setIsLoadingPlan(false)
    }
  }

  const fetchAttendanceRecords = async (studentId: string) => {
    setIsLoadingRecords(true)
    try {
      const response = await fetch(`/api/attendance?student_id=${studentId}`)
      const data = await response.json()

      if (data.records) {
        setAttendanceRecords(data.records)
      }
    } catch (error) {
      console.error("[v0] Error fetching attendance records:", error)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: "تأكيد تسجيل الخروج",
      description: "هل أنت متأكد من أنك تريد تسجيل الخروج؟",
      confirmText: "نعم، تسجيل الخروج",
      cancelText: "إلغاء",
    })

    if (confirmed) {
      setIsLoggingOut(true)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      try {
        await fetch("/api/auth", { method: "DELETE" })
      } catch {}

      localStorage.clear()
      router.push("/login")
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  if (!studentData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-[#1a2332]">لم يتم العثور على بيانات الطالب.</div>
        </main>
        <Footer />
      </div>
    )
  }

  function getEvaluationText(level: string | null) {
    switch (level) {
      case null:
      case "not_completed":
        return "لم يكمل"
      case "excellent":
        return "ممتاز"
      case "good":
        return "جيد"
      case "average":
        return "متوسط"
      case "weak":
        return "ضعيف"
      default:
        return level
    }
  }

  function formatReadingRange(fromSurah?: string | null, fromVerse?: string | null, toSurah?: string | null, toVerse?: string | null) {
    return formatQuranRange(fromSurah, fromVerse, toSurah, toVerse)
  }

  function formatPlanSessionRange(fromSurah?: string | null, fromVerse?: string | null, toSurah?: string | null, toVerse?: string | null, fallbackText?: string | null) {
    if (fallbackText?.trim()) return fallbackText
    return formatQuranRange(fromSurah, fromVerse, toSurah, toVerse) || "-"
  }

  const normalizedPlanData = planData
    ? {
        ...planData,
        completed_juzs: planData.completed_juzs || studentData?.completed_juzs || [],
        has_previous: planData.has_previous || !!(planData.prev_start_surah || studentData?.memorized_start_surah),
        prev_start_surah: planData.prev_start_surah || studentData?.memorized_start_surah || null,
        prev_start_verse: planData.prev_start_verse || studentData?.memorized_start_verse || null,
        prev_end_surah: planData.prev_end_surah || studentData?.memorized_end_surah || null,
        prev_end_verse: planData.prev_end_verse || studentData?.memorized_end_verse || null,
      }
    : null

  const memorizedRange = normalizedPlanData
    ? getPlanMemorizedRange(normalizedPlanData, planCompletedDays)
    : hasScatteredCompletedJuzs(studentData?.completed_juzs)
      ? null
      : getStoredMemorizedRange(studentData)

  const { completedJuzs, currentJuzs } = getJuzCoverageFromRange(memorizedRange)
  const juzProgressDetails = getJuzProgressDetailsFromRange(
    memorizedRange,
    studentData?.completed_juzs,
    studentData?.current_juzs,
  )

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center">
            <p className="text-xl font-bold text-[#d8a355]">جاري تسجيل الخروج...</p>
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />

        <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
          <div className="container mx-auto max-w-6xl">
            {/* قسم البيانات - موحد */}
            <div className="w-full bg-white rounded-xl shadow-md border border-[#d8a355]/20 overflow-hidden mb-3 md:mb-6">
              <div className="px-4 py-2 border-b border-[#d8a355]/20 bg-gradient-to-r from-[#d8a355]/10 to-transparent">
                <span className="text-sm font-bold text-[#1a2332]">البيانات</span>
              </div>
              <div className="grid grid-cols-5 divide-x divide-x-reverse divide-[#d8a355]/15 border-b border-[#d8a355]/15">
                  {[
                    { value: "profile",      icon: <User       className="w-5 h-5" />, label: "الملف"      },
                    { value: "achievements", icon: <Award      className="w-5 h-5" />, label: "الإنجازات"  },
                    { value: "records",      icon: <BarChart3  className="w-5 h-5" />, label: "السجلات"    },
                    { value: "plan",         icon: <BookMarked className="w-5 h-5" />, label: "الخطة"      },
                    { value: "archive",      icon: <Library className="w-5 h-5" />, label: "المحفوظ"    },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setActiveTab(item.value)}
                      className={`flex flex-col items-center justify-center gap-1 py-3 text-xs font-bold transition-colors ${
                        activeTab === item.value
                          ? "text-[#d8a355] bg-[#d8a355]/8"
                          : "text-[#1a2332]/50 hover:text-[#d8a355] hover:bg-[#d8a355]/5"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

              <TabsContent value="profile" className="space-y-4 md:space-y-6">
                <Card className="rounded-none border-0 shadow-none">
                  <CardHeader className="bg-white p-4 md:p-6">
                    <CardTitle className="text-xl md:text-2xl text-[#1a2332]">البيانات الشخصية</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 md:pt-3 space-y-4 md:space-y-6">
                    {/* بيانات الطالب */}
                    <div className="grid grid-cols-2 gap-3 pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">رقم الحساب</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.account_number}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">الاسم الكامل</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.name}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">الحلقة</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.halaqah || "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">رقم الهوية</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.id_number || "غير محدد"}
                        </div>
                      </div>
                      {studentData.guardian_phone && (
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-semibold text-[#1a2332]/60">رقم جوال ولي الأمر</label>
                          <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20" dir="ltr">
                            {studentData.guardian_phone}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Theme Switcher Section */}
                    <div className="pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <ThemeSwitcher studentId={studentData?.id} />
                    </div>

                    {/* Effect Selector Section */}
                    <div className="pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <EffectSelector studentId={studentData?.id} />
                    </div>

                    {/* Badge Selector Section */}
                    <div className="pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <BadgeSelector studentId={studentData?.id} />
                    </div>

                    {/* Font Selector Section */}
                    <div className="pb-2">
                      <FontSelector studentId={studentData?.id} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-6">
                <Card className="rounded-none border-0 shadow-none">
                  <CardContent className="pt-6">
                    {achievements.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="w-24 h-24 mx-auto mb-4 opacity-40" style={{ color: "#d8a355" }} />
                        <p className="text-2xl font-bold text-[#c99347] mb-2">لاتوجد إنجازات حاليا</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {achievements.map((ach) => (
                          <div
                            key={ach.id}
                            className="flex items-center gap-3 p-4 rounded-xl border-2 bg-white"
                            style={{ borderColor: "#d8a35533" }}
                          >
                            <div className="w-11 h-11 rounded-full bg-[#d8a355]/10 border border-[#d8a355]/30 flex items-center justify-center shrink-0">
                              {renderAchievementIcon(ach.icon_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#1a2332] truncate">{ach.title}</p>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {new Date(ach.date).toLocaleDateString("ar-SA")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="records" className="space-y-4">
                <Card className="rounded-none border-0 shadow-none">
                  <CardHeader className="bg-white">
                    <CardTitle className="text-2xl font-bold text-[#c99347]">سجلات الحضور والتقييم</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {isLoadingRecords ? (
                      <div className="flex justify-center py-8">
                        <SiteLoader size="md" color="#d8a355" />
                      </div>
                    ) : attendanceRecords.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar
                          className="w-24 h-24 mx-auto mb-4 opacity-40"
                          style={{ color: "#d8a355" }}
                        />
                        <p className="text-2xl font-bold text-[#c99347] mb-2">لا توجد سجلات حضور حالياً</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {attendanceRecords.map((record) => (
                          <div
                            key={record.id}
                            className="p-4 bg-white rounded-2xl border-2 shadow-md flex flex-col gap-3"
                            style={{ borderColor: `#d8a35533` }}
                          >
                            <div className="flex flex-row justify-between items-center mb-2">
                              <div>
                                <span className="text-base font-bold text-[#c99347]">التاريخ: </span>
                                <span className="text-lg font-extrabold text-[#1a2332] tracking-wide">
                                  {new Date(record.date).toLocaleDateString("ar-SA")}
                                </span>
                                {record.is_compensation && (
                                  <span className="mr-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                    نجح بتعويض
                                  </span>
                                )}
                              </div>
                              <Badge
                                className={
                                  record.status === "present"
                                    ? "bg-green-100 text-green-800 text-base font-bold px-3 py-1"
                                    : record.status === "late"
                                    ? "bg-orange-100 text-orange-800 text-base font-bold px-3 py-1"
                                    : record.status === "excused"
                                    ? "bg-yellow-100 text-yellow-800 text-base font-bold px-3 py-1"
                                    : "bg-red-100 text-red-800 text-base font-bold px-3 py-1"
                                }
                              >
                                {translateAttendanceStatus(record.status)}
                              </Badge>
                            </div>
                            {record.notes && (
                              <div className="rounded-xl bg-[#faf7f0] px-3 py-2 text-sm font-medium text-[#7a6743] border border-[#d8a355]/15">
                                {record.notes}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">الحفظ</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.hafiz_level)}
                                </span>
                                {formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse) && (
                                  <span className="text-[11px] text-neutral-500 mt-1 leading-4">
                                    {formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">التكرار</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.tikrar_level)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">المراجعة</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.samaa_level)}
                                </span>
                                {formatReadingRange(record.samaa_from_surah, record.samaa_from_verse, record.samaa_to_surah, record.samaa_to_verse) && (
                                  <span className="text-[11px] text-neutral-500 mt-1 leading-4">
                                    {formatReadingRange(record.samaa_from_surah, record.samaa_from_verse, record.samaa_to_surah, record.samaa_to_verse)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">الربط</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.rabet_level)}
                                </span>
                                {formatReadingRange(record.rabet_from_surah, record.rabet_from_verse, record.rabet_to_surah, record.rabet_to_verse) && (
                                  <span className="text-[11px] text-neutral-500 mt-1 leading-4">
                                    {formatReadingRange(record.rabet_from_surah, record.rabet_from_verse, record.rabet_to_surah, record.rabet_to_verse)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="plan" className="space-y-4">
                {isLoadingPlan ? (
                  <div className="flex justify-center py-12">
                    <SiteLoader size="md" color="#d8a355" />
                  </div>
                ) : !planData ? (
                  <div className="text-center py-14">
                    <BookMarked className="w-20 h-20 mx-auto mb-4 opacity-30" style={{ color: "#d8a355" }} />
                    <p className="text-xl font-bold text-[#c99347] mb-2">لا توجد خطة حفظ حالياً</p>
                    <p className="text-sm text-[#1a2332]/40">سيتم إضافة خطة حفظ من قِبل المشرف</p>
                  </div>
                ) : (() => {
                  const daily = planData.daily_pages as number
                  const totalDays = resolvePlanTotalDays(planData)
                  const totalPages = resolvePlanTotalPages(planData)
                  const adjustedPlanPreview = getAdjustedPlanPreviewRange({
                    startSurahNumber: planData.start_surah_number,
                    startVerseNumber: Number(planData.start_verse) || 1,
                    endSurahNumber: planData.end_surah_number,
                    endVerseNumber: Number(planData.end_verse) || SURAHS.find((surah) => surah.number === planData.end_surah_number)?.verseCount || 1,
                    dailyPages: Number(planData.daily_pages) || 0,
                    direction: (planData.direction as "asc" | "desc") || "asc",
                    prevStartSurah: planData.prev_start_surah,
                    prevStartVerse: planData.prev_start_verse,
                    prevEndSurah: planData.prev_end_surah,
                    prevEndVerse: planData.prev_end_verse,
                    completedJuzs: planData.completed_juzs || studentData?.completed_juzs || [],
                  })
                  const planFromSurah = SURAHS.find((surah) => surah.number === adjustedPlanPreview.startSurahNumber)?.name || planData.start_surah_name
                  const planToSurah = SURAHS.find((surah) => surah.number === adjustedPlanPreview.endSurahNumber)?.name || planData.end_surah_name
                  // بناء قائمة كل الأيام
                  const allDays = Array.from({ length: totalDays }, (_, i) => {
                    const dayNum = i + 1
                    const sessionContent = getPlanSessionContent(planData, dayNum)

                    let label = ""
                    if (daily === 0.25) {
                      const wajh = Math.ceil(dayNum / 4);
                      const quarterNum = ((dayNum - 1) % 4) + 1;
                      label = `الوجه ${wajh} — الربع ${quarterNum}`;
                    } else if (daily === 0.5) {
                      const wajh = Math.ceil(dayNum / 2)
                      label = (dayNum % 2 === 1) ? `الوجه ${wajh} — النصف الأول` : `الوجه ${wajh} — النصف الثاني`
                    } else if (daily === 1) {
                      label = `الوجه ${dayNum}`
                    } else if (daily === 2) {
                      label = `الوجه ${(dayNum - 1) * 2 + 1} – ${dayNum * 2}`
                    } else if (daily === 3) {
                      label = `الأوجه ${(dayNum - 1) * 3 + 1} – ${dayNum * 3}`
                    } else {
                      label = `${daily} أوجه`
                    }

                    const completed = planAttendance[i] || null
                    return { dayNum, label, sessionContent, completed }
                  })

                                    const displayCompletedDays = getDisplayCompletedDays(planCompletedDays, planData.start_date);
                                    const activeDayNum = getActivePlanDayNumber(totalDays, planCompletedDays, planData.start_date, planData.created_at);
                  
                  const { muraajaa: muraajaaContent, rabt: rabtContent } = normalizedPlanData
                    ? getPlanSupportSessionContent(normalizedPlanData, planCompletedDays)
                    : { muraajaa: null, rabt: null }

                  return (
                    <>
                      {/* رأس الخطة: النص + مربعَي المراجعة والربط */}
                      <div className="bg-white rounded-2xl border-2 px-4 py-4 shadow-sm flex flex-row-reverse items-center justify-between gap-3" style={{ borderColor: "#d8a35530" }}>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-[11px] text-[#c99347]/70 font-semibold mb-0.5">خطة الحفظ</p>
                          <p className="text-base font-black text-[#1a2332] leading-snug">
                            من سورة {planFromSurah} إلى سورة {planToSurah}
                          </p>
                          <div className="mt-3 max-w-md mr-0 ml-auto">
                            <div className="flex items-center justify-end text-[11px] font-semibold text-[#8b6b3f] mb-1.5">
                              <span>{Math.round(planProgress)}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-[#d8a355]/12 overflow-hidden flex justify-end">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(0, Math.min(100, planProgress))}%`,
                                  background: "linear-gradient(270deg, #e8c27a 0%, #d8a355 55%, #c99347 100%)",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                          const todayRecord = attendanceRecords.find(r => r.date === todayDateStr);
                          const isMuraajaaCompleted = isEvaluatedAttendance(todayRecord?.status) && todayRecord?.samaa_level && todayRecord?.samaa_level !== "not_completed";
                          const isRabtCompleted = isEvaluatedAttendance(todayRecord?.status) && todayRecord?.rabet_level && todayRecord?.rabet_level !== "not_completed";

                          return (muraajaaContent || rabtContent) ? (
                            <div className="flex flex-row-reverse gap-2 shrink-0 max-w-[55%]">
                              {rabtContent && (
                                <div className={`flex flex-col relative items-center justify-center text-center border rounded-xl px-3 py-2 min-w-[75px] transition-all ${isRabtCompleted ? "bg-emerald-50 border-emerald-200" : "bg-blue-50/50 border-blue-200/50"}`}>
                                  {isRabtCompleted && <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-0.5 shadow-sm"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                                  <p className={`text-[9px] font-bold mb-0.5 ${isRabtCompleted ? "text-emerald-700" : "text-blue-600/70"}`}>ربط اليوم</p>
                                  <p className="text-[11px] font-bold text-slate-800 line-clamp-1" dir="rtl">{rabtContent.text}</p>
                                  <span className={`text-[8px] font-medium mt-1 px-1.5 py-[1px] rounded-md ${isRabtCompleted ? "bg-emerald-100/50 text-emerald-600" : "bg-neutral-100 text-neutral-400"}`}>{isRabtCompleted ? "مكتمل" : "لم يُنجز بعد"}</span>
                                </div>
                              )}
                              {muraajaaContent && (
                                <div className={`flex flex-col relative items-center justify-center text-center border rounded-xl px-3 py-2 min-w-[75px] transition-all ${isMuraajaaCompleted ? "bg-emerald-50 border-emerald-200" : "bg-purple-50/50 border-purple-200/50"}`}>
                                  {isMuraajaaCompleted && <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-0.5 shadow-sm"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                                  <p className={`text-[9px] font-bold mb-0.5 ${isMuraajaaCompleted ? "text-emerald-700" : "text-purple-600/70"}`}>مراجعة اليوم</p>
                                  <p className="text-[11px] font-bold text-slate-800 line-clamp-1" dir="rtl">{muraajaaContent.text}</p>
                                  <span className={`text-[8px] font-medium mt-1 px-1.5 py-[1px] rounded-md ${isMuraajaaCompleted ? "bg-emerald-100/50 text-emerald-600" : "bg-neutral-100 text-neutral-400"}`}>{isMuraajaaCompleted ? "مكتمل" : "لم يُنجز بعد"}</span>
                                </div>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* الجدول الزمني لكل الأيام */}
                      <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: "#d8a35526" }}>
                        <div className="px-5 py-4 border-b border-[#d8a355]/20 flex items-center justify-between">
                          <h4 className="font-bold text-[#1a2332]">جدول الخطة</h4>
                          <span className="text-xs text-neutral-400">{daily === 0.25 ? "ربع وجه يومياً" : daily === 0.5 ? "نصف وجه يومياً" : daily === 1 ? "وجه يومياً" : daily === 2 ? "وجهان يومياً" : daily === 3 ? "ثلاثة أوجه يومياً" : `${daily} أوجه يومياً`}</span>
                        </div>
                        <div className="relative">
                          {/* خط التسلسل */}
                          <div className="absolute right-[28px] top-0 bottom-0 w-0.5 bg-[#d8a355]/15" />
                          <div className="space-y-0">
                            {allDays.map(({ dayNum, label, sessionContent, completed }) => {
                              const isNext = !completed && dayNum === displayCompletedDays + 1
                              const hijriDate = completed
                                ? new Date(completed.date).toLocaleDateString("ar-SA-u-ca-islamic", { day: "numeric", month: "long" })
                                : null
                              return (
                                <div
                                  key={dayNum}
                                  className={`flex items-start gap-3 px-4 py-3 relative transition-colors ${
                                    completed ? "bg-emerald-50/40" : isNext ? "bg-[#d8a355]/5" : ""
                                  }`}
                                >
                                  {/* الأيقونة */}
                                  <div className="shrink-0 mt-0.5 z-10">
                                    {completed ? (
                                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                      </div>
                                    ) : isNext ? (
                                      <div className="w-7 h-7 rounded-full border-2 border-[#d8a355] bg-white flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#d8a355] animate-pulse" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full border-2 border-neutral-200 bg-white flex items-center justify-center">
                                        <span className="text-[9px] font-bold text-neutral-300">{dayNum}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* المحتوى */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm font-bold ${completed ? "text-emerald-700" : isNext ? "text-[#c99347]" : "text-neutral-400"}`}>
                                        {label}
                                      </p>
                                      {isNext && (
                                        <span className="text-[10px] bg-[#d8a355]/15 text-[#c99347] px-1.5 py-0.5 rounded-full font-semibold">التالي</span>
                                      )}
                                    </div>
                                    <p className={`text-[11px] mt-0.5 ${completed ? "text-emerald-600/70" : "text-neutral-400"}`}>
                                      {formatPlanSessionRange(
                                        sessionContent?.fromSurah,
                                        sessionContent?.fromVerse,
                                        sessionContent?.toSurah,
                                        sessionContent?.toVerse,
                                        sessionContent?.text,
                                      )}
                                    </p>
                                  </div>
                                  {/* التاريخ */}
                                  {hijriDate && (
                                    <div className="shrink-0 text-right">
                                      <p className="text-[11px] font-semibold text-emerald-600">{hijriDate}</p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </TabsContent>
              
              <TabsContent value="archive" className="space-y-4 md:space-y-6">
                <Card className="rounded-none border-0 shadow-none">
                  <CardHeader className="bg-white p-4 md:p-6">
                    <CardTitle className="text-xl md:text-2xl text-[#1a2332]">السجل الشامل للمحفوظ</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 md:pt-3 space-y-4 md:space-y-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                        const juzProgress = juzProgressDetails.get(juzNum)
                        const progressPercent = juzProgress ? Math.round(juzProgress.progressPercent * 10) / 10 : 0
                        const isCompleted = (studentData?.completed_juzs?.includes(juzNum) ?? false) || completedJuzs.has(juzNum) || progressPercent >= 100;
                        const isCurrent = (!isCompleted && progressPercent > 0) || ((!isCompleted && currentJuzs.has(juzNum)) || (!!studentData?.current_juzs?.includes(juzNum) && !isCompleted));
                        
                        let bgColor = "bg-white";
                        let borderColor = "border-[#d8a355]/20";
                        let textColor = "text-[#1a2332]/50";
                        let statusText = "لم يبدأ";

                        if (isCompleted) {
                          bgColor = "bg-[#d8a355]/10";
                          borderColor = "border-[#d8a355]";
                          textColor = "text-[#d8a355]";
                          statusText = "مكتمل";
                        } else if (isCurrent) {
                          bgColor = "bg-[#0f766e]/5";
                          borderColor = "border-[#0f766e]/30";
                          textColor = "text-[#0f766e]";
                          statusText = `محفوظ ${progressPercent}%`;
                        }

                        return (
                          <div key={juzNum} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border ${borderColor} ${bgColor} transition-all hover:scale-[1.03]`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${isCompleted ? 'bg-[#d8a355]/20' : (isCurrent ? 'bg-[#0f766e]/10' : 'bg-gray-100')}`}>
                              <span className={`text-lg font-bold ${textColor}`}>{juzNum}</span>
                            </div>
                            <span className={`text-xs font-bold ${textColor}`}>الجزء {juzNum}</span>
                            <div className="mt-2 w-full space-y-1">
                              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full rounded-full transition-all ${isCompleted ? 'bg-[#d8a355]' : isCurrent ? 'bg-[#0f766e]' : 'bg-gray-200'}`}
                                  style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                                />
                              </div>
                              <div className="text-center text-[10px] text-gray-500">
                                <span>{statusText}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              </Tabs>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}

export default function ProfilePageWrapper() {
  return (
    <Suspense fallback={null}>
      <ProfilePage />
    </Suspense>
  )
}
