"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { LETTER_HIVE_LIVE_BASE_LETTERS } from "@/lib/letter-hive-live"
import { LetterHiveLiveView } from "@/components/games/letter-hive-live-view"

type TeamRole = "team_a" | "team_b"

type TeamMatch = {
  id: string
  role: TeamRole
  title: string
  status: "waiting" | "live" | "finished"
  isOpen: boolean
  buzzEnabled: boolean
  firstBuzzSide: TeamRole | null
  firstBuzzedAt: string | null
  teamAName: string | null
  teamBName: string | null
  teamAScore: number
  teamBScore: number
  currentPrompt: string | null
  currentAnswer: string | null
  currentLetter: string | null
  currentCellIndex: number | null
  showAnswer: boolean
  boardLetters: string[]
  claimedCells: Array<TeamRole | null>
}

export default function LetterHiveLiveTeamPage() {
  const params = useParams<{ token: string }>()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token || ""

  const [match, setMatch] = useState<TeamMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [buzzing, setBuzzing] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [error, setError] = useState("")

  const fetchMatch = async (showLoader = false) => {
    if (!token) {
      return
    }

    if (showLoader) {
      setLoading(true)
    }

    try {
      const response = await fetch(`/api/letter-hive-live/session?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر جلب المباراة")
      }

      setMatch(data.match)
      setError("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر جلب المباراة")
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void fetchMatch(true)
  }, [token])

  useEffect(() => {
    if (!token) {
      return
    }

    const intervalId = window.setInterval(() => {
      void fetchMatch(false)
    }, 1500)

    return () => window.clearInterval(intervalId)
  }, [token])

  const ownTeamName = useMemo(() => {
    if (!match) {
      return ""
    }

    return match.role === "team_a" ? match.teamAName || "" : match.teamBName || ""
  }, [match])

  const boardLetters = useMemo(() => {
    if (!match?.boardLetters?.length) {
      return LETTER_HIVE_LIVE_BASE_LETTERS
    }

    return match.boardLetters
  }, [match])

  const claimedCells = useMemo(() => {
    if (!match?.claimedCells?.length) {
      return Array(25).fill(null) as Array<TeamRole | null>
    }

    return match.claimedCells
  }, [match])

  const firstBuzzLabel = useMemo(() => {
    if (!match?.firstBuzzSide) {
      return ""
    }

    return match.firstBuzzSide === "team_a"
      ? match.teamAName || "الفريق الأول"
      : match.teamBName || "الفريق الثاني"
  }, [match])

  const handleSaveTeamName = async () => {
    try {
      setSavingName(true)
      const response = await fetch("/api/letter-hive-live/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          teamName,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ اسم الفريق")
      }

      setMatch(data.match)
      setError("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر حفظ اسم الفريق")
    } finally {
      setSavingName(false)
    }
  }

  const handleBuzz = async () => {
    try {
      setBuzzing(true)
      const response = await fetch("/api/letter-hive-live/buzz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "تعذر تسجيل السبق")
      }

      setMatch(data.match)
      setError("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تسجيل السبق")
    } finally {
      setBuzzing(false)
    }
  }

  if (loading) {
    return <SiteLoader fullScreen />
  }

  if (error && !match) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff9f3_0%,#f7f7ff_48%,#ffffff_100%)] px-4" dir="rtl">
        <div className="w-full max-w-lg rounded-[2rem] border border-red-200 bg-white/80 p-8 text-center shadow-xl backdrop-blur-lg">
          <p className="text-lg font-black text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (match && !ownTeamName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff9f3_0%,#f7f7ff_48%,#ffffff_100%)] px-4 py-8" dir="rtl">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#d8c9fb]/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.62)_0%,rgba(246,242,255,0.28)_100%)] p-6 shadow-[0_24px_80px_rgba(124,58,237,0.08)] backdrop-blur-xl md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] text-white shadow-[0_18px_40px_rgba(124,58,237,0.24)]">
              <Radio className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-3xl font-black text-[#1f1147]">دخول الفريق</h1>
            <p className="mt-3 text-sm leading-8 text-[#5b5570]">
              اكتب اسم فريقك مرة واحدة فقط، ثم سيتم حفظه على هذا الرابط تلقائياً.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-[#1f1147]">اسم الفريق</label>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="اكتب اسم الفريق"
                className="h-14 w-full rounded-2xl border border-[#d8c9fb]/80 bg-transparent px-4 text-right text-[#3f2a76] placeholder:text-[#8f7fb1] outline-none transition focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10"
              />
            </div>

            {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

            <Button
              type="button"
              onClick={handleSaveTeamName}
              disabled={savingName || !teamName.trim()}
              className="h-14 w-full rounded-2xl bg-[#7c3aed] text-lg font-black text-white hover:bg-[#6d28d9]"
            >
              {savingName ? "جارٍ الحفظ..." : "دخول الفريق"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <LetterHiveLiveView
      teamAName={match?.teamAName || "الفريق الأول"}
      teamBName={match?.teamBName || "الفريق الثاني"}
      teamAScore={match?.teamAScore ?? 0}
      teamBScore={match?.teamBScore ?? 0}
      boardLetters={boardLetters}
      claimedCells={claimedCells}
      currentPrompt={match?.currentPrompt || null}
      currentAnswer={match?.currentAnswer || null}
      showAnswer={Boolean(match?.showAnswer)}
      currentCellIndex={match?.currentCellIndex ?? null}
      error={error}
      onBuzz={handleBuzz}
      buzzing={buzzing}
      buzzButtonLabel="الزر"
      buzzDisabled={buzzing || !match?.isOpen || !match?.buzzEnabled || Boolean(match?.firstBuzzSide) || match?.status === "finished"}
      questionOverlay={
        match?.status === "waiting" ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.36)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "16px" }}>
            <div style={{ background: "white", padding: "36px 30px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 520, width: "100%" }}>
              <h3 style={{ marginBottom: 12, fontSize: "1.6rem", color: "#2c3e50", fontWeight: 900 }}>بانتظار بدء اللعبة</h3>
              <p style={{ fontSize: "1rem", color: "#6b7280", lineHeight: 1.9 }}>سيبدأ عرض أسئلة البطولة هنا مباشرة بعد أن يضغط المقدم على بدء اللعبة.</p>
            </div>
          </div>
        ) : match?.currentPrompt ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "16px" }}>
            <div style={{ background: "white", padding: "36px 30px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 720, width: "100%" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#f5f3ff", color: "#6d28d9", padding: "7px 14px", fontWeight: 900, fontSize: "0.95rem", marginBottom: "16px" }}>
                {match.currentLetter ? `حرف ${match.currentLetter}` : "سؤال البطولة"}
              </div>
              <h3 style={{ marginBottom: 18, fontSize: "1.3rem", color: "#2c3e50", lineHeight: 1.9, fontWeight: 900 }}>{match.currentPrompt}</h3>
              {match.firstBuzzSide ? (
                <div style={{ marginBottom: 18, borderRadius: "16px", background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(124,58,237,0.04) 100%)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 16px", color: "#6d28d9", fontWeight: 900 }}>
                  أول من ضغط الزر: {firstBuzzLabel}
                </div>
              ) : null}
              {match.showAnswer && match.currentAnswer ? (
                <div style={{ fontSize: "1.5rem", color: "#008a1e", marginBottom: 18, fontWeight: "bold" }}>{match.currentAnswer}</div>
              ) : null}
            </div>
          </div>
        ) : undefined
      }
    />
  )
}