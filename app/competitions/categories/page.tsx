"use client"

import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight, Check } from "lucide-react"
import { GameFinishOverlay } from "@/components/games/game-finish-overlay"
import { GameEntryPanel, GameEntryShell } from "@/components/games/game-entry-shell"

type DBQuestion = {
  id: string
  category_id: string
  question: string
  answer: string
  points: number
  answered?: boolean
  answeredBy?: string | null
}

type DBCategory = {
  id: string
  name: string
  questions: DBQuestion[]
}

type GameQuestion = {
  id: string
  points: number
  question: string
  answer: string
  answered: boolean
  answeredBy: string | null
}

type GameCategory = {
  id: string
  name: string
  questions: GameQuestion[]
}

type CategoryArtwork = {
  imageUrl: string
  imagePosition?: string
  overlayClassName?: string
}

type Step = "teams" | "categories" | "game"

type LifelineButtonProps = {
  icon: ReactNode
  tooltip: string
  ariaLabel: string
  disabled?: boolean
  active?: boolean
  used?: boolean
  tooltipAlign?: "center" | "left" | "right"
  tooltipWidthClass?: string
  onClick?: () => void
}

const MAX_SELECTED_CATEGORIES = 6
const CATEGORIES_BG_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cg fill='none' stroke='%230f766e' stroke-opacity='0.14' stroke-width='1'%3E%3Cpath d='M0 80h240'/%3E%3Cpath d='M0 160h240'/%3E%3Cpath d='M80 0v240'/%3E%3Cpath d='M160 0v240'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.34'%3E%3Ccircle cx='80' cy='80' r='3'/%3E%3Ccircle cx='160' cy='160' r='3'/%3E%3Ccircle cx='160' cy='80' r='2'/%3E%3Ccircle cx='80' cy='160' r='2'/%3E%3C/g%3E%3C/svg%3E\")"

function CategoriesPageBackground({ board = false }: { board?: boolean }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(20,184,166,0.2)_0%,rgba(20,184,166,0.08)_18%,rgba(20,184,166,0)_42%),radial-gradient(circle_at_86%_14%,rgba(8,145,178,0.18)_0%,rgba(8,145,178,0.08)_20%,rgba(8,145,178,0)_42%),radial-gradient(circle_at_72%_76%,rgba(250,204,21,0.18)_0%,rgba(250,204,21,0.06)_16%,rgba(250,204,21,0)_36%),radial-gradient(circle_at_26%_78%,rgba(251,146,60,0.14)_0%,rgba(251,146,60,0.05)_16%,rgba(251,146,60,0)_36%)]" />
      <div className={`absolute -top-28 right-[-120px] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.22)_0%,rgba(20,184,166,0.08)_34%,rgba(20,184,166,0)_70%)] blur-[10px] ${board ? "h-[420px] w-[420px]" : "h-[560px] w-[560px]"}`} />
      <div className={`absolute -bottom-32 left-[-110px] rounded-full bg-[radial-gradient(circle,rgba(8,145,178,0.18)_0%,rgba(8,145,178,0.08)_34%,rgba(8,145,178,0)_72%)] blur-[12px] ${board ? "h-[440px] w-[440px]" : "h-[600px] w-[600px]"}`} />
      <div className={`absolute left-[12%] top-[14%] rounded-full border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(240,253,250,0.18)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-[2px] ${board ? "h-24 w-24" : "h-32 w-32"}`} />
      <div className={`absolute bottom-[18%] right-[14%] rotate-[12deg] border border-[rgba(15,118,110,0.14)] bg-[linear-gradient(135deg,rgba(20,184,166,0.12)_0%,rgba(250,204,21,0.03)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${board ? "h-24 w-24 rounded-[1.75rem]" : "h-36 w-36 rounded-[2rem]"}`} />
      <div className={`absolute left-[50%] top-[10%] -translate-x-1/2 rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.56)_0%,rgba(236,253,245,0.08)_100%)] ${board ? "h-16 w-[240px]" : "h-20 w-[320px]"}`} />
      <div
        className={`absolute inset-0 ${board ? "opacity-45" : "opacity-65"}`}
        style={{
          backgroundImage: CATEGORIES_BG_PATTERN,
          backgroundSize: board ? "180px 180px" : "240px 240px",
          backgroundPosition: "center center",
          maskImage: board
            ? "radial-gradient(circle at center, black 34%, rgba(0,0,0,0.78) 58%, transparent 92%)"
            : "radial-gradient(circle at center, black 42%, transparent 88%)",
        }}
      />
      <div className={`absolute inset-[4%] rounded-[40px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.48)_0%,rgba(236,253,245,0.1)_34%,rgba(255,255,255,0.03)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ${board ? "opacity-70" : "opacity-100"}`} />
    </>
  )
}

const categoryArtworkByName: Record<string, CategoryArtwork> = {
  "القرآن الكريم": {
    imageUrl: "/1.png",
    imagePosition: "center 35%",
    overlayClassName: "bg-[linear-gradient(180deg,rgba(35,16,79,0.2)_0%,rgba(35,16,79,0.58)_42%,rgba(18,8,43,0.92)_100%)]",
  },
  "إسلامي": {
    imageUrl: "/2.png",
  },
  "أسئلة عامة": {
    imageUrl: "/3.png",
  },
  "السعودية": {
    imageUrl: "/4.png",
  },
  "عالم الحيوان": {
    imageUrl: "/5.png",
  },
  "كرة قدم": {
    imageUrl: "/6.png",
  },
  "كرة القدم": {
    imageUrl: "/6.png",
  },
  "علوم": {
    imageUrl: "/7.png",
  },
  "جغرافيا": {
    imageUrl: "/8.png",
  },
  "العاب الكترونية": {
    imageUrl: "/9.png",
  },
  "ألعاب إلكترونية": {
    imageUrl: "/9.png",
  },
  "ألعاب الكترونية": {
    imageUrl: "/9.png",
  },
  "انمي": {
    imageUrl: "/10.png",
  },
  "أنمي": {
    imageUrl: "/10.png",
  },
  "أندية": {
    imageUrl: "/11.png",
  },
  "اندية": {
    imageUrl: "/11.png",
  },
  "كلمات القران": {
    imageUrl: "/12.png",
  },
  "كلمات القرآن": {
    imageUrl: "/12.png",
  },
  "wwe": {
    imageUrl: "/13.png",
  },
  "WWE": {
    imageUrl: "/13.png",
  },
  "التاريخ": {
    imageUrl: "/14.png",
  },
  "تاريخ": {
    imageUrl: "/14.png",
  },
  "ألغاز": {
    imageUrl: "/15.png",
  },
  "الغاز": {
    imageUrl: "/15.png",
  },
  "ألقاب الصحابة": {
    imageUrl: "/16.png",
  },
  "القاب الصحابة": {
    imageUrl: "/16.png",
  },
  "دول وعواصم": {
    imageUrl: "/17.png",
  },
}

function getCategoryArtwork(categoryName: string) {
  return categoryArtworkByName[categoryName] ?? null
}

function LifelineButton({ icon, tooltip, ariaLabel, disabled = false, active = false, used = false, tooltipAlign = "center", tooltipWidthClass = "w-[220px] sm:w-[260px]", onClick }: LifelineButtonProps) {
  const tooltipPositionClass =
    tooltipAlign === "left"
      ? "left-0 translate-x-0"
      : tooltipAlign === "right"
        ? "right-0 translate-x-0"
        : "left-1/2 -translate-x-1/2"

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onClick}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-[#6d28d9] shadow-sm transition ${
          active
            ? "border-[#7c3aed]/45 bg-[#f5f3ff] ring-2 ring-[#7c3aed]/15"
            : "border-[#89d8cf]/60 bg-[linear-gradient(135deg,rgba(240,253,250,0.78)_0%,rgba(236,254,255,0.52)_100%)] hover:border-[#4fd1c5] hover:bg-[linear-gradient(135deg,rgba(204,251,241,0.88)_0%,rgba(207,250,254,0.58)_100%)]"
        } ${disabled ? "cursor-not-allowed border-[#c6ece7] bg-[linear-gradient(135deg,rgba(240,253,250,0.62)_0%,rgba(236,254,255,0.4)_100%)] text-[#8fb8b2] opacity-40 hover:border-[#c6ece7] hover:bg-[linear-gradient(135deg,rgba(240,253,250,0.62)_0%,rgba(236,254,255,0.4)_100%)]" : ""} ${used ? "opacity-45" : ""}`}
      >
        {icon}
      </button>
      {tooltip ? (
        <div className={`pointer-events-none absolute top-full z-20 mt-2 flex max-w-[calc(100vw-2rem)] items-center justify-center rounded-xl bg-[#7c3aed] px-3 py-2 text-center text-xs font-bold leading-6 whitespace-normal break-words text-white opacity-0 shadow-lg transition group-hover:opacity-100 ${tooltipWidthClass} ${tooltipPositionClass}`}>
          {tooltip}
        </div>
      ) : null}
    </div>
  )
}

export default function CategoriesPage() {
  const [step, setStep] = useState<Step>("teams")
  const [allCategories, setAllCategories] = useState<DBCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [gameCategories, setGameCategories] = useState<GameCategory[]>([])
  const [teamNames, setTeamNames] = useState(["", ""])
  const [teamScores, setTeamScores] = useState([0, 0])
  const [selectedQuestion, setSelectedQuestion] = useState<GameQuestion | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [editingTeam, setEditingTeam] = useState<number | null>(null)
  const [editScore, setEditScore] = useState("")
  const [currentTurn, setCurrentTurn] = useState(0)
  const [loading, setLoading] = useState(true)
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(60)
  const [timerActive, setTimerActive] = useState(false)
  const [doublePointsUsed, setDoublePointsUsed] = useState([false, false])
  const [questionBlockUsed, setQuestionBlockUsed] = useState([false, false])
  const [questionStealUsed, setQuestionStealUsed] = useState([false, false])
  const [questionSwapUsed, setQuestionSwapUsed] = useState([false, false])
  const [pendingDoubleTeam, setPendingDoubleTeam] = useState<number | null>(null)
  const [activeDoubleTeam, setActiveDoubleTeam] = useState<number | null>(null)
  const [questionOwnerTeam, setQuestionOwnerTeam] = useState<number | null>(null)
  const [questionBlocked, setQuestionBlocked] = useState(false)
  const [hasQuestionTransferred, setHasQuestionTransferred] = useState(false)
  const [stolenByTeam, setStolenByTeam] = useState<number | null>(null)
  const [questionsResetNeeded, setQuestionsResetNeeded] = useState(false)
  const [resettingQuestions, setResettingQuestions] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchUsedQuestions()
  }, [])

  useEffect(() => {
    if (!timerActive) {
      return
    }

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }

    if (!selectedQuestion || showAnswer) {
      setTimerActive(false)
      return
    }
  }, [hasQuestionTransferred, questionBlocked, selectedQuestion, showAnswer, teamNames.length, timeLeft, timerActive])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setAllCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setAllCategories([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUsedQuestions = async () => {
    try {
      const response = await fetch("/api/used-questions?gameType=categories")
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
        body: JSON.stringify({ gameType: "categories", questionId })
      })
    } catch (error) {
      console.error("Error marking question as used:", error)
    }
  }

  const registerQuestionAsUsed = (questionId: string) => {
    setUsedQuestionIds((prev) => {
      if (prev.includes(questionId)) {
        return prev
      }

      return [...prev, questionId]
    })

    void markQuestionAsUsed(questionId)
  }


  // إعادة تعيين الأسئلة المستخدمة عند بدء لعبة جديدة أو الخروج
  const resetUsedQuestions = async () => {
    try {
      await fetch("/api/used-questions?gameType=categories", {
        method: "DELETE"
      });
      setUsedQuestionIds([]);
    } catch (error) {
      console.error("Error resetting used questions:", error);
    }
  }

  const handleTeamsSubmit = () => {
    const validNames = teamNames.slice(0, 2).map((name) => name.trim())
    if (validNames.every(Boolean)) {
      setTeamNames(validNames)
      setTeamScores([0, 0])
      setDoublePointsUsed([false, false])
      setQuestionBlockUsed([false, false])
      setQuestionStealUsed([false, false])
      setQuestionSwapUsed([false, false])
      setPendingDoubleTeam(null)
      setActiveDoubleTeam(null)
      setQuestionOwnerTeam(null)
      setQuestionBlocked(false)
      setHasQuestionTransferred(false)
      setStolenByTeam(null)
      setStep("categories")
    }
  }

  const toggleCategorySelection = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== categoryId))
    } else if (selectedCategoryIds.length < MAX_SELECTED_CATEGORIES) {
      setSelectedCategoryIds([...selectedCategoryIds, categoryId])
    }
  }

  const startGame = () => {
    const usedIds = Array.isArray(usedQuestionIds) ? usedQuestionIds : []
    let needsReset = false
    // دالة خلط مصفوفة
    function shuffle(arr: any[]) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const selected = allCategories
      .filter(cat => selectedCategoryIds.includes(cat.id))
      .map(cat => {
        const availableQuestions = cat.questions.filter(q => !usedIds.includes(q.id))
        // تصنيف الأسئلة حسب النقاط
        const q200 = shuffle(availableQuestions.filter(q => q.points === 200))
        const q400 = shuffle(availableQuestions.filter(q => q.points === 400))
        const q600 = shuffle(availableQuestions.filter(q => q.points === 600))

        if (q200.length < 2 || q400.length < 2 || q600.length < 1) {
          needsReset = true
        }

        // اختيار اثنين 200، اثنين 400، واحد 600 بشكل عشوائي
        const selectedQuestions = [
          ...(q200.slice(0, 2)),
          ...(q400.slice(0, 2)),
          ...(q600.slice(0, 1))
        ].map(q => ({
          ...q,
          answered: false,
          answeredBy: null
        }))
        return {
          id: cat.id,
          name: cat.name,
          questions: selectedQuestions
        }
      })

    if (needsReset) {
      setQuestionsResetNeeded(true)
      return
    }

    setQuestionsResetNeeded(false)
    
    setGameCategories(selected)
    setStep("game")
  }

  const handleResetQuestions = async () => {
    setResettingQuestions(true)

    try {
      await resetUsedQuestions()
      await fetchUsedQuestions()
      setQuestionsResetNeeded(false)
    } finally {
      setResettingQuestions(false)
    }
  }

  const clearCurrentQuestionState = () => {
    setSelectedQuestion(null)
    setSelectedCategoryId(null)
    setShowAnswer(false)
    setTimerActive(false)
    setTimeLeft(60)
    setQuestionOwnerTeam(null)
    setActiveDoubleTeam(null)
    setQuestionBlocked(false)
    setHasQuestionTransferred(false)
    setStolenByTeam(null)
  }

  const handleEndGame = () => {
    clearCurrentQuestionState()
    setGameCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        questions: cat.questions.map((q) => ({ ...q, answered: true })),
      })),
    )
  }

  const handleActivateDoublePoints = () => {
    if (selectedQuestion !== null || pendingDoubleTeam !== null || doublePointsUsed[currentTurn]) {
      return
    }

    setPendingDoubleTeam(currentTurn)
    setDoublePointsUsed((prev) => prev.map((used, idx) => (idx === currentTurn ? true : used)))
  }

  const handleActivateQuestionBlock = () => {
    if (
      selectedQuestion === null ||
      showAnswer ||
      !timerActive ||
      questionOwnerTeam !== currentTurn ||
      hasQuestionTransferred ||
      questionBlocked ||
      questionBlockUsed[currentTurn]
    ) {
      return
    }

    setQuestionBlocked(true)
    setQuestionBlockUsed((prev) => prev.map((used, idx) => (idx === currentTurn ? true : used)))
  }

  const handleActivateQuestionSteal = (teamIdx: number) => {
    if (
      selectedQuestion === null ||
      showAnswer ||
      !timerActive ||
      teamIdx === currentTurn ||
      questionStealUsed[teamIdx] ||
      stolenByTeam !== null
    ) {
      return
    }

    setQuestionStealUsed((prev) => prev.map((used, idx) => (idx === teamIdx ? true : used)))
    setCurrentTurn(teamIdx)
    setQuestionOwnerTeam(teamIdx)
    setStolenByTeam(teamIdx)
    setQuestionBlocked(false)
    setHasQuestionTransferred(false)
  }

  const handleActivateQuestionSwap = () => {
    if (
      !selectedCategoryId ||
      !selectedQuestion ||
      showAnswer ||
      !timerActive ||
      questionSwapUsed[currentTurn]
    ) {
      return
    }

    const currentCategory = gameCategories.find((category) => category.id === selectedCategoryId)
    if (!currentCategory) {
      return
    }

    const alternatives = currentCategory.questions.filter(
      (question) => question.points === selectedQuestion.points && !question.answered && question.id !== selectedQuestion.id,
    )

    if (alternatives.length === 0) {
      return
    }

    const randomIdx = Math.floor(Math.random() * alternatives.length)
    registerQuestionAsUsed(alternatives[randomIdx].id)
    setQuestionSwapUsed((prev) => prev.map((used, idx) => (idx === currentTurn ? true : used)))
    setSelectedQuestion(alternatives[randomIdx])
    setShowAnswer(false)
    setTimeLeft(hasQuestionTransferred ? 20 : 60)
    setTimerActive(true)
  }

  const handleQuestionClick = (categoryId: string, question: GameQuestion) => {
    if (!question.answered) {
      const ownerTeam = currentTurn
      registerQuestionAsUsed(question.id)
      setSelectedCategoryId(categoryId)
      setSelectedQuestion(question)
      setShowAnswer(false)
      setTimeLeft(60)
      setTimerActive(true)
      setQuestionOwnerTeam(ownerTeam)
      setQuestionBlocked(false)
      setHasQuestionTransferred(false)

      if (pendingDoubleTeam === ownerTeam) {
        setActiveDoubleTeam(ownerTeam)
        setPendingDoubleTeam(null)
      } else {
        setActiveDoubleTeam(null)
      }
    }
  }

  const handleCorrectAnswer = (team: number | "none") => {
    if (selectedQuestion && selectedCategoryId !== null) {
      if (team !== "none") {
        const newScores = [...teamScores]
        const pointsToAdd = activeDoubleTeam === questionOwnerTeam && team === questionOwnerTeam
          ? selectedQuestion.points * 2
          : selectedQuestion.points
        newScores[team] += pointsToAdd
        setTeamScores(newScores)
      }
      setGameCategories(prev =>
        prev.map(cat =>
          cat.id === selectedCategoryId
            ? {
                ...cat,
                questions: cat.questions.map(q =>
                  q.id === selectedQuestion.id
                    ? {
                        ...q,
                        answered: true,
                        answeredBy:
                          team !== "none"
                            ? teamNames[team]
                            : "لا أحد",
                      }
                    : q
                ),
              }
            : cat
        )
      )
      // توزيع الدور بالتسلسل بين الفرق
      if (stolenByTeam !== null) {
        setCurrentTurn(stolenByTeam)
      } else {
        setCurrentTurn((prev) => (prev + 1) % teamNames.length)
      }
      clearCurrentQuestionState()
    }
  }

  const handleEditScore = (teamIdx: number) => {
    setEditingTeam(teamIdx)
    setEditScore(teamScores[teamIdx]?.toString() || "0")
  }

  const handleSaveScore = () => {
    const newScore = parseInt(editScore) || 0
    if (editingTeam !== null && editingTeam >= 0 && editingTeam < teamScores.length) {
      const newScores = [...teamScores]
      newScores[editingTeam] = newScore
      setTeamScores(newScores)
    }
    setEditingTeam(null)
    setEditScore("")
  }

  const handleCancelEdit = () => {
    setEditingTeam(null)
    setEditScore("")
  }

  const canUseDoublePoints = (teamIdx: number) => selectedQuestion === null && pendingDoubleTeam === null && !doublePointsUsed[teamIdx] && currentTurn === teamIdx
  const canUseQuestionBlock = (teamIdx: number) =>
    selectedQuestion !== null &&
    !showAnswer &&
    timerActive &&
    questionOwnerTeam === teamIdx &&
    currentTurn === teamIdx &&
    !hasQuestionTransferred &&
    !questionBlocked &&
    !questionBlockUsed[teamIdx]
  const canUseQuestionSteal = (teamIdx: number) =>
    selectedQuestion !== null &&
    !showAnswer &&
    timerActive &&
    stolenByTeam === null &&
    teamIdx !== currentTurn &&
    !questionStealUsed[teamIdx]
  const canUseQuestionSwap = (teamIdx: number) =>
    selectedQuestion !== null &&
    !showAnswer &&
    timerActive &&
    currentTurn === teamIdx &&
    !questionSwapUsed[teamIdx]
  const isSixCategoryBoard = gameCategories.length >= 6
  const isQuestionOpen = selectedQuestion !== null
  const finalRankings = [...teamNames.map((name, idx) => ({ name, score: teamScores[idx] }))].sort((a, b) => b.score - a.score)
  const renderTeamCard = (teamIdx: number) => (
    <button
      key={`team-card-${teamIdx}`}
      type="button"
      onClick={() => setEditingTeam(teamIdx)}
      className={`min-w-[100px] rounded-[1.15rem] border px-2.5 py-1.5 text-center shadow-sm transition ${
        currentTurn === teamIdx
          ? "border-[#7c3aed]/45 bg-[#f5f3ff] ring-2 ring-[#7c3aed]/15"
          : "border-[#89d8cf]/60 bg-[linear-gradient(135deg,rgba(240,253,250,0.78)_0%,rgba(236,254,255,0.52)_100%)]"
      }`}
    >
      <div className="truncate text-[11px] font-black text-[#6d28d9] md:text-[13px]">{teamNames[teamIdx]}</div>
      <div className="mt-0.5 text-xl font-black leading-none text-[#7c3aed] md:text-[1.55rem]">{teamScores[teamIdx]}</div>
    </button>
  )

  const renderEndGameButton = () => (
    <LifelineButton
      icon={<img src="/انهاء.svg" alt="" className="h-6 w-6 object-contain" aria-hidden="true" />}
      tooltip="إنهاء اللعبة"
      ariaLabel="إنهاء اللعبة"
      tooltipWidthClass="w-[120px]"
      onClick={handleEndGame}
    />
  )

  const renderTeamLifelines = (teamIdx: number) => {
    const tooltipAlign = teamIdx === 0 ? "right" : "left"

    return (
    <div className="flex flex-wrap justify-center gap-2">
      <LifelineButton
        icon={
          <img src="/حرامي.svg" alt="" className="h-8 w-8 object-contain" aria-hidden="true" />
        }
        tooltip="بمجرد أن يطرح السؤال يحق للفريق الخصم أن يعلن رغبته في سرقة السؤال والإجابة عليه"
        ariaLabel={`سرقة السؤال لصالح ${teamNames[teamIdx]}`}
        active={stolenByTeam === teamIdx}
        used={questionStealUsed[teamIdx]}
        tooltipAlign={tooltipAlign}
        disabled={!canUseQuestionSteal(teamIdx) && stolenByTeam !== teamIdx}
        onClick={canUseQuestionSteal(teamIdx) ? () => handleActivateQuestionSteal(teamIdx) : undefined}
      />
      <LifelineButton
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-8 w-8">
            <circle cx="12" cy="12" r="8" />
            <path d="M7 7l10 10" strokeLinecap="round" />
          </svg>
        }
        tooltip="هذه الوسيلة يستخدمها الفريق صاحب السؤال لمنع الفريق الآخر من الإجابة عليه، وعند استخدامها لا يسمح للفريق الخصم بتقديم أي إجابة على هذا السؤال."
        ariaLabel={`حجب السؤال لصالح ${teamNames[teamIdx]}`}
        active={questionBlocked && questionOwnerTeam === teamIdx}
        used={questionBlockUsed[teamIdx]}
        tooltipAlign={tooltipAlign}
        disabled={!canUseQuestionBlock(teamIdx) && !(questionBlocked && questionOwnerTeam === teamIdx)}
        onClick={canUseQuestionBlock(teamIdx) ? () => {
          if (currentTurn === teamIdx) {
            handleActivateQuestionBlock()
          }
        } : undefined}
      />
      <LifelineButton
        icon={
          <img src="/اعادة.svg" alt="" className="h-8 w-8 object-contain" aria-hidden="true" />
        }
        tooltip="تغيير السؤال"
        ariaLabel={`تغيير السؤال لصالح ${teamNames[teamIdx]}`}
        active={false}
        used={questionSwapUsed[teamIdx]}
        tooltipAlign={tooltipAlign}
        tooltipWidthClass="w-[120px]"
        disabled={!canUseQuestionSwap(teamIdx)}
        onClick={canUseQuestionSwap(teamIdx) ? () => {
          if (currentTurn === teamIdx) {
            handleActivateQuestionSwap()
          }
        } : undefined}
      />
      <LifelineButton
        icon={<span className="text-[1.3rem] font-black leading-none">x2</span>}
        tooltip="إذا كانت الإجابة صحيحة يحصل الفريق على ضعف النقاط الخاصة بالسؤال بشرط أن تستعمل قبل الإجابة على السؤال."
        ariaLabel={`مضاعفة النقاط لصالح ${teamNames[teamIdx]}`}
        active={pendingDoubleTeam === teamIdx}
        used={doublePointsUsed[teamIdx]}
        tooltipAlign={tooltipAlign}
        disabled={!canUseDoublePoints(teamIdx) && pendingDoubleTeam !== teamIdx}
        onClick={canUseDoublePoints(teamIdx) ? () => {
          if (currentTurn === teamIdx) {
            handleActivateDoublePoints()
          }
        } : undefined}
      />
    </div>
    )
  }

  // صفحة إدخال أسماء الفرق
  if (step === "teams") {
    return (
      <GameEntryShell
        title="لعبة الفئات"
        badge="إعداد الفرق"
        containerClassName="max-w-3xl"
        className="bg-[linear-gradient(180deg,#f4fffc_0%,#ecfeff_32%,#fffbea_68%,#ffffff_100%)]"
        backgroundDecor={<CategoriesPageBackground />}
      >
          <div className="space-y-5 md:px-2">
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#1f1147] md:text-base">أسماء الفرق</div>
            {teamNames.map((teamName, idx) => (
              <div key={idx} className="space-y-3">
                <div className="text-sm font-bold text-[#1f1147] md:text-base">{`اسم الفريق ${idx + 1}`}</div>
                <Input
                  id={`team${idx + 1}`}
                  value={teamName || ""}
                  onChange={(e) => {
                    const newNames = [...teamNames]
                    newNames[idx] = e.target.value
                    setTeamNames(newNames)
                  }}
                  placeholder={`اكتب اسم الفريق ${idx + 1}`}
                  className="h-14 rounded-2xl border border-[#d8c9fb]/80 bg-transparent px-4 text-right text-[#3f2a76] placeholder:text-[#8f7fb1] focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10"
                />
              </div>
            ))}
            </div>

            <Button
              onClick={handleTeamsSubmit}
              className="h-14 w-full rounded-2xl bg-[#7c3aed] text-lg font-black text-white hover:bg-[#6d28d9]"
            >
              التالي
              <ArrowRight className="mr-2 h-5 w-5" />
            </Button>
          </div>
      </GameEntryShell>
    )
  }

  // صفحة اختيار الفئات
  if (step === "categories") {
    return (
      <GameEntryShell
        title={`اختر ${MAX_SELECTED_CATEGORIES} فئات`}
        badge="مرحلة الاختيار"
        subtitle={`تم اختيار ${selectedCategoryIds.length} من ${MAX_SELECTED_CATEGORIES} فئات.`}
        containerClassName="max-w-7xl"
        className="bg-[linear-gradient(180deg,#f4fffc_0%,#ecfeff_32%,#fffbea_68%,#ffffff_100%)]"
        backgroundDecor={<CategoriesPageBackground />}
      >
        <GameEntryPanel className="border border-[#8cd7cd]/55 bg-[linear-gradient(135deg,rgba(236,253,245,0.62)_0%,rgba(236,254,255,0.38)_100%)] shadow-[0_24px_80px_rgba(13,148,136,0.09)]">
          {loading ? (
            <div className="py-12 text-center">
              <SiteLoader />
            </div>
          ) : (
            <>
              {questionsResetNeeded ? (
                <div className="mb-6 rounded-[1.5rem] border border-[#8cd7cd]/55 bg-[linear-gradient(135deg,rgba(236,253,245,0.72)_0%,rgba(236,254,255,0.44)_100%)] px-5 py-4 text-right shadow-sm backdrop-blur-md">
                  <div className="text-sm font-bold leading-7 text-[#5b21b6] md:text-base">
                    لم تعد الأسئلة الجديدة كافية لبناء لوحة كاملة في الفئات المختارة لهذا المستخدم. أعد الأسئلة ثم ابدأ الجولة من جديد.
                  </div>
                  <Button
                    onClick={() => {
                      void handleResetQuestions()
                    }}
                    className="mt-4 h-12 rounded-2xl bg-[#7c3aed] px-6 text-sm font-black text-white hover:bg-[#6d28d9]"
                  >
                    {resettingQuestions ? "جارٍ إعادة الأسئلة..." : "إعادة الأسئلة"}
                  </Button>
                </div>
              ) : null}

              <div className="mb-8 grid grid-cols-2 gap-5 md:grid-cols-4">
                {allCategories.map((category) => {
                  const artwork = getCategoryArtwork(category.name)
                  const isSelected = selectedCategoryIds.includes(category.id)

                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategorySelection(category.id)}
                      disabled={!selectedCategoryIds.includes(category.id) && selectedCategoryIds.length >= MAX_SELECTED_CATEGORIES}
                      className={`relative overflow-hidden rounded-[1.6rem] border-2 text-center transition-all ${
                        isSelected
                          ? "border-[#8b5cf6]/45 bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] text-white shadow-[0_20px_50px_rgba(124,58,237,0.18)]"
                          : "border-[#8cd7cd]/65 bg-[linear-gradient(135deg,rgba(240,253,250,0.78)_0%,rgba(236,254,255,0.54)_100%)] text-[#134e4a] hover:border-[#14b8a6]"
                      } ${!isSelected && selectedCategoryIds.length >= MAX_SELECTED_CATEGORIES ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      {artwork ? (
                        <div
                          className={`absolute inset-0 bg-cover bg-no-repeat transition duration-300 ${isSelected ? "scale-[1.08] blur-[5px]" : ""}`}
                          style={{
                            backgroundImage: `url(${artwork.imageUrl})`,
                            backgroundPosition: artwork.imagePosition ?? "center",
                          }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {artwork ? (
                        <div
                          className={`absolute inset-0 ${artwork.overlayClassName ?? "bg-[linear-gradient(180deg,rgba(35,16,79,0.18)_0%,rgba(35,16,79,0.78)_100%)]"}`}
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className={`relative p-6 ${artwork ? "min-h-[152px] flex items-end justify-center" : "min-h-[132px] flex items-center justify-center"}`}>
                        <h3 className={`text-lg font-black ${artwork ? "text-white [text-shadow:0_3px_14px_rgba(0,0,0,0.78)]" : ""}`}>
                          {category.name}
                        </h3>
                      </div>
                      {isSelected ? (
                        <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(236,253,245,0.92)_0%,rgba(236,254,255,0.72)_100%)] text-[#0f766e] shadow-sm">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep("teams")}
                  variant="outline"
                  className="h-14 flex-1 rounded-2xl border-[#8cd7cd]/65 bg-[linear-gradient(135deg,rgba(240,253,250,0.82)_0%,rgba(236,254,255,0.58)_100%)] text-base font-black text-[#0f766e] hover:bg-[linear-gradient(135deg,rgba(204,251,241,0.9)_0%,rgba(207,250,254,0.66)_100%)]"
                >
                  رجوع
                </Button>
                <Button
                  onClick={startGame}
                  disabled={selectedCategoryIds.length !== MAX_SELECTED_CATEGORIES}
                  className="h-14 flex-1 rounded-2xl bg-[#7c3aed] text-base font-black text-white hover:bg-[#6d28d9]"
                >
                  ابدأ اللعبة
                  <ArrowRight className="mr-2 h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </GameEntryPanel>
      </GameEntryShell>
    )
  }

  // صفحة اللعبة
  return (
      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f4fffc_0%,#ecfeff_32%,#fffbea_68%,#ffffff_100%)] px-2 py-4 sm:px-3 lg:px-4">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <CategoriesPageBackground board />
        </div>
        <div className="relative mx-auto max-w-[1880px]">
        {/* شريط الدور والفرق */}
        <div className={`relative z-[60] mb-3 text-[#1f1147] sm:mb-4 ${
          isQuestionOpen
            ? "rounded-none border-transparent bg-transparent p-0 shadow-none backdrop-blur-0"
            : "rounded-[1.48rem] border-2 border-[#8cd7cd]/55 bg-[linear-gradient(135deg,rgba(236,253,245,0.42)_0%,rgba(236,254,255,0.22)_100%)] px-3 py-2.5 shadow-[0_24px_80px_rgba(13,148,136,0.08)] backdrop-blur-2xl sm:px-3.5 sm:py-3"
        }`}>
          <div className="flex flex-col gap-2.5 xl:relative xl:min-h-[82px] xl:justify-center">
            <div className="flex justify-center transition xl:absolute xl:right-0 xl:top-1/2 xl:-translate-y-1/2">
              {renderTeamLifelines(0)}
            </div>

            <div className="flex justify-center transition xl:absolute xl:left-0 xl:top-1/2 xl:-translate-y-1/2">
              {renderTeamLifelines(1)}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 xl:px-[222px]">
              {renderTeamCard(0)}
              <div className="flex items-center justify-center gap-2.5 xl:min-w-[168px]">
                <div className="relative inline-flex items-center py-0.5 text-lg font-black tracking-[-0.04em] text-transparent md:text-[1.45rem]">
                  <span className="bg-gradient-to-l from-[#7c3aed] via-[#4c1d95] to-[#1f1147] bg-clip-text">صولة وجولة</span>
                  <span className="pointer-events-none absolute -bottom-1 right-0 h-[3px] w-9 rounded-full bg-gradient-to-l from-[#c4b5fd] to-[#7c3aed] md:w-10" />
                </div>
                {renderEndGameButton()}
              </div>
              {renderTeamCard(1)}
            </div>
          </div>
        </div>

        {/* لوحة الفئات */}
        <div className={`transition ${isQuestionOpen ? "pointer-events-none opacity-35 blur-[4px]" : ""}`}>
          <div className={isSixCategoryBoard ? "grid grid-cols-6 gap-2 sm:gap-3" : "grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4"}>
          {gameCategories.map((category) => {
            const artwork = getCategoryArtwork(category.name)

            return (
            <div key={category.id} className="flex flex-col overflow-hidden rounded-[1.1rem] border-2 border-[#8cd7cd]/55 bg-[linear-gradient(180deg,rgba(236,253,245,0.76)_0%,rgba(236,254,255,0.6)_100%)] shadow-[0_12px_28px_rgba(13,148,136,0.08)] backdrop-blur-md">
              {/* عنوان الفئة */}
              <div
                className={`relative overflow-hidden text-center font-bold text-white ${
                  artwork
                    ? isSixCategoryBoard
                      ? "min-h-[110px]"
                      : "min-h-[118px] sm:min-h-[132px]"
                    : isSixCategoryBoard
                      ? "min-h-[82px]"
                      : "min-h-[92px]"
                }`}
              >
                {artwork ? (
                  <div
                    className="absolute inset-0 bg-cover bg-no-repeat"
                    style={{
                      backgroundImage: `url(${artwork.imageUrl})`,
                      backgroundPosition: artwork.imagePosition ?? "center",
                    }}
                    aria-hidden="true"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)]" aria-hidden="true" />
                )}
                <div
                  className={`absolute inset-0 ${artwork?.overlayClassName ?? "bg-[linear-gradient(180deg,rgba(76,29,149,0.18)_0%,rgba(76,29,149,0.58)_46%,rgba(49,18,109,0.92)_100%)]"}`}
                  aria-hidden="true"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(180deg,rgba(14,7,32,0)_0%,rgba(14,7,32,0.68)_100%)]" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-[linear-gradient(180deg,rgba(14,7,32,0)_0%,rgba(124,58,237,0.12)_100%)]" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,rgba(124,58,237,0)_0%,rgba(167,139,250,0.72)_20%,rgba(139,92,246,0.98)_50%,rgba(167,139,250,0.72)_80%,rgba(124,58,237,0)_100%)]" aria-hidden="true" />
                <div className={`relative flex h-full items-end justify-center px-3 pb-2.5 [text-shadow:0_3px_14px_rgba(0,0,0,0.8)] ${isSixCategoryBoard ? "pt-4 text-sm lg:text-base" : "pt-5 text-sm sm:text-base lg:text-lg"}`}>
                  {category.name}
                </div>
              </div>

              {/* الأسئلة */}
              <div className="flex flex-col">
                {category.questions.map((question, questionIndex) => (
                  <button
                    key={question.id}
                    onClick={() => handleQuestionClick(category.id, question)}
                    disabled={question.answered}
                    className={`${isSixCategoryBoard ? "min-h-[78px] px-3 py-3 text-base lg:text-lg" : "min-h-[84px] p-3 sm:p-3.5 text-base sm:text-lg"} ${questionIndex === 0 ? "border-t-2 border-[#efe7ff]" : ""} font-bold transition-all ${
                      question.answered
                        ? "bg-[linear-gradient(180deg,rgba(236,253,245,0.4)_0%,rgba(236,254,255,0.28)_100%)] text-[#8aa5a1] cursor-not-allowed border-b border-[#cfecea]"
                        : "bg-[linear-gradient(180deg,rgba(240,253,250,0.82)_0%,rgba(236,254,255,0.62)_100%)] text-[#134e4a] hover:bg-[linear-gradient(180deg,rgba(204,251,241,0.9)_0%,rgba(207,250,254,0.68)_100%)] cursor-pointer border-b border-[#cfecea]"
                    }`}
                  >
                    {question.answered ? "✓" : question.points}
                  </button>
                ))}
              </div>
            </div>
            )
          })}
          </div>
        </div>
      </div>

      {/* نافذة السؤال */}
      {selectedQuestion !== null ? (
        <>
          <div className="pointer-events-none fixed inset-0 z-40 bg-black/20" />
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pb-6 pt-40 sm:pt-44">
            <div className="w-full max-w-2xl rounded-2xl border border-[#8cd7cd]/55 bg-[linear-gradient(135deg,rgba(236,253,245,0.92)_0%,rgba(236,254,255,0.74)_100%)] p-5 shadow-[0_24px_80px_rgba(13,148,136,0.16)] backdrop-blur-xl sm:p-6">
              <div className="space-y-2 text-center text-[#1a2332]">
                <div className="text-xl sm:text-3xl font-semibold">السؤال الحالي</div>
                <div className="text-lg sm:text-2xl text-[#7c3aed]">{selectedQuestion?.points} نقطة</div>
                <div className="text-2xl font-bold text-[#7c3aed]">
                  ⏱️ {timeLeft}s
                </div>
                {hasQuestionTransferred ? <div className="text-sm font-bold text-red-600">انتقل السؤال إلى الفريق التالي</div> : null}
              </div>

              <div className="space-y-4 py-3 sm:space-y-5 sm:py-4">
                <div className="rounded-lg border-2 border-[#8cd7cd]/55 bg-[linear-gradient(180deg,rgba(240,253,250,0.9)_0%,rgba(236,254,255,0.65)_100%)] p-4 sm:p-5">
                  <p className="text-center text-lg font-semibold text-[#1a2332] sm:text-2xl">
                    {selectedQuestion?.question}
                  </p>
                </div>

                {showAnswer ? (
                  <div className="rounded-lg border-2 border-[#8cd7cd]/55 bg-[linear-gradient(180deg,rgba(204,251,241,0.78)_0%,rgba(236,254,255,0.68)_100%)] p-4 sm:p-5">
                    <p className="text-center text-base font-bold text-[#1a2332] sm:text-xl">
                      الإجابة: {selectedQuestion?.answer}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3">
                  {!showAnswer ? (
                    <Button
                      onClick={() => setShowAnswer(true)}
                      className="w-full bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] py-6 text-xl text-white shadow-lg hover:bg-[linear-gradient(135deg,#6d28d9_0%,#5b21b6_100%)]"
                    >
                      إظهار الإجابة
                    </Button>
                  ) : (
                    <div className={`grid grid-cols-${teamNames.length + 1} gap-3`}>
                      {teamNames.map((name, idx) => (
                        <Button
                          key={idx}
                          onClick={() => handleCorrectAnswer(idx)}
                          className="bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] py-6 text-lg text-white shadow-lg hover:bg-[linear-gradient(135deg,#6d28d9_0%,#5b21b6_100%)]"
                        >
                          {name}
                        </Button>
                      ))}
                      <Button
                        onClick={() => handleCorrectAnswer("none")}
                        variant="outline"
                        className="border-2 border-gray-400 py-6 text-lg text-gray-600 hover:bg-gray-100"
                      >
                        محد جاوب
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* نافذة النتائج النهائية */}
      {gameCategories.length > 0 && gameCategories.every(cat => cat.questions.every(q => q.answered)) && (
        <GameFinishOverlay
          title={`مبروك الفوز للفريق: ${finalRankings[0]?.name || "-"}`}
          details={
            <div className="mx-auto mt-4 w-full max-w-md space-y-4">
              {finalRankings.map((team, idx) => (
                <div key={team.name} className="mb-2 flex items-center justify-between rounded-xl bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] p-4">
                  <span className="text-xl font-bold text-[#1a2332]">{idx + 1}. {team.name}</span>
                  <span className="text-2xl font-black text-[#7c3aed]">{team.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          }
          actions={[
            {
              label: "لعب مرة أخرى",
              onClick: () => {
                void (async () => {
                  await resetUsedQuestions()
                  await fetchUsedQuestions()
                  window.location.reload()
                })()
              },
            },
            {
              label: "خروج",
              onClick: () => {
                void (async () => {
                  await resetUsedQuestions()
                  await fetchUsedQuestions()
                  window.location.href = "/"
                })()
              },
              tone: "danger",
            },
          ]}
        />
      )}
      {/* مودال تعديل النقاط */}
      <Dialog open={editingTeam !== null} onOpenChange={handleCancelEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-[#1a2332]">
              تعديل نقاط {editingTeam !== null ? teamNames[editingTeam] : ""}
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
                className="flex-1 text-lg py-6 bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] text-white shadow-lg hover:bg-[linear-gradient(135deg,#6d28d9_0%,#5b21b6_100%)]"
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
    </div>
  )
}