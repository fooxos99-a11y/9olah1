"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Copy, ExternalLink, Lock, Trophy, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { LETTER_HIVE_LIVE_BASE_LETTERS } from "@/lib/letter-hive-live"
import { supabase } from "@/lib/supabase-client"
import { LetterHiveLiveView } from "@/components/games/letter-hive-live-view"
import { toast } from "@/hooks/use-toast"

type PresenterMatch = {
  id: string
  role: "presenter"
  title: string
  status: "waiting" | "live" | "finished"
  isOpen: boolean
  buzzEnabled: boolean
  firstBuzzSide: "team_a" | "team_b" | null
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
  claimedCells: Array<"team_a" | "team_b" | null>
  links: {
    presenter: string
    teamA: string
    teamB: string
  }
}

type PreloadedQuestion = {
  id: string
  question: string
  answer: string
}

const LIVE_SYNC_INTERVAL_MS = 2000

function TeamLinkCard({
  title,
  href,
  teamName,
  accentClass,
  onCopy,
}: {
  title: string
  href: string
  teamName: string | null
  accentClass: string
  onCopy: () => void
}) {
  const joined = Boolean(teamName)

  return (
    <div className="rounded-[1.8rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,244,255,0.9)_100%)] p-4 text-right shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-[#1f1147]">{title}</p>
          <p className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-black ${accentClass}`}>
            {joined ? `دخل الفريق: ${teamName}` : "بانتظار دخول الفريق"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#e7dcff] bg-white/80 px-4 py-3 text-left text-xs text-[#5b5570]" dir="ltr">
        <span className="block truncate">{href}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onCopy} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent text-[#6d28d9] hover:bg-[#f5f3ff]">
          <Copy className="h-4 w-4" />نسخ الرابط
        </Button>
      </div>
    </div>
  )
}

export default function LetterHiveLivePresenterPage() {
  const params = useParams<{ token: string }>()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token || ""
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [match, setMatch] = useState<PresenterMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null)
  const [questionsByLetter, setQuestionsByLetter] = useState<Record<string, PreloadedQuestion[]>>({})

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({
        title: "تم نسخ الرابط",
        description: `تم نسخ ${label}.`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "تعذر النسخ",
        description: "المتصفح منع نسخ الرابط تلقائيًا.",
      })
    }
  }

  const broadcastMatchUpdate = async () => {
    if (!liveChannelRef.current) {
      return
    }

    await liveChannelRef.current.send({
      type: "broadcast",
      event: "match-updated",
      payload: { token, sentAt: Date.now() },
    })
  }

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
    }, LIVE_SYNC_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [token])

  useEffect(() => {
    if (!match?.id) {
      return
    }

    const channel = supabase
      .channel(`letter-hive-live-room:${match.id}`)
      .on("broadcast", { event: "match-updated" }, () => {
        void fetchMatch(false)
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "letter_hive_live_matches",
          filter: `id=eq.${match.id}`,
        },
        () => {
          void fetchMatch(false)
        },
      )
      .subscribe()

    liveChannelRef.current = channel

    return () => {
      if (liveChannelRef.current === channel) {
        liveChannelRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [match?.id])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const preloadQuestions = async () => {
      try {
        const response = await fetch(`/api/letter-hive-live/question?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || "تعذر تحميل أسئلة البطولة")
        }

        if (!cancelled) {
          setQuestionsByLetter(data.questionsByLetter || {})
        }
      } catch {
        if (!cancelled) {
          setQuestionsByLetter({})
        }
      }
    }

    void preloadQuestions()

    return () => {
      cancelled = true
    }
  }, [token])

  const firstBuzzLabel = useMemo(() => {
    if (!match?.firstBuzzSide) {
      return "لا يوجد ضغط مسجل"
    }

    return match.firstBuzzSide === "team_a"
      ? match.teamAName || "الفريق الأول"
      : match.teamBName || "الفريق الثاني"
  }, [match])

  const boardLetters = useMemo(() => {
    if (!match?.boardLetters?.length) {
      return LETTER_HIVE_LIVE_BASE_LETTERS
    }

    return match.boardLetters
  }, [match])

  const claimedCells = useMemo(() => {
    if (!match?.claimedCells?.length) {
      return Array(25).fill(null) as Array<"team_a" | "team_b" | null>
    }

    return match.claimedCells
  }, [match])

  const selectedLetter = useMemo(() => {
    if (selectedCellIndex === null) {
      return ""
    }

    return boardLetters[selectedCellIndex] || ""
  }, [boardLetters, selectedCellIndex])

  useEffect(() => {
    if (!match) {
      return
    }

    setSelectedCellIndex(match.currentCellIndex ?? null)
  }, [match?.currentCellIndex, match?.id])

  const updateState = async (payload: Record<string, unknown>) => {
    try {
      setActionLoading(true)
      const response = await fetch("/api/letter-hive-live/state", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, ...payload }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحديث الحالة")
      }

      setMatch(data.match)
      setError("")
      void broadcastMatchUpdate()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحديث الحالة")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSelectCell = async (index: number) => {
    if (!match?.isOpen || match.status === "waiting" || match.status === "finished") {
      setError("ابدأ اللعبة أولاً")
      return
    }

    setSelectedCellIndex(index)
    const letter = boardLetters[index] || ""
    const nextPreloadedQuestion = letter ? questionsByLetter[letter]?.[0] : undefined

    setMatch((previousMatch) => {
      if (!previousMatch) {
        return previousMatch
      }

      return {
        ...previousMatch,
        currentPrompt: nextPreloadedQuestion?.question || "جارٍ تحميل سؤال البطولة...",
        currentAnswer: nextPreloadedQuestion?.answer || null,
        currentLetter: letter || null,
        currentCellIndex: index,
        showAnswer: false,
        buzzEnabled: Boolean(nextPreloadedQuestion),
        firstBuzzSide: null,
      }
    })

    if (nextPreloadedQuestion && letter) {
      setQuestionsByLetter((previousQuestions) => ({
        ...previousQuestions,
        [letter]: (previousQuestions[letter] || []).slice(1),
      }))
    }

    try {
      setActionLoading(true)
      const response = await fetch("/api/letter-hive-live/question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, cellIndex: index, questionId: nextPreloadedQuestion?.id }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل سؤال البطولة")
      }

      setMatch(data.match)
      setError("")
      void broadcastMatchUpdate()
    } catch (requestError) {
      if (nextPreloadedQuestion && letter) {
        setQuestionsByLetter((previousQuestions) => ({
          ...previousQuestions,
          [letter]: [nextPreloadedQuestion, ...(previousQuestions[letter] || [])],
        }))
      }

      void fetchMatch(false)
      setError(requestError instanceof Error ? requestError.message : "تعذر تحميل سؤال البطولة")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevealAnswer = async () => {
    if (!match?.currentPrompt || !match?.currentAnswer) {
      setError("لا يوجد سؤال جارٍ لعرض جوابه")
      return
    }

    await updateState({ show_answer: true })
  }

  const handleAssignCell = async (side: "team_a" | "team_b") => {
    if (!match || match.currentCellIndex === null) {
      setError("لا توجد خلية جارية لإسنادها")
      return
    }

    const nextClaimedCells = [...claimedCells]
    nextClaimedCells[match.currentCellIndex] = side

    await updateState({
      claimed_cells: nextClaimedCells,
      team_a_score: side === "team_a" ? match.teamAScore + 1 : match.teamAScore,
      team_b_score: side === "team_b" ? match.teamBScore + 1 : match.teamBScore,
      current_prompt: null,
      current_answer: null,
      current_letter: null,
      current_cell_index: null,
      show_answer: false,
      buzz_enabled: false,
      first_buzz_side: null,
    })

    setSelectedCellIndex(null)
  }

  const handleClearCurrent = async () => {
    await updateState({
      current_prompt: null,
      current_answer: null,
      current_letter: null,
      current_cell_index: null,
      show_answer: false,
      buzz_enabled: false,
      first_buzz_side: null,
    })

    setSelectedCellIndex(null)
  }

  const canStartGame = Boolean(match?.teamAName && match?.teamBName)

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
      onCellSelect={handleSelectCell}
      selectedCellIndex={selectedCellIndex}
      questionOverlay={
        match?.status === "waiting" ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.36)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "16px" }}>
            <div style={{ background: "white", padding: "36px 30px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 900, width: "100%" }}>
              <h3 style={{ marginBottom: 12, fontSize: "1.6rem", color: "#2c3e50", fontWeight: 900 }}>جاهز لبدء البطولة</h3>
              <p style={{ marginBottom: 24, fontSize: "1rem", color: "#6b7280", lineHeight: 1.9 }}>
                {canStartGame ? "بعد الضغط على بدء اللعبة تستطيع اختيار أي خلية ليظهر سؤالها الخاص من قاعدة البطولة." : "يجب أن يدخل الفريقان أولاً قبل أن تستطيع بدء اللعبة."}
              </p>
              <div className="mb-5 rounded-[1.6rem] border border-[#e7dcff] bg-[linear-gradient(180deg,rgba(248,244,255,0.9)_0%,rgba(255,255,255,0.96)_100%)] p-4 text-right shadow-[0_12px_30px_rgba(124,58,237,0.08)]">
                <p className="text-sm font-black text-[#6d28d9]">رابط المقدم</p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="min-w-0 truncate rounded-2xl border border-[#e7dcff] bg-white/80 px-4 py-3 text-left text-xs text-[#5b5570]" dir="ltr">
                    {match?.links.presenter}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void handleCopy(match?.links.presenter || "", "رابط المقدم")} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent text-[#6d28d9] hover:bg-[#f5f3ff]">
                      <Copy className="h-4 w-4" />نسخ
                    </Button>
                    <Button type="button" asChild className="rounded-2xl bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                      <a href={match?.links.presenter || "#"} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />فتح
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <TeamLinkCard
                  title="رابط الفريق الأول"
                  href={match?.links.teamA || ""}
                  teamName={match?.teamAName || null}
                  accentClass="bg-[#df103a]/10 text-[#df103a]"
                  onCopy={() => void handleCopy(match?.links.teamA || "", "رابط الفريق الأول")}
                />
                <TeamLinkCard
                  title="رابط الفريق الثاني"
                  href={match?.links.teamB || ""}
                  teamName={match?.teamBName || null}
                  accentClass="bg-[#10dfb5]/14 text-[#08755f]"
                  onCopy={() => void handleCopy(match?.links.teamB || "", "رابط الفريق الثاني")}
                />
              </div>

              <Button type="button" onClick={() => void updateState({ is_open: true, status: "live" })} disabled={actionLoading || !canStartGame} className="rounded-2xl bg-[#7c3aed] px-8 text-white hover:bg-[#6d28d9] disabled:opacity-50">
                بدء اللعبة
              </Button>
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
              {!match.currentAnswer ? (
                <div className="mt-6 flex justify-center">
                  <Button type="button" onClick={() => void handleClearCurrent()} disabled={actionLoading} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent text-[#6d28d9] hover:bg-[#f5f3ff]">
                    <Lock className="h-4 w-4" />إغلاق
                  </Button>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => void handleRevealAnswer()} disabled={actionLoading || Boolean(match.showAnswer)} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent text-[#6d28d9] hover:bg-[#f5f3ff]">
                    إظهار الجواب
                  </Button>
                  <Button type="button" onClick={() => void handleClearCurrent()} disabled={actionLoading} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent text-[#6d28d9] hover:bg-[#f5f3ff]">
                    <Lock className="h-4 w-4" />إلغاء السؤال
                  </Button>
                  <Button type="button" onClick={() => void updateState({ status: "finished", is_open: false, buzz_enabled: false })} disabled={actionLoading || match.status === "finished"} className="rounded-2xl bg-red-600 text-white hover:bg-red-700">
                    <Trophy className="h-4 w-4" />إنهاء المباراة
                  </Button>
                </div>
              )}
              {match.showAnswer && match.currentAnswer ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button type="button" disabled={actionLoading || match.currentCellIndex === null} onClick={() => void handleAssignCell("team_a")} className="rounded-2xl bg-[#df103a] text-white hover:opacity-95">
                    {match.teamAName || "الفريق الأول"}
                  </Button>
                  <Button type="button" disabled={actionLoading || match.currentCellIndex === null} onClick={() => void handleAssignCell("team_b")} className="rounded-2xl bg-[#10dfb5] text-[#083b31] hover:opacity-95">
                    {match.teamBName || "الفريق الثاني"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : undefined
      }
    />
  )
}