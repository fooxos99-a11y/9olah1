"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { Plus, Minus, HelpCircle, Trophy, RotateCcw } from "lucide-react"
import { GameEntryShell } from "@/components/games/game-entry-shell"
import { GameFinishOverlay } from "@/components/games/game-finish-overlay"

const MIN_TEAMS = 2
const MAX_TEAMS = 10
const AUCTION_BG_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'%3E%3Cg fill='none' stroke='%230f172a' stroke-opacity='0.14' stroke-width='1.1'%3E%3Cpath d='M0 52h260'/%3E%3Cpath d='M0 130h260'/%3E%3Cpath d='M0 208h260'/%3E%3Cpath d='M52 0v260'/%3E%3Cpath d='M130 0v260'/%3E%3Cpath d='M208 0v260'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.24'%3E%3Ccircle cx='52' cy='52' r='3'/%3E%3Ccircle cx='208' cy='130' r='3'/%3E%3Ccircle cx='130' cy='208' r='2.5'/%3E%3C/g%3E%3C/svg%3E\")"

type Team = {
  name: string
  score: number
}

type Question = {
  id: string
  category: {
    id: string
    name: string
  }
  question: string
  answer: string
}

function AuctionPageBackground({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(15,23,42,0.22)_0%,rgba(15,23,42,0.09)_18%,rgba(15,23,42,0)_42%),radial-gradient(circle_at_86%_12%,rgba(239,68,68,0.16)_0%,rgba(239,68,68,0.07)_22%,rgba(239,68,68,0)_44%),radial-gradient(circle_at_78%_74%,rgba(16,185,129,0.14)_0%,rgba(16,185,129,0.05)_18%,rgba(16,185,129,0)_38%),radial-gradient(circle_at_24%_78%,rgba(251,191,36,0.14)_0%,rgba(251,191,36,0.05)_18%,rgba(251,191,36,0)_38%)]" />
      <div className={`absolute -left-24 top-[-140px] rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.26)_0%,rgba(15,23,42,0.09)_34%,rgba(15,23,42,0)_72%)] blur-[8px] ${compact ? "h-[360px] w-[360px]" : "h-[520px] w-[520px]"}`} />
      <div className={`absolute -right-28 bottom-[-150px] rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.18)_0%,rgba(239,68,68,0.07)_34%,rgba(239,68,68,0)_72%)] blur-[10px] ${compact ? "h-[420px] w-[420px]" : "h-[580px] w-[580px]"}`} />
      <div className={`absolute right-[12%] top-[11%] rotate-[14deg] border border-[rgba(255,255,255,0.45)] bg-[linear-gradient(135deg,rgba(255,255,255,0.62)_0%,rgba(255,241,242,0.08)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ${compact ? "h-20 w-20 rounded-[1.5rem]" : "h-28 w-28 rounded-[1.8rem]"}`} />
      <div className={`absolute left-[10%] bottom-[16%] rounded-full border border-white/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.56)_0%,rgba(236,253,245,0.08)_100%)] ${compact ? "h-24 w-24" : "h-36 w-36"}`} />
      <div className={`absolute left-1/2 top-[10%] -translate-x-1/2 rounded-full border border-[rgba(239,68,68,0.18)] bg-[linear-gradient(90deg,rgba(255,255,255,0.46)_0%,rgba(255,241,242,0.08)_100%)] shadow-[0_0_60px_rgba(239,68,68,0.08)] ${compact ? "h-14 w-[220px]" : "h-18 w-[320px]"}`} />
      <div
        className={`absolute inset-0 ${compact ? "opacity-45" : "opacity-65"}`}
        style={{
          backgroundImage: AUCTION_BG_PATTERN,
          backgroundSize: compact ? "180px 180px" : "260px 260px",
          backgroundPosition: "center center",
          maskImage: compact
            ? "radial-gradient(circle at center, black 30%, rgba(0,0,0,0.82) 58%, transparent 92%)"
            : "radial-gradient(circle at center, black 40%, transparent 88%)",
        }}
      />
    </>
  )
}

export default function AuctionGame() {
  const [step, setStep] = useState<"setup" | "game" | "winner">("setup")
  const [teamNames, setTeamNames] = useState<string[]>(["", ""])
  const [teams, setTeams] = useState<Team[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usedCategoryIds, setUsedCategoryIds] = useState<string[]>([])
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showBiddingDialog, setShowBiddingDialog] = useState(false)
  const [bidAmount, setBidAmount] = useState(100)
  const [currentBidder, setCurrentBidder] = useState<number | null>(null)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [timerActive, setTimerActive] = useState(false)

  const [cycleNotification, setCycleNotification] = useState(false)
  const [questionsExhausted, setQuestionsExhausted] = useState(false)
  const [resettingQuestions, setResettingQuestions] = useState(false)

  // تعديل النقاط يدويًا
  const [editingTeam, setEditingTeam] = useState<number | null>(null)
  const [editScore, setEditScore] = useState("")
  // منطق حفظ النقاط المعدلة يدويًا
  const handleSaveScore = () => {
    const newScore = parseInt(editScore) || 0
    if (editingTeam !== null && editingTeam >= 0 && editingTeam < teams.length) {
      const newTeams = [...teams]
      newTeams[editingTeam] = { ...newTeams[editingTeam], score: newScore }
      setTeams(newTeams)
    }
    setEditingTeam(null)
    setEditScore("")
  }

  const handleCancelEdit = () => {
    setEditingTeam(null)
    setEditScore("")
  }

  useEffect(() => {
    fetchQuestions()
    fetchUsedQuestions()
  }, [])

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false)
    }
  }, [timerActive, timeLeft])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/auction-questions")
      const data = await response.json()
      setAllQuestions(data)
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsedQuestions = async () => {
    try {
      const response = await fetch("/api/used-questions?gameType=auction")
      if (!response.ok) {
        setUsedQuestionIds([])
        return
      }
      const data = await response.json()
      setUsedQuestionIds(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching used questions:", error)
      setUsedQuestionIds([])
    }
  }

  const markQuestionAsUsed = async (questionId: string) => {
    try {
      await fetch("/api/used-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "auction", questionId })
      })
    } catch (error) {
      console.error("Error marking question as used:", error)
    }
  }


  // تم تعطيل إعادة تعيين الأسئلة المستخدمة نهائيًا حتى لا تتكرر الأسئلة لنفس الحساب

  const handleTeamNameChange = (index: number, value: string) => {
    const newNames = [...teamNames]
    newNames[index] = value
    setTeamNames(newNames)
  }

  const addTeamField = () => {
    if (teamNames.length >= MAX_TEAMS) {
      return
    }

    setTeamNames((currentNames) => [...currentNames, ""])
  }

  const removeTeamField = (index: number) => {
    if (teamNames.length <= MIN_TEAMS) {
      return
    }

    setTeamNames((currentNames) => currentNames.filter((_, currentIndex) => currentIndex !== index))
  }

  const startGame = () => {
    const normalizedTeamNames = teamNames.map((name) => name.trim())

    if (normalizedTeamNames.every((name) => name)) {
      const initialTeams = normalizedTeamNames.map((name) => ({
        name,
        score: 1000
      }))
      setTeams(initialTeams)
      setUsedCategoryIds([])
      setStep("game")
    }
  }

  const commitQuestionSelection = async (question: Question, nextUsedCategoryIds: string[]) => {
    setCurrentQuestion(question)
    setUsedCategoryIds(nextUsedCategoryIds)
    setUsedQuestionIds((currentUsedIds) => (
      currentUsedIds.includes(question.id) ? currentUsedIds : [...currentUsedIds, question.id]
    ))
    await markQuestionAsUsed(question.id)
  }

  const getNextQuestionByCategoryCycle = (
    questions: Question[],
    consumedCategoryIds: string[],
    excludedCategoryIds: string[] = [],
  ) => {
    const eligibleQuestions = questions.filter((question) => !excludedCategoryIds.includes(question.category.id))

    if (eligibleQuestions.length === 0) {
      return { question: null, nextUsedCategoryIds: consumedCategoryIds }
    }

    const allAvailableCategoryIds = Array.from(
      new Map(questions.map((question) => [question.category.id, question.category.name])).entries(),
    )
      .sort((leftCategory, rightCategory) => leftCategory[1].localeCompare(rightCategory[1], "ar"))
      .map(([categoryId]) => categoryId)

    const eligibleCategoryIds = Array.from(
      new Map(eligibleQuestions.map((question) => [question.category.id, question.category.name])).entries(),
    )
      .sort((leftCategory, rightCategory) => leftCategory[1].localeCompare(rightCategory[1], "ar"))
      .map(([categoryId]) => categoryId)

    const normalizedConsumedCategoryIds = consumedCategoryIds.filter((categoryId) => allAvailableCategoryIds.includes(categoryId))
    const prioritizedCategoryIds = eligibleCategoryIds.filter((categoryId) => !normalizedConsumedCategoryIds.includes(categoryId))
    const shouldResetCycle = prioritizedCategoryIds.length === 0
    const nextCategoryId = (shouldResetCycle ? eligibleCategoryIds : prioritizedCategoryIds)[0]
    const categoryQuestions = eligibleQuestions.filter((question) => question.category.id === nextCategoryId)
    const randomQuestion = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)]

    return {
      question: randomQuestion,
      nextUsedCategoryIds: shouldResetCycle ? [nextCategoryId] : [...normalizedConsumedCategoryIds, nextCategoryId],
    }
  }

  const adjustScore = (teamIndex: number, amount: number) => {
    setTeams(teams.map((team, index) => {
      if (index === teamIndex) {
        const newScore = Math.max(0, team.score + amount)
        // التحقق من الفوز التلقائي
        if (newScore >= 10000) {
          setStep("winner")
          return { ...team, score: newScore }
        }
        return { ...team, score: newScore }
      }
      return team
    }))
  }

  const resetUsedQuestions = async () => {
    try {
      await fetch("/api/used-questions?gameType=auction", { method: "DELETE" })
      setUsedQuestionIds([])
    } catch (error) {
      console.error("Error resetting used questions:", error)
    }
  }

  const handleResetQuestions = async () => {
    setResettingQuestions(true)

    try {
      await resetUsedQuestions()
      await fetchUsedQuestions()
      setUsedCategoryIds([])
      setQuestionsExhausted(false)
      setCycleNotification(false)
    } finally {
      setResettingQuestions(false)
    }
  }

  const selectQuestion = async () => {
    const usedIds = Array.isArray(usedQuestionIds) ? usedQuestionIds : []
    const availableQuestions = allQuestions.filter(q => !usedIds.includes(q.id))

    if (availableQuestions.length === 0) {
      setQuestionsExhausted(true)
      setCycleNotification(true)
      setTimeout(() => setCycleNotification(false), 3000)
    }

    if (availableQuestions.length === 0) return

    setQuestionsExhausted(false)

    const { question: randomQuestion, nextUsedCategoryIds } = getNextQuestionByCategoryCycle(availableQuestions, usedCategoryIds)
    if (!randomQuestion) return

    await commitQuestionSelection(randomQuestion, nextUsedCategoryIds)
    setShowCategoryDialog(true)
  }

  const startBidding = (teamIndex: number) => {
    setCurrentBidder(teamIndex)
    setBidAmount(100)
    setShowCategoryDialog(false)
    setShowBiddingDialog(true)
  }

  const adjustBid = (amount: number) => {
    setBidAmount(prev => Math.max(100, prev + amount))
  }

  const confirmBid = () => {
    setShowAnswer(false)
    setShowBiddingDialog(false)
    setShowQuestionDialog(true)
    setTimeLeft(60)
    setTimerActive(true)
  }

  const handleCorrectAnswer = () => {
    if (currentBidder !== null) {
      setTeams(teams.map((team, index) => {
        if (index === currentBidder) {
          const newScore = team.score + bidAmount
          if (newScore >= 10000) {
            setStep("winner")
          }
          return { ...team, score: newScore }
        }
        return team
      }))
    }
    setShowQuestionDialog(false)
    setCurrentQuestion(null)
    setCurrentBidder(null)
    setTimerActive(false)
  }

  const handleWrongAnswer = () => {
    if (currentBidder !== null) {
      setTeams(teams.map((team, index) => {
        if (index === currentBidder) {
          return { ...team, score: Math.max(0, team.score - bidAmount) }
        }
        return team
      }))
    }
    setShowQuestionDialog(false)
    setCurrentQuestion(null)
    setCurrentBidder(null)
    setTimerActive(false)
  }

  const endGame = () => {
    setStep("winner")
  }

  const resetGame = () => {
    setStep("setup")
    setTeamNames(["", ""])
    setTeams([])
    setUsedCategoryIds([])
    setQuestionsExhausted(false)
    setCurrentQuestion(null)
    setShowAnswer(false)
  }

  const winnerTeam = teams.reduce((prev, current) => 
    (prev.score > current.score) ? prev : current
  , teams[0])
  const finalRankings = [...teams].sort((a, b) => b.score - a.score)

  // صفحة الإعداد
  if (step === "setup") {
    return (
      <GameEntryShell
        title="لعبة المزاد"
        badge="إعداد الجولة"
        containerClassName="max-w-3xl"
        className="bg-[linear-gradient(180deg,#fff7f7_0%,#fef2f2_26%,#f0fdf4_64%,#ffffff_100%)]"
        backgroundDecor={<AuctionPageBackground />}
      >
          <div className="space-y-5 md:px-2">
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#1f1147] md:text-base">أسماء الفرق</div>
              {teamNames.map((name, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder={`اكتب اسم الفريق ${index + 1}`}
                      value={name}
                      onChange={(e) => handleTeamNameChange(index, e.target.value)}
                      className="h-14 rounded-2xl border border-[#d8c9fb]/80 bg-transparent px-4 text-right text-[#3f2a76] placeholder:text-[#8f7fb1] focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeTeamField(index)}
                      disabled={teamNames.length <= MIN_TEAMS}
                      className="h-14 min-w-14 rounded-2xl border-[#d8c9fb]/80 bg-transparent px-4 text-[#6d28d9] hover:bg-[#f5f3ff]/20 disabled:text-[#c3b2ea]"
                      title="حذف الفريق"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                  </div>

                  {index === teamNames.length - 1 ? (
                    <Button
                      type="button"
                      onClick={addTeamField}
                      disabled={teamNames.length >= MAX_TEAMS}
                      className="h-10 rounded-2xl bg-[#7c3aed] px-4 text-sm font-bold text-white hover:bg-[#6d28d9] disabled:bg-[#cdb8fb]"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      إضافة فريق
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>

            <Button
              onClick={startGame}
              disabled={!teamNames.every((name) => name.trim()) || loading}
              className="h-14 w-full rounded-2xl bg-[#7c3aed] text-lg font-black text-white hover:bg-[#6d28d9]"
            >
              {loading ? <SiteLoader size="sm" color="#ffffff" /> : "ابدأ اللعبة"}
            </Button>
          </div>
      </GameEntryShell>
    )
  }

  // صفحة الفائز
  if (step === "winner") {
    return (
      <GameFinishOverlay
        title={`مبروك الفوز للفريق: ${winnerTeam?.name ?? "-"}`}
        subtitle={`${winnerTeam?.score?.toLocaleString() ?? "0"} نقطة`}
        details={
          <div className="space-y-4 text-right">
            {finalRankings.map((team, index) => (
              <div key={`${team.name}-${index}`} className="flex items-center justify-between rounded-[1.35rem] border border-[#f0b5b5]/55 bg-[linear-gradient(135deg,rgba(255,241,242,0.72)_0%,rgba(240,253,244,0.38)_100%)] p-4">
                <span className="text-lg font-black text-[#1f1147]">{index + 1}. {team.name}</span>
                <span className="text-xl font-black text-[#7c3aed]">{team.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        }
        actions={[
          {
            label: "لعب مرة أخرى",
            onClick: resetGame,
            icon: <RotateCcw className="mr-2 h-5 w-5" />,
          },
        ]}
      />
    )
  }

  // صفحة اللعبة
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fff7f7_0%,#fef2f2_26%,#f0fdf4_64%,#ffffff_100%)] p-4 sm:p-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <AuctionPageBackground compact />
      </div>

      {/* إشعار إعادة الأسئلة */}
      {cycleNotification && (
        <div className="fixed top-4 inset-x-0 mx-auto max-w-sm z-50 px-4">
          <div className="bg-[#1f1147] text-white text-sm font-semibold text-center rounded-xl px-5 py-3 shadow-xl">
            انتهت الأسئلة المتاحة لهذا المستخدم في لعبة المزاد.
          </div>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 rounded-[2rem] border border-[#d8c9fb]/55 bg-transparent px-6 py-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[2px] sm:mb-10 sm:px-8 sm:py-8">
          <h1 className="mb-3 pb-[0.18em] text-3xl font-black leading-[1.2] bg-gradient-to-r from-[#1f1147] to-[#7c3aed] bg-clip-text text-transparent sm:text-5xl">
            🏆 لعبة المزاد
          </h1>
          <p className="text-base font-bold leading-[1.7] text-[#4c4570] sm:text-lg">
            زايد على السؤال اللي واثق بإجابته واحسم الجولة لصالح فريقك.
          </p>
        </div>

        {/* عرض الفرق مع إمكانية تعديل النقاط */}
        <div className={`grid gap-4 sm:gap-6 mb-6 sm:mb-10 ${
          teams.length === 2 ? 'grid-cols-2' : 
          teams.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 
          'grid-cols-2 lg:grid-cols-4'
        }`}>
          {teams.map((team, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#c4b5fd]/10 to-[#a78bfa]/8 blur-sm transition-all group-hover:from-[#c4b5fd]/16 group-hover:to-[#a78bfa]/12 group-hover:blur-md"></div>
              <div className="relative rounded-2xl border border-[#c4b5fd]/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.52)_0%,rgba(248,245,255,0.34)_100%)] p-6 shadow-[0_16px_34px_rgba(124,58,237,0.08)] backdrop-blur-[2px] transition-all hover:border-[#c4b5fd]/65 sm:p-8">
                <div className="text-center">
                  <h3 className="mb-3 text-xl font-bold text-[#00312e] sm:mb-4 sm:text-2xl">
                    {team.name}
                  </h3>
                  <div className="relative flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTeam(index)
                        setEditScore(team.score.toString())
                      }}
                      className="focus:outline-none"
                      title="تعديل النقاط"
                    >
                      <span className="mb-1 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] bg-clip-text text-4xl font-black text-transparent sm:text-6xl">
                        {team.score.toLocaleString()}
                      </span>
                    </button>
                    {/* كلمة نقطة أُزيلت بناءً على طلب المستخدم */}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {questionsExhausted ? (
          <div className="mb-6 rounded-2xl border border-[#f0b5b5]/55 bg-[linear-gradient(135deg,rgba(255,241,242,0.84)_0%,rgba(240,253,244,0.46)_100%)] px-5 py-4 text-center shadow-sm sm:mb-8">
            <div className="text-sm font-bold text-[#6d28d9] sm:text-base">
              انتهت الأسئلة المتاحة لهذا المستخدم في لعبة المزاد. يمكنك إعادة الأسئلة ثم متابعة اللعب.
            </div>
            <Button
              onClick={() => {
                void handleResetQuestions()
              }}
              className="mt-4 rounded-xl bg-[#7c3aed] px-6 py-2 text-sm font-black text-white hover:bg-[#6d28d9]"
            >
              {resettingQuestions ? "جارٍ إعادة الأسئلة..." : "إعادة الأسئلة"}
            </Button>
          </div>
        ) : null}
      {/* مودال تعديل النقاط */}
      <Dialog open={editingTeam !== null} onOpenChange={handleCancelEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-[#1a2332]">
              تعديل نقاط {editingTeam !== null ? teams[editingTeam]?.name : ""}
        </DialogTitle>
        </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editScore" className="text-lg font-semibold text-[#1a2332]">
                النقاط الجديدة
              </Label>
              <div className="flex items-center gap-8 mt-2 justify-center">
                <Button
                  type="button"
                  onClick={() => setEditScore((prev) => (parseInt(prev || "0") - 100).toString())}
                  className="text-4xl px-8 py-4 bg-transparent text-red-700 hover:bg-red-100 border-none shadow-none"
                  disabled={parseInt(editScore || "0") <= 0}
                >
                  -
                </Button>
                <span className="text-3xl font-bold w-16 text-center select-none">
                  {editScore}
                </span>
                <Button
                  type="button"
                  onClick={() => setEditScore((prev) => (parseInt(prev || "0") + 100).toString())}
                  className="text-4xl px-8 py-4 bg-transparent text-green-700 hover:bg-green-100 border-none shadow-none"
                >
                  +
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveScore}
                className="flex-1 text-lg py-6 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white shadow-lg"
              >
                حفظ
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex-1 text-lg py-6 border-2 border-gray-300 hover:bg-gray-100"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* أزرار التحكم */}
        <div className="pt-2 sm:pt-3">
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              onClick={selectQuestion}
              size="lg"
              disabled={loading || allQuestions.length === 0}
              className="group flex-1 rounded-[1.6rem] border border-[#c4b5fd]/45 bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_55%,#5b21b6_100%)] px-8 py-6 text-lg text-white shadow-[0_18px_38px_rgba(124,58,237,0.24)] transition-all hover:-translate-y-0.5 hover:border-[#ddd6fe]/70 hover:shadow-[0_24px_54px_rgba(109,40,217,0.3)] sm:py-7 sm:text-xl"
            >
              <HelpCircle className="mr-2 h-6 w-6 opacity-90 transition group-hover:scale-110" />
              سؤال جديد
            </Button>
            <Button
              onClick={endGame}
              size="lg"
              className="group flex-1 rounded-[1.6rem] border border-[#fca5a5]/50 bg-[linear-gradient(135deg,#ff3b3b_0%,#ef4444_52%,#dc2626_100%)] px-8 py-6 text-lg text-white shadow-[0_18px_38px_rgba(239,68,68,0.22)] transition-all hover:-translate-y-0.5 hover:border-[#fecaca]/72 hover:shadow-[0_24px_54px_rgba(220,38,38,0.28)] sm:flex-none sm:py-7 sm:text-xl"
            >
              <Trophy className="mr-2 h-6 w-6 opacity-90 transition group-hover:scale-110" />
              إنهاء اللعبة
            </Button>
          </div>
        </div>
      </div>

      {/* مودال عرض الفئة واختيار الفريق مع زر إعادة */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center text-[#1a2332] mb-4 flex items-center justify-center gap-2">
              <span>الفئة</span>
              {/* زر تغيير الفئة */}
              {currentQuestion && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="تغيير الفئة"
                  onClick={async () => {
                    const availableQuestions = allQuestions.filter(
                      (question) => !usedQuestionIds.includes(question.id),
                    )

                    if (availableQuestions.length === 0) {
                      alert("لا يوجد فئة أخرى بها أسئلة متاحة!");
                      return
                    }

                    const { question: randomQuestion, nextUsedCategoryIds } = getNextQuestionByCategoryCycle(
                      availableQuestions,
                      usedCategoryIds,
                      [currentQuestion.category.id],
                    )

                    if (!randomQuestion) {
                      alert("لا يوجد سؤال متاح في الفئة الجديدة!");
                      return
                    }

                    await commitQuestionSelection(randomQuestion, nextUsedCategoryIds)
                  }}
                  className="ml-2"
                >
                  <RotateCcw className="w-6 h-6 text-[#7c3aed]" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
            <div className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] rounded-lg p-6 sm:p-12 mb-4 sm:mb-6">
              <p className="text-2xl sm:text-4xl text-center font-black text-white">
                {currentQuestion?.category.name}
              </p>
            </div>

            <p className="text-base sm:text-xl text-center text-[#1a2332] font-semibold mb-4 sm:mb-6">
              اختر الفريق الذي سيزايد:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {teams.map((team, index) => (
                <Button
                  key={index}
                  onClick={() => startBidding(index)}
                  className="bg-gradient-to-r from-[#fcfbff] to-[#f5f3ff] hover:from-[#7c3aed] hover:to-[#6d28d9] text-[#1a2332] hover:text-white border-2 border-[#cdb8fb] font-bold text-lg py-8"
                >
                  {team.name}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال المزايدة */}
      <Dialog open={showBiddingDialog} onOpenChange={setShowBiddingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center text-[#1a2332] mb-4">
              مبلغ المزاد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {currentBidder !== null && (
              <div className="text-center mb-4">
                <p className="text-xl font-bold text-[#1a2332]">
                  الفريق: {teams[currentBidder]?.name}
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-[#fcfbff] to-[#f5f3ff] rounded-lg p-6 sm:p-12 border-2 border-[#7c3aed]/20">
              <p className="text-3xl sm:text-6xl font-black text-center text-[#7c3aed]">
                {bidAmount.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3 sm:gap-4 justify-center items-center">
              <Button
                onClick={() => adjustBid(-100)}
                size="lg"
                className="bg-gradient-to-br from-[#6d28d9] to-[#5b21b6] hover:from-[#5b21b6] hover:to-[#4c1d95] text-white text-xl sm:text-2xl h-16 w-16 sm:h-20 sm:w-20 shadow-lg"
              >
                <Minus className="w-6 h-6 sm:w-8 sm:h-8" />
              </Button>
              <span className="text-lg sm:text-2xl font-bold text-[#1a2332]">100</span>
              <Button
                onClick={() => adjustBid(100)}
                size="lg"
                className="bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white text-2xl h-20 w-20 shadow-lg"
              >
                <Plus className="w-8 h-8" />
              </Button>
            </div>

            <Button
              onClick={confirmBid}
              className="w-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white text-xl py-6"
            >
              تأكيد المزاد
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال السؤال مع زر إعادة */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center text-[#1a2332] space-y-2 flex flex-col items-center">
              <div className="flex items-center justify-center gap-2">
                <span>السؤال - مبلغ المزاد: {bidAmount.toLocaleString()}</span>
                {/* زر إعادة السؤال فقط */}
                {currentQuestion && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="تغيير السؤال بنفس الفئة"
                    onClick={async () => {
                      if (!currentQuestion?.category?.id) return;
                      const available = allQuestions.filter(
                        q => q.category.id === currentQuestion.category.id && !usedQuestionIds.includes(q.id) && q.id !== currentQuestion.id
                      )
                      if (available.length === 0) {
                        alert("لا يوجد سؤال آخر متاح في هذه الفئة!")
                        return;
                      }
                      const random = available[Math.floor(Math.random() * available.length)]
                      await commitQuestionSelection(random, usedCategoryIds)
                    }}
                    className="ml-2"
                  >
                    <RotateCcw className="w-6 h-6 text-[#7c3aed]" />
                  </Button>
                )}
              </div>
              <div className="text-2xl font-bold text-[#7c3aed]">
                ⏱️ {timeLeft}s
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] rounded-lg p-4 mb-4">
              <p className="text-xl text-center font-bold text-white">
                {currentQuestion?.category.name}
              </p>
            </div>
            <div className="bg-gradient-to-r from-[#fcfbff] to-[#f5f3ff] rounded-lg p-8 border-2 border-[#7c3aed]/20">
              <p className="text-2xl text-center font-semibold text-[#1a2332]">
                {currentQuestion?.question}
              </p>
            </div>

            {showAnswer && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-8 border-2 border-green-500">
                <p className="text-2xl text-center font-bold text-green-900">
                  الإجابة: {currentQuestion?.answer}
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              {!showAnswer ? (
                <Button
                  onClick={() => setShowAnswer(true)}
                  size="lg"
                  className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white text-xl px-12 py-6"
                >
                  إظهار الإجابة
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCorrectAnswer}
                    size="lg"
                    className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white text-xl px-12 py-6 shadow-lg"
                  >
                    <Plus className="mr-2" />
                    إجابة صحيحة (+{bidAmount.toLocaleString()})
                  </Button>
                  <Button
                    onClick={handleWrongAnswer}
                    size="lg"
                    className="bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] text-white text-xl px-12 py-6 shadow-lg"
                  >
                    <Minus className="mr-2" />
                    إجابة خاطئة (-{bidAmount.toLocaleString()})
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
