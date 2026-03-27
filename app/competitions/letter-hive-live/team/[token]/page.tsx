"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { LETTER_HIVE_LIVE_BASE_LETTERS } from "@/lib/letter-hive-live"
import { supabase } from "@/lib/supabase-client"
import { AnimatedQuestionText, LetterHiveLiveBuzzTimerCard, LetterHiveLiveView, useSynchronizedQuestionStart } from "@/components/games/letter-hive-live-view"

type TeamRole = "team_a" | "team_b"
type ViewerRole = TeamRole | "player"

type MatchBroadcastPatch = Partial<Pick<TeamMatch, "status" | "isOpen" | "buzzEnabled" | "firstBuzzSide" | "firstBuzzedAt" | "teamAName" | "teamBName" | "teamAScore" | "teamBScore" | "roundTarget" | "buzzOwnerTimerSeconds" | "buzzOpponentTimerSeconds" | "currentPrompt" | "currentAnswer" | "currentLetter" | "currentCellIndex" | "showAnswer" | "updatedAt" | "playerSlots" | "boardLetters" | "claimedCells">>

type TeamMatch = {
  id: string
  role: ViewerRole
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
  roundTarget: number
  buzzOwnerTimerSeconds: number
  buzzOpponentTimerSeconds: number
  currentPrompt: string | null
  currentAnswer: string | null
  currentLetter: string | null
  currentCellIndex: number | null
  showAnswer: boolean
  updatedAt: string | null
  playerSlot: number | null
  playerSlots: Array<{
    slot: number
    name: string | null
    color: TeamRole | null
  }>
  boardLetters: string[]
  claimedCells: Array<TeamRole | null>
}

const LIVE_SYNC_INTERVAL_MS = 2000

export default function LetterHiveLiveTeamPage() {
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token || ""
  const playerSlotParam = searchParams.get("slot")
  const playerSlot = playerSlotParam ? Number(playerSlotParam) : null
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [match, setMatch] = useState<TeamMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [buzzing, setBuzzing] = useState(false)
  const [localBuzzPause, setLocalBuzzPause] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [selectedColor, setSelectedColor] = useState<TeamRole>("team_a")
  const [error, setError] = useState("")
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0)

  const syncServerTimeOffset = (serverNow?: string | null) => {
    if (!serverNow) {
      return
    }

    const nextOffsetMs = Date.parse(serverNow) - Date.now()
    if (Number.isFinite(nextOffsetMs)) {
      setServerTimeOffsetMs(nextOffsetMs)
    }
  }

  const buildBroadcastMatchPatch = (nextMatch: TeamMatch): MatchBroadcastPatch => ({
    status: nextMatch.status,
    isOpen: nextMatch.isOpen,
    buzzEnabled: nextMatch.buzzEnabled,
    firstBuzzSide: nextMatch.firstBuzzSide,
    firstBuzzedAt: nextMatch.firstBuzzedAt,
    teamAName: nextMatch.teamAName,
    teamBName: nextMatch.teamBName,
    teamAScore: nextMatch.teamAScore,
    teamBScore: nextMatch.teamBScore,
    roundTarget: nextMatch.roundTarget,
    buzzOwnerTimerSeconds: nextMatch.buzzOwnerTimerSeconds,
    buzzOpponentTimerSeconds: nextMatch.buzzOpponentTimerSeconds,
    currentPrompt: nextMatch.currentPrompt,
    currentAnswer: nextMatch.showAnswer ? nextMatch.currentAnswer : null,
    currentLetter: nextMatch.currentLetter,
    currentCellIndex: nextMatch.currentCellIndex,
    showAnswer: nextMatch.showAnswer,
    updatedAt: nextMatch.updatedAt,
    playerSlots: nextMatch.playerSlots,
    boardLetters: nextMatch.boardLetters,
    claimedCells: nextMatch.claimedCells,
  })

  const broadcastMatchUpdate = async (matchPatch?: MatchBroadcastPatch, serverNow?: string | null) => {
    if (!liveChannelRef.current) {
      return
    }

    await liveChannelRef.current.send({
      type: "broadcast",
      event: "match-updated",
      payload: { token, sentAt: Date.now(), serverNow: serverNow ?? null, match: matchPatch ?? null },
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
      const query = new URLSearchParams({ token })
      if (playerSlot) {
        query.set("slot", String(playerSlot))
      }

      const response = await fetch(`/api/letter-hive-live/session?${query.toString()}`, {
        cache: "no-store",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر جلب المباراة")
      }

      syncServerTimeOffset(data?.serverNow)
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
  }, [playerSlot, token])

  useEffect(() => {
    if (!token) {
      return
    }

    const intervalId = window.setInterval(() => {
      void fetchMatch(false)
    }, LIVE_SYNC_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [playerSlot, token])

  useEffect(() => {
    if (!match?.id) {
      return
    }

    const channel = supabase
      .channel(`letter-hive-live-room:${match.id}`)
      .on("broadcast", { event: "match-updated" }, (event) => {
        syncServerTimeOffset(event.payload?.serverNow as string | null | undefined)
        const matchPatch = event.payload?.match as MatchBroadcastPatch | null | undefined

        if (matchPatch) {
          setMatch((previousMatch) => (previousMatch ? { ...previousMatch, ...matchPatch } : previousMatch))
          setError("")
          return
        }

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
  }, [match?.id, token])

  const ownTeamName = useMemo(() => {
    if (!match) {
      return ""
    }

    if (match.role === "team_a") {
      return match.teamAName || ""
    }

    if (match.role === "team_b") {
      return match.teamBName || ""
    }

    return ""
  }, [match])

  const ownPlayerSlot = useMemo(() => {
    if (!match?.playerSlot) {
      return null
    }

    return match.playerSlots.find((entry) => entry.slot === match.playerSlot) || null
  }, [match])

  const isPlayerInvite = Boolean(playerSlot)
  const needsJoin = isPlayerInvite
    ? !(ownPlayerSlot?.name && ownPlayerSlot?.color && (match?.role === "team_a" || match?.role === "team_b"))
    : Boolean(match && !ownTeamName)

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

  const { hasStarted: questionHasStarted } = useSynchronizedQuestionStart(Boolean(match?.currentPrompt), match?.updatedAt, serverTimeOffsetMs)

  useEffect(() => {
    setLocalBuzzPause(false)
  }, [match?.currentPrompt, match?.currentCellIndex, match?.updatedAt])

  useEffect(() => {
    if (!localBuzzPause) {
      return
    }

    if (!match?.firstBuzzSide || (match.role !== "team_a" && match.role !== "team_b")) {
      return
    }

    if (match.firstBuzzSide !== match.role) {
      setLocalBuzzPause(false)
    }
  }, [localBuzzPause, match?.firstBuzzSide, match?.role])

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
          playerName: teamName,
          playerSlot,
          selectedColor,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ اسم الفريق")
      }

      syncServerTimeOffset(data?.serverNow)
      setMatch(data.match)
      setError("")
      void broadcastMatchUpdate(buildBroadcastMatchPatch(data.match), data?.serverNow)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : isPlayerInvite ? "تعذر حفظ بيانات اللاعب" : "تعذر حفظ اسم الفريق")
    } finally {
      setSavingName(false)
    }
  }

  const handleBuzz = async () => {
    if (!match) {
      return
    }

    try {
      setLocalBuzzPause(true)
      setBuzzing(true)
      setError("")

      const response = await fetch("/api/letter-hive-live/buzz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, playerSlot }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "تعذر تسجيل السبق")
      }

      syncServerTimeOffset(data?.serverNow)
      setMatch(data.match)
      setError("")
      void broadcastMatchUpdate(buildBroadcastMatchPatch(data.match), data?.serverNow)
    } catch (requestError) {
      setLocalBuzzPause(false)
      void fetchMatch(false)
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

  if (match && needsJoin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff9f3_0%,#f7f7ff_48%,#ffffff_100%)] px-4 py-8" dir="rtl">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#d8c9fb]/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.62)_0%,rgba(246,242,255,0.28)_100%)] p-6 shadow-[0_24px_80px_rgba(124,58,237,0.08)] backdrop-blur-xl md:p-8">
          <div className="text-center">
            <h1 className="text-3xl font-black text-[#1f1147]">{isPlayerInvite ? `دخول اللاعب ${playerSlot}` : "دخول الفريق"}</h1>
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-[#1f1147]">{isPlayerInvite ? "اسم اللاعب" : "اسم الفريق"}</label>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder={isPlayerInvite ? "اكتب اسم اللاعب" : "اكتب اسم الفريق"}
                className="h-14 w-full rounded-2xl border border-[#d8c9fb]/80 bg-transparent px-4 text-right text-[#3f2a76] placeholder:text-[#8f7fb1] outline-none transition focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10"
              />
            </div>

            {isPlayerInvite ? (
              <div className="space-y-3">
                <label className="block text-sm font-bold text-[#1f1147]">اختر اللون</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedColor("team_a")}
                    className={`h-12 rounded-[1.35rem] border px-4 text-sm font-black transition ${selectedColor === "team_a" ? "border-[#df103a] bg-[linear-gradient(135deg,#df103a_0%,#be123c_100%)] text-white shadow-[0_10px_24px_rgba(223,16,58,0.22)]" : "border-[#df103a]/20 bg-[linear-gradient(135deg,rgba(223,16,58,0.08)_0%,rgba(255,255,255,0.92)_100%)] text-[#b91c1c]"}`}
                  >
                    اللون الأحمر
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedColor("team_b")}
                    className={`h-12 rounded-[1.35rem] border px-4 text-sm font-black transition ${selectedColor === "team_b" ? "border-[#14b8a6] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_10px_24px_rgba(20,184,166,0.24)]" : "border-[#14b8a6]/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.12)_0%,rgba(255,255,255,0.92)_100%)] text-[#0f766e]"}`}
                  >
                    اللون التركوازي
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

            <Button
              type="button"
              onClick={handleSaveTeamName}
              disabled={savingName || !teamName.trim()}
              className="h-14 w-full rounded-2xl bg-[#7c3aed] text-lg font-black text-white hover:bg-[#6d28d9]"
            >
              {savingName ? "جارٍ الحفظ..." : isPlayerInvite ? "دخول اللاعب" : "دخول الفريق"}
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
      roundTarget={match?.roundTarget ?? 3}
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
      buzzDisabled={buzzing || !match?.isOpen || !match?.buzzEnabled || !questionHasStarted || Boolean(match?.firstBuzzSide) || match?.status === "finished"}
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
            <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              {match.firstBuzzSide ? (
                <>
                  <div style={{ background: "rgba(255,255,255,0.96)", padding: "14px 18px", borderRadius: "22px", textAlign: "center", boxShadow: "0 18px 36px rgba(0,0,0,0.18)", minWidth: 220, maxWidth: 320, width: "100%" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "rgba(15,23,42,0.06)", padding: "6px 12px", color: "#475569", fontSize: "0.82rem", fontWeight: 900 }}>
                      أول من ضغط الزر
                    </div>
                    <div
                      style={{
                        marginTop: "10px",
                        borderRadius: "999px",
                        background: match.firstBuzzSide === "team_a" ? "rgba(223,16,58,0.08)" : "rgba(16,223,181,0.12)",
                        border: match.firstBuzzSide === "team_a" ? "1px solid rgba(223,16,58,0.18)" : "1px solid rgba(16,223,181,0.2)",
                        padding: "8px 18px",
                        color: match.firstBuzzSide === "team_a" ? "#df103a" : "#08755f",
                        fontSize: "0.98rem",
                        fontWeight: 900,
                        lineHeight: 1.2,
                      }}
                    >
                      {firstBuzzLabel}
                    </div>
                  </div>
                  <LetterHiveLiveBuzzTimerCard
                    firstBuzzSide={match.firstBuzzSide}
                    firstBuzzedAt={match.firstBuzzedAt}
                    teamAName={match.teamAName || "الفريق الأول"}
                    teamBName={match.teamBName || "الفريق الثاني"}
                    buzzOwnerTimerSeconds={match.buzzOwnerTimerSeconds}
                    buzzOpponentTimerSeconds={match.buzzOpponentTimerSeconds}
                    serverTimeOffsetMs={serverTimeOffsetMs}
                  />
                </>
              ) : null}
              <div style={{ background: "white", padding: "36px 30px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 720, width: "100%" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#f5f3ff", color: "#6d28d9", padding: "7px 14px", fontWeight: 900, fontSize: "0.95rem", marginBottom: "16px" }}>
                  {match.currentLetter ? `حرف ${match.currentLetter}` : "سؤال البطولة"}
                </div>
                {!questionHasStarted ? (
                  <div style={{ marginBottom: "12px", color: "#7c3aed", fontSize: "0.95rem", fontWeight: 800 }}>
                    جارٍ توحيد التوقيت بين الفرق، سيبدأ السؤال الآن...
                  </div>
                ) : null}
                <h3 style={{ marginBottom: 18, fontSize: "1.3rem", color: "#2c3e50", lineHeight: 1.9, fontWeight: 900 }}>
                  <AnimatedQuestionText text={match.currentPrompt} ready={questionHasStarted} paused={questionHasStarted && (localBuzzPause || match.firstBuzzSide === match.role)} />
                </h3>
              {match.showAnswer && match.currentAnswer ? (
                <div style={{ fontSize: "1.5rem", color: "#008a1e", marginBottom: 18, fontWeight: "bold" }}>{match.currentAnswer}</div>
              ) : null}
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  )
}