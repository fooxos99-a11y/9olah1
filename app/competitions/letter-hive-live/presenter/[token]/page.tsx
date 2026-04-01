"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { DEFAULT_LETTER_HIVE_LIVE_BUZZ_OPPONENT_TIMER_SECONDS, DEFAULT_LETTER_HIVE_LIVE_BUZZ_OWNER_TIMER_SECONDS, DEFAULT_LETTER_HIVE_LIVE_ROUND_TARGET, LETTER_HIVE_LIVE_BASE_LETTERS, MAX_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS, MAX_LETTER_HIVE_LIVE_ROUND_TARGET, MIN_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS, MIN_LETTER_HIVE_LIVE_ROUND_TARGET, hasCompletedLetterHiveLiveRound, type LetterHiveLivePlayerSlot } from "@/lib/letter-hive-live"
import { supabase } from "@/lib/supabase-client"
import { AnimatedQuestionText, LetterHiveLiveBuzzTimerCard, LetterHiveLiveView, splitIntoGraphemes, useLetterHiveLiveBuzzTimer, useSynchronizedQuestionStart } from "@/components/games/letter-hive-live-view"
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
  firstBuzzPlayerName: string | null
  teamAName: string | null
  teamBName: string | null
  teamAScore: number
  teamBScore: number
  playersPerTeam: number
  requiresPresenter: boolean
  controllerSide: "team_a" | "team_b"
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
  playerSlots: LetterHiveLivePlayerSlot[]
  boardLetters: string[]
  claimedCells: Array<"team_a" | "team_b" | null>
  links: {
    presenter: string
    teamA: string
    teamB: string
    players: Array<{
      slot: number
      href: string
    }>
  }
}

type PreloadedQuestion = {
  id: string
  question: string
  answer: string
}

type MatchBroadcastPatch = Partial<Pick<PresenterMatch, "status" | "isOpen" | "buzzEnabled" | "firstBuzzSide" | "firstBuzzedAt" | "firstBuzzPlayerName" | "teamAName" | "teamBName" | "teamAScore" | "teamBScore" | "requiresPresenter" | "controllerSide" | "roundTarget" | "buzzOwnerTimerSeconds" | "buzzOpponentTimerSeconds" | "currentPrompt" | "currentAnswer" | "currentLetter" | "currentCellIndex" | "currentPromptStartedAt" | "showAnswer" | "updatedAt" | "playerSlots" | "boardLetters" | "claimedCells">>

const LIVE_SYNC_INTERVAL_MS = 2000

function PlayerLinkCard({
  title,
  href,
  playerName,
  playerColor,
  accentClass,
  statusLabel,
  showLink = true,
  onCopy,
}: {
  title: string
  href: string
  playerName: string | null
  playerColor: "team_a" | "team_b" | null
  accentClass: string
  statusLabel?: string | null
  showLink?: boolean
  onCopy?: () => void
}) {
  const joined = Boolean(playerName && playerColor)
  const colorLabel = playerColor === "team_a" ? "الفريق 2" : playerColor === "team_b" ? "الفريق 1" : null
  const resolvedStatusLabel = statusLabel ?? (joined ? `${playerName} • ${colorLabel}` : "بانتظار دخول اللاعب")

  return (
    <div className={`rounded-[1.8rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,244,255,0.9)_100%)] text-right shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${showLink ? "p-4" : "flex min-h-[220px] flex-col items-center justify-center p-6 text-center"}`}>
      <div className={showLink ? "flex items-center justify-between gap-3" : "w-full space-y-5"}>
        <div className={showLink ? "" : "flex flex-col items-center justify-center"}>
          <p className={showLink ? "text-base font-black text-[#1f1147]" : "text-3xl font-semibold tracking-tight text-[#1f1147] md:text-4xl"}>{title}</p>
          <p className={`${showLink ? "mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-black" : "mt-4 inline-flex rounded-full px-4 py-2 text-lg font-medium md:text-xl"} ${accentClass}`}>
            {resolvedStatusLabel}
          </p>
        </div>
      </div>

      {showLink ? (
        <>
          <div className="mt-4 rounded-2xl border border-[#e7dcff] bg-white/80 px-4 py-3 text-left text-xs text-[#5b5570]" dir="ltr">
            <span className="block truncate">{href}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={onCopy} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent text-[#6d28d9] hover:bg-[#f5f3ff]">
              <Copy className="h-4 w-4" />نسخ الرابط
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function LetterHiveLivePresenterPage() {
  const params = useParams<{ token: string }>()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token || ""
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const selectionLockRef = useRef(false)

  const [match, setMatch] = useState<PresenterMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null)
  const [questionsByLetter, setQuestionsByLetter] = useState<Record<string, PreloadedQuestion[]>>({})
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0)
  const [localBuzzPause, setLocalBuzzPause] = useState(false)
  const [latestVisiblePromptText, setLatestVisiblePromptText] = useState("")
  const [frozenPromptText, setFrozenPromptText] = useState("")
  const latestVisiblePromptTextRef = useRef("")
  const [roundTargetDraft, setRoundTargetDraft] = useState(DEFAULT_LETTER_HIVE_LIVE_ROUND_TARGET)
  const [buzzOwnerTimerDraft, setBuzzOwnerTimerDraft] = useState(DEFAULT_LETTER_HIVE_LIVE_BUZZ_OWNER_TIMER_SECONDS)
  const [buzzOpponentTimerDraft, setBuzzOpponentTimerDraft] = useState(DEFAULT_LETTER_HIVE_LIVE_BUZZ_OPPONENT_TIMER_SECONDS)
  const [buzzing, setBuzzing] = useState(false)
  const [showFirstCenterHint, setShowFirstCenterHint] = useState(false)

  const syncServerTimeOffset = (serverNow?: string | null) => {
    if (!serverNow) {
      return
    }

    const nextOffsetMs = Date.parse(serverNow) - Date.now()
    if (Number.isFinite(nextOffsetMs)) {
      setServerTimeOffsetMs(nextOffsetMs)
    }
  }

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

  const buildBroadcastMatchPatch = (nextMatch: PresenterMatch): MatchBroadcastPatch => ({
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
      const response = await fetch(`/api/letter-hive-live/session?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر جلب المباراة")
      }

      syncServerTimeOffset(data?.serverNow)
      setMatch(data.match)
      setError("")
      return data.match as PresenterMatch
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
  }, [match?.id])

  const boardLetters = useMemo(() => {
    if (!match?.boardLetters?.length) {
      return LETTER_HIVE_LIVE_BASE_LETTERS
    }

    return match.boardLetters
  }, [match])
  const boardLettersKey = useMemo(() => boardLetters.join(","), [boardLetters])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const preloadQuestions = async () => {
      try {
        const response = await fetch(`/api/letter-hive-live/question?token=${encodeURIComponent(token)}&letters=${encodeURIComponent(boardLettersKey)}&perLetterLimit=1`, {
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
  }, [boardLettersKey, token])

  useEffect(() => {
    selectionLockRef.current = Boolean(match?.currentPrompt) || actionLoading
  }, [actionLoading, match?.currentPrompt])

  const { hasStarted: questionHasStarted } = useSynchronizedQuestionStart(Boolean(match?.currentPrompt), match?.currentPromptStartedAt ?? match?.updatedAt, serverTimeOffsetMs, `${match?.currentCellIndex ?? "none"}:${match?.currentPrompt ?? ""}`)
  const buzzTimerState = useLetterHiveLiveBuzzTimer(
    match?.firstBuzzSide ?? null,
    match?.firstBuzzedAt,
    (match?.buzzOwnerTimerSeconds ?? 0) * 1000,
    (match?.buzzOpponentTimerSeconds ?? 0) * 1000,
    serverTimeOffsetMs,
  )
  const shouldResumePrompt = Boolean(match?.firstBuzzSide) && buzzTimerState.phase === "opponent"
  const shouldShowFullPrompt = Boolean(match?.firstBuzzSide) && buzzTimerState.phase === null
  const frozenPromptDisplayText = frozenPromptText || latestVisiblePromptText || latestVisiblePromptTextRef.current
  const frozenPromptVisibleCount = useMemo(() => splitIntoGraphemes(frozenPromptDisplayText).length, [frozenPromptDisplayText])

  useEffect(() => {
    setRoundTargetDraft(match?.roundTarget || DEFAULT_LETTER_HIVE_LIVE_ROUND_TARGET)
  }, [match?.roundTarget])

  useEffect(() => {
    setBuzzOwnerTimerDraft(match?.buzzOwnerTimerSeconds || DEFAULT_LETTER_HIVE_LIVE_BUZZ_OWNER_TIMER_SECONDS)
    setBuzzOpponentTimerDraft(match?.buzzOpponentTimerSeconds || DEFAULT_LETTER_HIVE_LIVE_BUZZ_OPPONENT_TIMER_SECONDS)
  }, [match?.buzzOpponentTimerSeconds, match?.buzzOwnerTimerSeconds])

  const firstBuzzLabel = useMemo(() => {
    if (!match?.firstBuzzSide) {
      return "لا يوجد ضغط مسجل"
    }

    if (match.firstBuzzPlayerName) {
      return match.firstBuzzPlayerName
    }

    return match.firstBuzzSide === "team_a"
      ? match.teamAName || "الفريق 2"
      : match.teamBName || "الفريق 1"
  }, [match])

  const claimedCells = useMemo(() => {
    if (!match?.claimedCells?.length) {
      return Array(25).fill(null) as Array<"team_a" | "team_b" | null>
    }

    return match.claimedCells
  }, [match])

  const isNoPresenterController = !match?.requiresPresenter && match?.controllerSide === "team_b"
  const isFirstNoPresenterTurn = !match?.requiresPresenter && !claimedCells.some(Boolean) && (match?.teamAScore ?? 0) === 0 && (match?.teamBScore ?? 0) === 0
  const selectableCellIndexes = isNoPresenterController && isFirstNoPresenterTurn ? [12] : undefined

  const playerColorCounts = useMemo(() => {
    const teamAPlayers = match?.playerSlots.filter((playerSlot) => playerSlot.color === "team_a" && playerSlot.name).length || 0
    const teamBPlayers = match?.playerSlots.filter((playerSlot) => playerSlot.color === "team_b" && playerSlot.name).length || 0

    return {
      teamAPlayers,
      teamBPlayers,
    }
  }, [match?.playerSlots])

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
    if (!match || match.requiresPresenter) {
      setShowFirstCenterHint(false)
      return
    }

    const hasSeenHint = window.sessionStorage.getItem(`letter-hive-no-presenter-center-hint:${match.id}`) === "seen"
    const shouldShow = !hasSeenHint && !match.currentPrompt && match.currentCellIndex === null && !claimedCells.some(Boolean) && match.controllerSide === "team_b"
    setShowFirstCenterHint(shouldShow)
  }, [claimedCells, match?.controllerSide, match?.currentCellIndex, match?.currentPrompt, match?.id, match?.requiresPresenter])

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
    if (!match?.isOpen || match.status === "waiting" || match.status === "finished") {
      setError("ابدأ اللعبة أولاً")
      return
    }

    if (!match.requiresPresenter && !isNoPresenterController) {
      setError("ليس دورك لاختيار الحرف الآن")
      return
    }

    if (selectionLockRef.current || actionLoading || match.currentPrompt || match.currentCellIndex !== null) {
      return
    }

    selectionLockRef.current = true

    setSelectedCellIndex(index)
    const letter = boardLetters[index] || ""
    const nextPreloadedQuestion = letter ? questionsByLetter[letter]?.[0] : undefined

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

      syncServerTimeOffset(data?.serverNow)
      setMatch(data.match)
      if (letter) {
        setQuestionsByLetter((previousQuestions) => ({
          ...previousQuestions,
          [letter]: data.preloadedQuestion ? [data.preloadedQuestion] : [],
        }))
      }
      setError("")
      void broadcastMatchUpdate(buildBroadcastMatchPatch(data.match), data?.serverNow)
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
      if (!match?.currentPrompt) {
        selectionLockRef.current = false
      }
    }
  }

  const handleRevealAnswer = async () => {
    if (!match?.currentPrompt || !match?.currentAnswer) {
      setError("لا يوجد سؤال جارٍ لعرض جوابه")
      return
    }

    if (!match.firstBuzzSide) {
      setError("لا يمكن إظهار الجواب قبل ضغط الزر")
      return
    }

    await updateState({ show_answer: true })
  }

  const handleBuzz = async () => {
    if (!match || match.requiresPresenter) {
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
        body: JSON.stringify({ token }),
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

  const handleAssignCell = async (side: "team_a" | "team_b") => {
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
    await updateState({
      current_prompt: null,
      current_answer: null,
      current_letter: null,
      current_cell_index: null,
      show_answer: false,
      buzz_enabled: false,
      first_buzz_side: null,
      metadata: match?.requiresPresenter ? undefined : { controllerSide: match?.controllerSide },
    })

    setSelectedCellIndex(null)
  }

  const requiredPlayersPerTeam = match?.playersPerTeam ?? 2
  const canStartGame = playerColorCounts.teamAPlayers === requiredPlayersPerTeam && playerColorCounts.teamBPlayers === requiredPlayersPerTeam
  const canSelectBoardCell = !actionLoading && !showFirstCenterHint && !match?.currentPrompt && match?.currentCellIndex === null && selectedCellIndex === null && (Boolean(match?.requiresPresenter) || isNoPresenterController)
  const canManageCurrentQuestion = Boolean(match?.requiresPresenter) || match?.controllerSide === "team_b"

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
      teamAName={match?.teamAName || "الفريق 2"}
      teamBName={match?.teamBName || "الفريق 1"}
      teamAScore={match?.teamAScore ?? 0}
      teamBScore={match?.teamBScore ?? 0}
      roundTarget={match?.roundTarget ?? DEFAULT_LETTER_HIVE_LIVE_ROUND_TARGET}
      boardLetters={boardLetters}
      claimedCells={claimedCells}
      currentPrompt={match?.currentPrompt || null}
      currentAnswer={match?.currentAnswer || null}
      showAnswer={Boolean(match?.showAnswer)}
      currentCellIndex={match?.currentCellIndex ?? null}
      error={error}
      onCellSelect={canSelectBoardCell ? handleSelectCell : undefined}
      selectedCellIndex={selectedCellIndex}
      selectableCellIndexes={selectableCellIndexes}
      onBuzz={!match?.requiresPresenter ? handleBuzz : undefined}
      buzzing={buzzing}
      buzzButtonLabel="الزر"
      buzzDisabled={buzzing || actionLoading || !match?.isOpen || !match?.buzzEnabled || !questionHasStarted || Boolean(match?.firstBuzzSide) || match?.status === "finished"}
      suppressDefaultQuestionOverlay
      questionOverlay={
        match?.status === "waiting" ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.36)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "16px" }}>
            <div style={{ background: "white", padding: "26px 22px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 980, width: "100%" }}>
              <h3 style={{ marginBottom: 12, fontSize: "1.6rem", color: "#2c3e50", fontWeight: 900 }}>جاهز لبدء اللعبة</h3>
              {!canStartGame ? (
                <p style={{ marginBottom: 20, fontSize: "1rem", color: "#6b7280", lineHeight: 1.9 }}>
                  {`يجب أن يكتمل كل لون بعدد ${requiredPlayersPerTeam} من اللاعبين قبل أن تستطيع بدء اللعبة.`}
                </p>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="space-y-4">
                  <div className="rounded-[1.6rem] border border-[#e7dcff] bg-[linear-gradient(180deg,rgba(248,244,255,0.9)_0%,rgba(255,255,255,0.96)_100%)] p-4 text-center shadow-[0_12px_30px_rgba(124,58,237,0.08)]">
                    <p className="text-sm font-black text-[#6d28d9]">الفوز من كم جولة</p>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <Button type="button" onClick={() => setRoundTargetDraft((previousValue) => Math.max(MIN_LETTER_HIVE_LIVE_ROUND_TARGET, previousValue - 1))} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent px-4 text-[#6d28d9] hover:bg-[#f5f3ff]">
                        -
                      </Button>
                      <div className="min-w-20 rounded-2xl border border-[#e7dcff] bg-white/85 px-5 py-3 text-xl font-black text-[#1f1147]">
                        {roundTargetDraft}
                      </div>
                      <Button type="button" onClick={() => setRoundTargetDraft((previousValue) => Math.min(MAX_LETTER_HIVE_LIVE_ROUND_TARGET, previousValue + 1))} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent px-4 text-[#6d28d9] hover:bg-[#f5f3ff]">
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-[1.4rem] border border-[#e7dcff] bg-[linear-gradient(180deg,rgba(248,244,255,0.82)_0%,rgba(255,255,255,0.96)_100%)] p-3 text-center shadow-[0_12px_24px_rgba(124,58,237,0.07)] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <p className="text-sm font-black text-[#6d28d9]">ثواني الفريق الأول</p>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <Button type="button" onClick={() => setBuzzOwnerTimerDraft((previousValue) => Math.max(MIN_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS, previousValue - 1))} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent px-4 text-[#6d28d9] hover:bg-[#f5f3ff]">
                          -
                        </Button>
                        <div className="min-w-16 rounded-2xl border border-[#e7dcff] bg-white/90 px-4 py-2 text-lg font-black text-[#1f1147]">
                          {buzzOwnerTimerDraft}
                        </div>
                        <Button type="button" onClick={() => setBuzzOwnerTimerDraft((previousValue) => Math.min(MAX_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS, previousValue + 1))} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent px-4 text-[#6d28d9] hover:bg-[#f5f3ff]">
                          +
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#6d28d9]">ثواني الفريق الثاني</p>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <Button type="button" onClick={() => setBuzzOpponentTimerDraft((previousValue) => Math.max(MIN_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS, previousValue - 1))} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent px-4 text-[#6d28d9] hover:bg-[#f5f3ff]">
                          -
                        </Button>
                        <div className="min-w-16 rounded-2xl border border-[#e7dcff] bg-white/90 px-4 py-2 text-lg font-black text-[#1f1147]">
                          {buzzOpponentTimerDraft}
                        </div>
                        <Button type="button" onClick={() => setBuzzOpponentTimerDraft((previousValue) => Math.min(MAX_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS, previousValue + 1))} variant="outline" className="rounded-2xl border-[#d8c9fb] bg-transparent px-4 text-[#6d28d9] hover:bg-[#f5f3ff]">
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  {match?.requiresPresenter ? (
                    <div className="rounded-[1.6rem] border border-[#e7dcff] bg-[linear-gradient(180deg,rgba(248,244,255,0.9)_0%,rgba(255,255,255,0.96)_100%)] p-4 text-right shadow-[0_12px_30px_rgba(124,58,237,0.08)]">
                      <p className="text-sm font-black text-[#6d28d9]">رابط المقدم</p>
                      <div className="mt-3 flex flex-col gap-3">
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
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-[1.4rem] border border-[#14b8a6]/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.14)_0%,rgba(255,255,255,0.95)_100%)] px-4 py-3 text-right shadow-[0_10px_24px_rgba(20,184,166,0.09)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-[#0f766e]">الفريق 1</span>
                        <span className="rounded-full bg-[#14b8a6] px-3 py-1 text-sm font-black text-white">{playerColorCounts.teamBPlayers}/{requiredPlayersPerTeam}</span>
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-[#df103a]/15 bg-[linear-gradient(135deg,rgba(223,16,58,0.1)_0%,rgba(255,255,255,0.95)_100%)] px-4 py-3 text-right shadow-[0_10px_24px_rgba(223,16,58,0.08)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-[#9f1239]">الفريق 2</span>
                        <span className="rounded-full bg-[#df103a] px-3 py-1 text-sm font-black text-white">{playerColorCounts.teamAPlayers}/{requiredPlayersPerTeam}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid content-start gap-4 sm:grid-cols-2">
                  {match?.links.players.filter((playerLink) => match?.requiresPresenter || playerLink.slot !== 1).map((playerLink) => {
                    const playerSlot = match.playerSlots.find((entry) => entry.slot === playerLink.slot)
                    const isHostReservedTeamOneCard = !match.requiresPresenter && playerLink.slot === 1
                    const accentClass = playerSlot?.color === "team_a"
                      ? "bg-[#df103a]/10 text-[#df103a]"
                      : playerSlot?.color === "team_b"
                        ? "bg-[#10dfb5]/14 text-[#08755f]"
                        : "bg-[#ede9fe] text-[#6d28d9]"

                    return (
                      <PlayerLinkCard
                        key={playerLink.slot}
                        title={isHostReservedTeamOneCard ? (playerSlot?.name || match.teamBName || "المضيف") : `رابط اللاعب ${playerLink.slot}`}
                        href={playerLink.href}
                        playerName={playerSlot?.name || null}
                        playerColor={playerSlot?.color || null}
                        accentClass={accentClass}
                        statusLabel={isHostReservedTeamOneCard ? "الفريق 1" : null}
                        showLink={!isHostReservedTeamOneCard}
                        onCopy={isHostReservedTeamOneCard ? undefined : () => void handleCopy(playerLink.href, `رابط اللاعب ${playerLink.slot}`)}
                      />
                    )
                  })}
                </div>
              </div>

              <Button type="button" onClick={() => void updateState({ is_open: true, status: "live", team_a_score: 0, team_b_score: 0, claimed_cells: Array(25).fill(null), metadata: { roundTarget: roundTargetDraft, buzzOwnerTimerSeconds: buzzOwnerTimerDraft, buzzOpponentTimerSeconds: buzzOpponentTimerDraft } })} disabled={actionLoading || !canStartGame} className="rounded-2xl bg-[#7c3aed] px-8 text-white hover:bg-[#6d28d9] disabled:opacity-50">
                بدء اللعبة
              </Button>
            </div>
          </div>
        ) : showFirstCenterHint ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.36)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110, padding: "16px" }}>
            <div style={{ background: "white", padding: "32px 28px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320, maxWidth: 520, width: "100%" }}>
              <h3 style={{ marginBottom: 12, fontSize: "1.5rem", color: "#2c3e50", fontWeight: 900 }}>تنبيه البداية</h3>
              <p style={{ fontSize: "1rem", color: "#6b7280", lineHeight: 1.9 }}>يمكنك الضغط على الحرف الذي في المنتصف فقط</p>
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  onClick={() => {
                    if (match?.id) {
                      window.sessionStorage.setItem(`letter-hive-no-presenter-center-hint:${match.id}`, "seen")
                    }
                    setShowFirstCenterHint(false)
                  }}
                  className="rounded-2xl bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] px-8 text-white hover:opacity-95"
                >
                  موافق
                </Button>
              </div>
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
                  {shouldShowFullPrompt ? (
                    match.currentPrompt
                  ) : shouldResumePrompt ? (
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
                        <Button type="button" disabled={actionLoading || match.currentCellIndex === null} onClick={() => void handleAssignCell("team_a")} className="min-h-12 rounded-2xl bg-[#df103a] px-5 text-sm font-black text-white hover:bg-[#df103a] hover:opacity-95 sm:min-w-[150px]">
                          {match.teamAName || "الفريق 2"}
                        </Button>
                        <Button type="button" disabled={actionLoading || match.currentCellIndex === null} onClick={() => void handleAssignCell("team_b")} className="min-h-12 rounded-2xl bg-[#10dfb5] px-5 text-sm font-black text-white hover:bg-[#10dfb5] hover:opacity-95 sm:min-w-[150px]">
                          {match.teamBName || "الفريق 1"}
                        </Button>
                        <Button type="button" onClick={() => void handleClearCurrent()} disabled={actionLoading} variant="outline" className="min-h-12 rounded-2xl border-[#d8c9fb] bg-[#faf7ff] px-5 text-sm font-black text-[#6d28d9] hover:bg-[#f5f3ff] sm:min-w-[150px]">
                          محد جاوب
                        </Button>
                      </div>
                    </div>
                  )
                ) : canManageCurrentQuestion ? (
                  <div className="mt-6 flex justify-center">
                    <Button type="button" onClick={() => void handleClearCurrent()} disabled={actionLoading} variant="outline" className="min-h-12 rounded-2xl border-[#d8c9fb] bg-[#faf7ff] px-5 text-sm font-black text-[#6d28d9] hover:bg-[#f5f3ff] sm:min-w-[150px]">
                      محد جاوب
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  )
}