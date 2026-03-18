"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getDefaultLeaderboardTheme, getLockedLeaderboardTheme, isLockedLeaderboardRank } from "@/lib/leaderboard-rank-theme"
import { MonitorPlay, X } from "lucide-react"

type StudentRow = {
  id: string
  points?: number | null
  halaqah?: string | null
}

type CircleRank = {
  name: string
  points: number
  students: number
}

function getCircleTheme(index: number) {
  if (isLockedLeaderboardRank(index)) {
    return getLockedLeaderboardTheme(index)
  }

  return getDefaultLeaderboardTheme()
}

export default function AllCirclesPage() {
  const [loading, setLoading] = useState(true)
  const [circles, setCircles] = useState<CircleRank[]>([])
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  useEffect(() => {
    if (!isAutoScrolling) {
      return
    }

    let animationFrameId: number
    let scrollDirection = 1
    let currentY = window.scrollY

    const scrollStep = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement

      if (scrollTop + clientHeight >= scrollHeight - 2) {
        scrollDirection = -1
      } else if (scrollTop <= 0) {
        scrollDirection = 1
      }

      currentY += scrollDirection * 0.3
      window.scrollTo(0, currentY)
      animationFrameId = requestAnimationFrame(scrollStep)
    }

    animationFrameId = requestAnimationFrame(scrollStep)

    return () => cancelAnimationFrame(animationFrameId)
  }, [isAutoScrolling])

  useEffect(() => {
    async function fetchAllCircles() {
      try {
        const response = await fetch("/api/students", { cache: "no-store" })
        const data = await response.json()
        const students = (data.students ?? []) as StudentRow[]
        const circleTotals = new Map<string, CircleRank>()

        for (const student of students) {
          const circleName = student.halaqah?.trim()
          if (!circleName) {
            continue
          }

          const currentCircle = circleTotals.get(circleName) ?? {
            name: circleName,
            points: 0,
            students: 0,
          }

          currentCircle.points += Number(student.points ?? 0)
          currentCircle.students += 1
          circleTotals.set(circleName, currentCircle)
        }

        const rankedCircles = Array.from(circleTotals.values()).sort((left, right) => {
          if (right.points !== left.points) {
            return right.points - left.points
          }

          if (right.students !== left.students) {
            return right.students - left.students
          }

          return left.name.localeCompare(right.name, "ar")
        })

        setCircles(rankedCircles)
      } catch (error) {
        console.error("Error fetching all circles:", error)
        setCircles([])
      } finally {
        setLoading(false)
      }
    }

    void fetchAllCircles()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-[#023232]">جاري التحميل...</div>
        </main>
        <Footer />
      </div>
    )
  }

  if (circles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-4">أفضل الحلقات</h1>
            <p className="text-xl text-gray-600">لا توجد حلقات تحتوي على نقاط حالياً</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      {!isAutoScrolling && <Header />}

      <main className="flex-1 py-8 md:py-16">
        <div className="container mx-auto px-3 md:px-4">
          <div className="text-center mb-8 md:mb-16">
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-r from-transparent to-[#d8a355]" />
              <div
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#d8a355] animate-pulse"
                style={{ animationDuration: "2s" }}
              />
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-l from-transparent to-[#d8a355]" />
            </div>

            <div className="relative inline-block">
              <div className="absolute inset-0 bg-[#d8a355]/5 blur-3xl rounded-full" />
              <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-bold text-[#00312e] px-4 md:px-6 py-2 leading-tight">
                أفضل الحلقات
              </h1>
            </div>

            <div className="flex items-center justify-center gap-2 md:gap-4 mt-4 md:mt-6">
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-r from-transparent to-[#d8a355]" />
              <div
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#d8a355] animate-pulse"
                style={{ animationDuration: "2s", animationDelay: "1s" }}
              />
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-l from-transparent to-[#d8a355]" />
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 gap-2 md:gap-3">
              {circles.map((circle, index) => {
                const themeColors = getCircleTheme(index)

                return (
                  <Link key={circle.name} href={`/halaqat/${encodeURIComponent(circle.name)}`}>
                    <div
                      className="group relative rounded-2xl md:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-opacity-70"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderColor: themeColors.primary,
                        backgroundImage: `radial-gradient(circle at 20% 80%, ${themeColors.primary}08 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${themeColors.secondary}06 0%, transparent 50%)`,
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 w-full h-1.5 md:h-2"
                        style={{
                          backgroundImage: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
                        }}
                      />

                      <div className="relative z-10 grid gap-4 p-4 md:grid-cols-[84px_minmax(0,1fr)_132px] md:items-center md:gap-5 md:p-6">
                        <div className="flex items-center justify-center md:justify-start">
                          <div
                            className="relative flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, ${themeColors.secondary}, ${themeColors.primary})`,
                              borderColor: `${themeColors.tertiary}66`,
                            }}
                          >
                            <div className="absolute inset-[4px] rounded-full border border-white/25" />
                            <div className="absolute h-2 w-2 rounded-full bg-white/30 top-2.5 right-2.5" />
                            <div className="text-center text-white">
                              <div className="text-xl font-black leading-none md:text-2xl">{index + 1}</div>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 text-center md:text-right">
                          <div className="flex items-center justify-center min-h-[48px] md:min-h-[58px] md:justify-start">
                            <h3 className="line-clamp-2 text-xl font-black tracking-tight text-[#12312f] transition-colors duration-300 group-hover:text-[#1f4b47] md:text-3xl md:text-right">
                              {circle.name}
                            </h3>
                          </div>
                        </div>

                        <div className="flex justify-center md:justify-end">
                          <div
                            className="min-w-[104px] rounded-[22px] border bg-white/90 px-4 py-3 text-center shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] backdrop-blur"
                            style={{ borderColor: `${themeColors.primary}88` }}
                          >
                            <div className="text-2xl font-black leading-none text-[#12312f] md:text-3xl">
                              {circle.points || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <button
        onClick={() => setIsAutoScrolling(!isAutoScrolling)}
        className={`fixed bottom-6 left-6 w-8 h-8 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center ${
          isAutoScrolling
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-[#d8a355] hover:bg-[#c99347] text-white opacity-50 hover:opacity-100"
        }`}
        title={isAutoScrolling ? "إيقاف النزول التلقائي" : "تشغيل النزول التلقائي (وضع شاشة العرض)"}
      >
        {isAutoScrolling ? <X size={16} /> : <MonitorPlay size={16} />}
      </button>

      {!isAutoScrolling && <Footer />}
    </div>
  )
}