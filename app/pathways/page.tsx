"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { BookOpen, Check, Lock, Star, Trophy } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { useVerifiedRoleAccess } from "@/hooks/use-verified-role-access"

type PathwayLevelRow = {
  id?: number
  level_number: number
  title?: string | null
  description?: string | null
  is_locked?: boolean | null
  points?: number | null
  halaqah?: string | null
}

type PathwayLevel = {
  id: number
  title: string
  description: string
  isLocked: boolean
  isCompleted: boolean
  userPoints: number
}

function isUuid(value: string | null | undefined) {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default function PathwaysPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthorized, user } = useVerifiedRoleAccess(["student"])

  const [levels, setLevels] = useState<PathwayLevel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthorized || !user) {
      setIsLoading(false)
      return
    }

    const verifiedUser = user

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    async function resolveStudentId() {
      const currentUserStr = localStorage.getItem("currentUser")
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null

      const storedStudentId = localStorage.getItem("studentId")
      if (isUuid(storedStudentId)) {
        return storedStudentId
      }

      const accountNumber = verifiedUser.accountNumber || currentUser?.account_number || currentUser?.id
      if (!accountNumber) {
        return null
      }

      const { data: studentRow } = await supabase
        .from("students")
        .select("id")
        .eq("account_number", Number(accountNumber))
        .maybeSingle()

      if (studentRow?.id) {
        const normalizedId = String(studentRow.id)
        localStorage.setItem("studentId", normalizedId)
        return normalizedId
      }

      return null
    }

    async function fetchLevels(studentHalaqah?: string) {
      let query = supabase.from("pathway_levels").select("id, level_number, title, description, is_locked, points, halaqah")

      if (studentHalaqah) {
        query = query.eq("halaqah", studentHalaqah)
      }

      const { data, error } = await query.order("level_number")

      if (error) {
        throw error
      }

      return (data || []) as PathwayLevelRow[]
    }

    async function loadPathwayData() {
      const currentUserStr = localStorage.getItem("currentUser")
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null
      const studentHalaqah = verifiedUser.halaqah || currentUser?.halaqah || undefined

      const [studentId, levelsFromDb] = await Promise.all([resolveStudentId(), fetchLevels(studentHalaqah)])

      let completedMap: Record<number, number> = {}

      if (studentId) {
        const { data: completions } = await supabase
          .from("pathway_level_completions")
          .select("level_number, points")
          .eq("student_id", studentId)

        completedMap = (completions || []).reduce<Record<number, number>>((accumulator, completion) => {
          accumulator[completion.level_number] = completion.points ?? 0
          return accumulator
        }, {})
      }

      const processedLevels = levelsFromDb.map((level) => {
        const isCompleted = Object.prototype.hasOwnProperty.call(completedMap, level.level_number)

        return {
          id: level.level_number,
          title: level.title || `المستوى ${level.level_number}`,
          description: level.description || "",
          isLocked: level.is_locked === true,
          isCompleted,
          userPoints: isCompleted ? completedMap[level.level_number] : Number(level.points ?? 100),
        }
      })

      setLevels(processedLevels)
    }

    void loadPathwayData()
      .catch((error) => {
        console.error("[pathways] Failed to load pathways:", error)
        setLevels([])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [authLoading, isAuthorized, user])

  const completedLevelsCount = levels.filter((level) => level.isCompleted).length
  const totalPoints = levels
    .filter((level) => level.isCompleted)
    .reduce((sum, level) => sum + Number(level.userPoints || 0), 0)
  const progressPercentage = levels.length > 0 ? Math.round((completedLevelsCount / levels.length) * 100) : 0

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#d8a355]" />
              <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المسار</h1>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-[#00312e] via-[#023232] to-[#001a18] rounded-2xl md:rounded-3xl p-6 md:p-10 mb-8 md:mb-12 text-white shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#d8a355]/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#d8a355]/8 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 items-center">
              <div className="md:col-span-2">
                <div className="flex items-center mb-4">
                  <p className="text-sm md:text-base font-bold tracking-wide opacity-90">التقدم في المسار</p>
                </div>

                <div className="relative h-7 md:h-9 bg-black/30 rounded-full overflow-hidden border border-white/10 shadow-inner">
                  <div
                    className="absolute right-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${progressPercentage}%`,
                      background: "linear-gradient(90deg, #b8843a 0%, #d8a355 50%, #f5c96a 100%)",
                      boxShadow: "0 0 18px 3px rgba(216,163,85,0.5)",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                  </div>

                  {[25, 50, 75].map((milestone) => (
                    <div
                      key={milestone}
                      className="absolute top-1 bottom-1 w-px bg-white/20"
                      style={{ right: `${100 - milestone}%` }}
                    />
                  ))}
                </div>

                <div className="flex justify-between mt-2 px-1">
                  {[0, 25, 50, 75, 100].map((milestone) => (
                    <span key={milestone} className="text-[10px] md:text-xs opacity-40 font-medium">
                      {milestone}%
                    </span>
                  ))}
                </div>

              </div>

              <div className="flex flex-col items-center justify-center p-4 md:p-6">
                <Trophy className="w-12 h-12 md:w-16 md:h-16 mb-4 text-[#f4d03f] drop-shadow-[0_0_14px_rgba(244,208,63,0.5)]" strokeWidth={2.1} />

                <div
                  className="text-5xl md:text-6xl font-black leading-none tracking-tight"
                  style={{ color: "#f5c96a", textShadow: "0 0 30px rgba(216,163,85,0.6), 0 2px 0 rgba(0,0,0,0.4)" }}
                >
                  {totalPoints}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-6 h-px bg-[#d8a355]/40" />
                  <p className="text-xs md:text-sm font-semibold tracking-widest opacity-70">نقطة</p>
                  <div className="w-6 h-px bg-[#d8a355]/40" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {levels.map((level) => (
              <div
                key={level.id}
                onClick={() => !level.isLocked && !level.isCompleted && router.push(`/pathways/level/${level.id}`)}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
                  level.isCompleted
                    ? "cursor-not-allowed"
                    : level.isLocked
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-[#d8a355]/20"
                }`}
                style={{
                  minHeight: "280px",
                  background: level.isCompleted
                    ? "linear-gradient(160deg, #f5f0e8 0%, #efe8d8 100%)"
                    : level.isLocked
                      ? "linear-gradient(160deg, #f4f4f4 0%, #e8e8e8 100%)"
                      : "linear-gradient(160deg, #ffffff 0%, #fdf8f0 100%)",
                  border: level.isCompleted
                    ? "1.5px solid rgba(216,163,85,0.4)"
                    : level.isLocked
                      ? "1.5px solid rgba(0,0,0,0.08)"
                      : "1.5px solid rgba(216,163,85,0.35)",
                  boxShadow: level.isLocked ? "none" : "0 2px 12px rgba(216,163,85,0.08)",
                }}
              >
                <div
                  className="h-1 w-full"
                  style={{
                    background: level.isCompleted
                      ? "linear-gradient(90deg, #d8a355, #f5c96a, #d8a355)"
                      : level.isLocked
                        ? "#d1d5db"
                        : "linear-gradient(90deg, #d8a355, #f5c96a)",
                    opacity: level.isLocked ? 0.5 : 1,
                  }}
                />

                <div className="flex flex-col flex-1 p-5 md:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-black text-xl md:text-2xl flex-shrink-0"
                      style={{
                        background: level.isCompleted
                          ? "linear-gradient(145deg, #d8a355, #b8843a)"
                          : level.isLocked
                            ? "#e5e7eb"
                            : "linear-gradient(145deg, #f5c96a, #d8a355)",
                        color: level.isLocked ? "#9ca3af" : level.isCompleted ? "#ffffff" : "#3d2000",
                        boxShadow: level.isLocked ? "none" : "0 2px 8px rgba(216,163,85,0.35)",
                      }}
                    >
                      {level.id}
                    </div>

                    {level.isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-[#d8a355] flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}

                    {level.isLocked && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>

                  <h3 className={`text-base md:text-lg font-bold leading-tight mb-1 ${level.isLocked ? "text-gray-400" : "text-[#1a2332]"}`}>
                    {level.title}
                  </h3>

                  <p className={`text-xs md:text-sm leading-relaxed line-clamp-2 flex-1 ${level.isLocked ? "text-gray-300" : "text-gray-400"}`}>
                    {level.description}
                  </p>

                  <div className="mt-auto pt-3">
                    <div className="flex items-center gap-1 mb-3">
                      <Star
                        className={`w-4 h-4 ${level.isLocked ? "text-gray-300 fill-gray-300" : "text-[#f4d03f] fill-[#f4d03f] drop-shadow-[0_0_4px_rgba(244,208,63,0.35)]"}`}
                        strokeWidth={1.8}
                      />
                      <span className={`text-sm font-bold ${level.isLocked ? "text-gray-300" : "text-[#d8a355]"}`}>
                        {level.userPoints} نقطة
                      </span>
                    </div>

                    {level.isCompleted ? (
                      <div className="w-full h-10 md:h-11 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold text-[#d8a355] bg-[#d8a355]/10 border border-[#d8a355]/25">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        مكتمل
                      </div>
                    ) : level.isLocked ? (
                      <div className="w-full h-10 md:h-11 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-300 bg-gray-100">
                        مقفل
                      </div>
                    ) : (
                      <Button
                        className="w-full h-10 md:h-11 rounded-lg text-sm font-bold text-[#3d2000] transition-all duration-200 group-hover:shadow-md bg-transparent hover:bg-transparent"
                        style={{ background: "linear-gradient(135deg, #f5c96a 0%, #d8a355 100%)" }}
                      >
                        ابدأ الآن
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
