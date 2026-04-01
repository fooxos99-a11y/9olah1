"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { DEFAULT_LETTER_HIVE_LIVE_ROUND_TARGET, hasCompletedLetterHiveLiveRound, LETTER_HIVE_LIVE_BASE_LETTERS } from "@/lib/letter-hive-live"
import { supabase } from "@/lib/supabase-client"
import { AnimatedQuestionText, LetterHiveLiveBuzzTimerCard, LetterHiveLiveView, splitIntoGraphemes, useLetterHiveLiveBuzzTimer, useSynchronizedQuestionStart } from "@/components/games/letter-hive-live-view"

type TeamRole = "team_a" | "team_b"
type ViewerRole = TeamRole | "player"

type MatchBroadcastPatch = Partial<Pick<TeamMatch, "status" | "isOpen" | "buzzEnabled" | "firstBuzzSide" | "firstBuzzedAt" | "firstBuzzPlayerName" | "teamAName" | "teamBName" | "teamAScore" | "teamBScore" | "requiresPresenter" | "controllerSide" | "roundTarget" | "buzzOwnerTimerSeconds" | "buzzOpponentTimerSeconds" | "currentPrompt" | "currentAnswer" | "currentLetter" | "currentCellIndex" | "currentPromptStartedAt" | "showAnswer" | "updatedAt" | "playerSlots" | "boardLetters" | "claimedCells">>

type TeamMatch = {
  id: string
  role: ViewerRole
  title: string
  status: "waiting" | "live" | "finished"
  isOpen: boolean
  buzzEnabled: boolean
  firstBuzzSide: TeamRole | null
  firstBuzzedAt: string | null
  firstBuzzPlayerName: string | null
  teamAName: string | null
  teamBName: string | null
  teamAScore: number
  teamBScore: number
  requiresPresenter: boolean
  controllerSide: TeamRole
  roundTarget: number
  buzzOwnerTimerSeconds: number
  buzzOpponentTimerSeconds: number
  currentPrompt: string | null
  currentAnswer: string | null
  currentLetter: string | null
  currentCellIndex: number | null
  currentPromptStartedAt: string | null
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
  const [actionLoading, setActionLoading] = useState(false)
  const [buzzing, setBuzzing] = useState(false)
  const [localBuzzPause, setLocalBuzzPause] = useState(false)
  const [latestVisiblePromptText, setLatestVisiblePromptText] = useState("")
  const [frozenPromptText, setFrozenPromptText] = useState("")
  const latestVisiblePromptTextRef = useRef("")
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null)
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
    firstBuzzPlayerName: nextMatch.firstBuzzPlayerName,
    teamAName: nextMatch.teamAName,
    teamBName: nextMatch.teamBName,
    teamAScore: nextMatch.teamAScore,
    teamBScore: nextMatch.teamBScore,
    requiresPresenter: nextMatch.requiresPresenter,
    controllerSide: nextMatch.controllerSide,
    roundTarget: nextMatch.roundTarget,
    buzzOwnerTimerSeconds: nextMatch.buzzOwnerTimerSeconds,
    buzzOpponentTimerSeconds: nextMatch.buzzOpponentTimerSeconds,
    currentPrompt: nextMatch.currentPrompt,
    currentAnswer: nextMatch.showAnswer ? nextMatch.currentAnswer : null,
    currentLetter: nextMatch.currentLetter,
    currentCellIndex: nextMatch.currentCellIndex,
    currentPromptStartedAt: nextMatch.currentPromptStartedAt,
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
      return null
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
      return data.match as TeamMatch
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر جلب المباراة")
      return null
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

  const ownPlayerSlot = useMemo(() => {
    if (!match?.playerSlot) {
      return null
    }

    return match.playerSlots.find((entry) => entry.slot === match.playerSlot) || null
  }, [match])

  const effectiveRole = useMemo<ViewerRole>(() => {
    if (!match) {
      return "player"
    }

    if (match.role === "team_a" || match.role === "team_b") {
      return match.role
    }

    return ownPlayerSlot?.color || "player"
  }, [match, ownPlayerSlot])

  const ownTeamName = useMemo(() => {
    if (!match) {
      return ""
    }

    if (effectiveRole === "team_a") {
      return match.teamAName || ""
    }

    if (effectiveRole === "team_b") {
      return match.teamBName || ""
    }

    return ""
  }, [effectiveRole, match])

  const isPlayerInvite = Boolean(playerSlot)
  const needsJoin = isPlayerInvite
    ? !(ownPlayerSlot?.name && ownPlayerSlot?.color)
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

    if (match.firstBuzzPlayerName) {
      return match.firstBuzzPlayerName
    }

    return match.firstBuzzSide === "team_a"
      ? match.teamAName || "الفريق 2"
      : match.teamBName || "الفريق 1"
  }, [match])

  const captainSlot = useMemo(() => {
    if (!match || (effectiveRole !== "team_a" && effectiveRole !== "team_b")) {
      return null
    }

    return match.playerSlots.find((entry) => entry.color === effectiveRole && entry.name)?.slot ?? null
  }, [effectiveRole, match])

  const isCaptain = Boolean(match?.playerSlot && captainSlot && match.playerSlot === captainSlot)

  const isController = effectiveRole === "team_a" || effectiveRole === "team_b"
    ? !match?.requiresPresenter && match.controllerSide === effectiveRole && isCaptain
    : false

  const { hasStarted: questionHasStarted } = useSynchronizedQuestionStart(Boolean(match?.currentPrompt), match?.currentPromptStartedAt ?? match?.updatedAt, serverTimeOffsetMs, `${match?.currentCellIndex ?? "none"}:${match?.currentPrompt ?? ""}`)
  const buzzTimerState = useLetterHiveLiveBuzzTimer(
    match?.firstBuzzSide ?? null,
    match?.firstBuzzedAt,
    (match?.buzzOwnerTimerSeconds ?? 0) * 1000,
    (match?.buzzOpponentTimerSeconds ?? 0) * 1000,
    serverTimeOffsetMs,
  )
  const shouldResumePrompt = Boolean(match?.firstBuzzSide) && buzzTimerState.phase === "opponent"
  const frozenPromptDisplayText = frozenPromptText || latestVisiblePromptText || latestVisiblePromptTextRef.current
  const frozenPromptVisibleCount = useMemo(() => splitIntoGraphemes(frozenPromptDisplayText).length, [frozenPromptDisplayText])
  const activeQuestionSide = match?.firstBuzzSide && buzzTimerState.activeSide ? buzzTimerState.activeSide : match?.controllerSide ?? null
  const canManageCurrentQuestion = effectiveRole === "team_a" || effectiveRole === "team_b"
    ? !match?.requiresPresenter && activeQuestionSide === effectiveRole && isCaptain
    : false

  useEffect(() => {
    if (!match) {
      return
    }

    setSelectedCellIndex(match.currentCellIndex ?? null)
  }, [match?.currentCellIndex, match?.id])

  useEffect(() => {
    setLatestVisiblePromptText("")
    setFrozenPromptText("")
    latestVisiblePromptTextRef.current = ""
  }, [match?.currentPrompt, match?.currentCellIndex])

  useEffect(() => {
    if (match?.firstBuzzSide && !frozenPromptText) {
      const nextFrozenPromptText = latestVisiblePromptText || latestVisiblePromptTextRef.current
      if (nextFrozenPromptText) {
        setFrozenPromptText(nextFrozenPromptText)
      }
    }
  }, [frozenPromptText, latestVisiblePromptText, match?.firstBuzzSide])

  useEffect(() => {
    if (!latestVisiblePromptText) {
      return
    }

    latestVisiblePromptTextRef.current = latestVisiblePromptText
  }, [latestVisiblePromptText])

  useEffect(() => {
    setLocalBuzzPause(false)
  }, [match?.currentPrompt, match?.currentCellIndex, match?.updatedAt])

  useEffect(() => {
    if (!localBuzzPause) {
      return
    }

    if (!match?.firstBuzzSide || (effectiveRole !== "team_a" && effectiveRole !== "team_b")) {
      return
    }

    if (match.firstBuzzSide !== effectiveRole) {
      setLocalBuzzPause(false)
    }
  }, [effectiveRole, localBuzzPause, match?.firstBuzzSide])

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
      const refreshedMatch = await fetchMatch(false)
      if (!refreshedMatch?.firstBuzzSide) {
        setLocalBuzzPause(false)
      }
      setError(requestError instanceof Error ? requestError.message : "تعذر تسجيل السبق")
    } finally {
      setBuzzing(false)
    }
  }

  const updateState = async (payload: Record<string, unknown>) => {
    try {
      setActionLoading(true)
      const response = await fetch("/api/letter-hive-live/state", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, playerSlot, ...payload }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحديث الحالة")
      }

      syncServerTimeOffset(data?.serverNow)
      setMatch(data.match)
      setError("")
      void broadcastMatchUpdate(buildBroadcastMatchPatch(data.match), data?.serverNow)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحديث الحالة")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSelectCell = async (index: number) => {
    if (!match || !isController) {
      return
    }

    if (!match.isOpen || match.status === "finished") {
      setError("اللعبة ليست متاحة الآن")
      return
    }

    if (match.currentPrompt || match.currentCellIndex !== null || actionLoading) {
      return
    }

    try {
      setActionLoading(true)
      setSelectedCellIndex(index)
      setError("")

      const response = await fetch("/api/letter-hive-live/question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, playerSlot, cellIndex: index }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل السؤال")
      }

      syncServerTimeOffset(data?.serverNow)
      setMatch(data.match)
      setError("")
      void broadcastMatchUpdate(buildBroadcastMatchPatch(data.match), data?.serverNow)
    } catch (requestError) {
      setSelectedCellIndex(null)
      setError(requestError instanceof Error ? requestError.message : "تعذر تحميل السؤال")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevealAnswer = async () => {
    if (!match?.currentPrompt || !match.currentAnswer) {
      setError("لا يوجد سؤال جارٍ لعرض جوابه")
      return
    }

    if (!match.firstBuzzSide) {
      setError("لا يمكن إظهار الجواب قبل ضغط الزر")
      return
    }

    await updateState({ show_answer: true })
  }

  const handleAssignCell = async (side: TeamRole) => {
    if (!match || match.currentCellIndex === null) {
      setError("لا توجد خلية جارية لإسنادها")
      return
    }

    if (!match.showAnswer) {
      setError("أظهر الجواب أولاً ثم حدّد الفريق الذي أجاب")
      return
    }

    const nextClaimedCells = [...claimedCells]
    nextClaimedCells[match.currentCellIndex] = side
    const didWinRound = hasCompletedLetterHiveLiveRound(nextClaimedCells, side)
    const nextTeamAScore = side === "team_a" && didWinRound ? match.teamAScore + 1 : match.teamAScore
    const nextTeamBScore = side === "team_b" && didWinRound ? match.teamBScore + 1 : match.teamBScore
    const targetReached = (side === "team_a" ? nextTeamAScore : nextTeamBScore) >= match.roundTarget

    await updateState({
      claimed_cells: didWinRound ? Array(25).fill(null) : nextClaimedCells,
      team_a_score: nextTeamAScore,
      team_b_score: nextTeamBScore,
      status: targetReached ? "finished" : match.status,
      is_open: targetReached ? false : match.isOpen,
      current_prompt: null,
      current_answer: null,
      current_letter: null,
      current_cell_index: null,
      show_answer: false,
      buzz_enabled: false,
      first_buzz_side: null,
      metadata: match.requiresPresenter ? undefined : { controllerSide: side },
    })

    setSelectedCellIndex(null)
  }

  const handleClearCurrent = async () => {
    if (!match) {
      return
    }

    await updateState({
      current_prompt: null,
      current_answer: null,
      current_letter: null,
      current_cell_index: null,
      show_answer: false,
      buzz_enabled: false,
      first_buzz_side: null,
      metadata: match.requiresPresenter ? undefined : { controllerSide: match.controllerSide },
    })

    setSelectedCellIndex(null)
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
                <label className="block text-sm font-bold text-[#1f1147]">اختر الفريق</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedColor("team_b")}
                    className={`h-12 rounded-[1.35rem] border px-4 text-sm font-black text-white transition ${selectedColor === "team_b" ? "border-[#0f766e] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] shadow-[0_10px_24px_rgba(20,184,166,0.24)] ring-4 ring-[#99f6e4]/40" : "border-[#0f766e] bg-[linear-gradient(135deg,#2dd4bf_0%,#0f766e_100%)] shadow-[0_10px_24px_rgba(20,184,166,0.18)]"}`}
                  >
                    الفريق 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedColor("team_a")}
                    className={`h-12 rounded-[1.35rem] border px-4 text-sm font-black text-white transition ${selectedColor === "team_a" ? "border-[#be123c] bg-[linear-gradient(135deg,#df103a_0%,#be123c_100%)] shadow-[0_10px_24px_rgba(223,16,58,0.22)] ring-4 ring-[#fecdd3]/45" : "border-[#be123c] bg-[linear-gradient(135deg,#fb7185_0%,#df103a_100%)] shadow-[0_10px_24px_rgba(223,16,58,0.18)]"}`}
                  >
                    الفريق 2
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
      teamAName={match?.teamAName || "الفريق 2"}
      teamBName={match?.teamBName || "الفريق 1"}
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
      onCellSelect={isController && !actionLoading && !match?.currentPrompt && match?.currentCellIndex === null ? handleSelectCell : undefined}
      selectedCellIndex={selectedCellIndex}
      onBuzz={isCaptain ? handleBuzz : undefined}
      buzzing={buzzing}
      buzzButtonLabel="الزر"
      buzzDisabled={buzzing || actionLoading || !match?.isOpen || !match?.buzzEnabled || !questionHasStarted || Boolean(match?.firstBuzzSide) || match?.status === "finished"}
      suppressDefaultQuestionOverlay
      questionOverlay={
        match?.status === "waiting" ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.36)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "16px" }}>
            <div style={{ background: "white", padding: "36px 30px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 520, width: "100%" }}>
              <h3 style={{ marginBottom: 12, fontSize: "1.6rem", color: "#2c3e50", fontWeight: 900 }}>بانتظار بدء اللعبة</h3>
            </div>
          </div>
        ) : match?.currentPrompt ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "16px" }}>
            <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              <div key="buzz-panel" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                {match.firstBuzzSide ? (
                  <LetterHiveLiveBuzzTimerCard
                    firstBuzzSide={match.firstBuzzSide}
                    firstBuzzedAt={match.firstBuzzedAt}
                    firstBuzzLabel={firstBuzzLabel}
                    teamAName={match.teamAName || "الفريق 2"}
                    teamBName={match.teamBName || "الفريق 1"}
                    buzzOwnerTimerSeconds={match.buzzOwnerTimerSeconds}
                    buzzOpponentTimerSeconds={match.buzzOpponentTimerSeconds}
                    serverTimeOffsetMs={serverTimeOffsetMs}
                  />
                ) : null}
              </div>
              <div key="question-panel" style={{ background: "white", padding: "36px 30px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 720, width: "100%" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#f5f3ff", color: "#6d28d9", padding: "7px 14px", fontWeight: 900, fontSize: "0.95rem", marginBottom: "16px" }}>
                  {match.currentLetter ? `حرف ${match.currentLetter}` : "سؤال البطولة"}
                </div>
                <h3 style={{ marginBottom: 18, fontSize: "1.3rem", color: "#2c3e50", lineHeight: 1.9, fontWeight: 900 }}>
                  {shouldResumePrompt ? (
                    <AnimatedQuestionText
                      key={`resume:${match.currentCellIndex ?? "none"}:${match.firstBuzzedAt ?? "none"}`}
                      text={match.currentPrompt}
                      ready
                      initialVisibleCount={frozenPromptVisibleCount}
                      onVisibleTextChange={setLatestVisiblePromptText}
                    />
                  ) : match.firstBuzzSide ? (
                    frozenPromptDisplayText
                  ) : (
                    <AnimatedQuestionText
                      text={match.currentPrompt}
                      ready={questionHasStarted}
                      paused={questionHasStarted && (localBuzzPause || Boolean(match.firstBuzzSide))}
                      onVisibleTextChange={setLatestVisiblePromptText}
                    />
                  )}
                </h3>
                {match.showAnswer && match.currentAnswer ? (
                  <div style={{ fontSize: "1.5rem", color: "#008a1e", marginBottom: 18, fontWeight: "bold" }}>{match.currentAnswer}</div>
                ) : null}
                {canManageCurrentQuestion && match.currentAnswer ? (
                  !match.showAnswer ? (
                    <div className="mt-6 flex justify-center">
                      <Button type="button" onClick={() => void handleRevealAnswer()} disabled={actionLoading || !match.firstBuzzSide} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent text-[#6d28d9] hover:bg-[#f5f3ff] disabled:opacity-50">
                        إظهار الجواب
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button type="button" disabled={actionLoading || match.currentCellIndex === null} onClick={() => void handleAssignCell("team_b")} className="min-h-12 rounded-2xl bg-[#10dfb5] px-5 text-sm font-black text-white hover:bg-[#10dfb5] hover:opacity-95 sm:min-w-[150px]">
                          {match.teamBName || "الفريق الأول"}
                        </Button>
                        <Button type="button" disabled={actionLoading || match.currentCellIndex === null} onClick={() => void handleAssignCell("team_a")} className="min-h-12 rounded-2xl bg-[#df103a] px-5 text-sm font-black text-white hover:bg-[#df103a] hover:opacity-95 sm:min-w-[150px]">
                          {match.teamAName || "الفريق الثاني"}
                        </Button>
                        <Button type="button" onClick={() => void handleClearCurrent()} disabled={actionLoading} variant="outline" className="min-h-12 rounded-2xl border-[#d8c9fb] bg-[#faf7ff] px-5 text-sm font-black text-[#6d28d9] hover:bg-[#f5f3ff] sm:min-w-[150px]">
                          محد جاوب
                        </Button>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  )
}