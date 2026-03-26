"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { BarChart3, Clock3, PhoneCall, RefreshCcw, Trophy } from "lucide-react"
import { GameFinishOverlay } from "@/components/games/game-finish-overlay"

type Difficulty = "easy" | "medium" | "hard"

type MillionaireQuestion = {
  id: string
  question: string
  option_1: string
  option_2: string
  option_3: string
  option_4: string
  correct_option: number
  difficulty: Difficulty
}

type UsedQuestionMap = Record<Difficulty, string[]>

type ResultState = {
  status: "idle" | "won" | "lost"
  title: string
  message: string
  amount: number
  reason: "questions-exhausted" | null
}

type AudienceVote = {
  optionNumber: number
  percentage: number
}

const PRIZE_LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000]
const QUESTION_DIFFICULTY_SEQUENCE: Difficulty[] = [
  "easy", "easy", "easy", "easy", "easy",
  "medium", "medium", "medium", "medium", "medium",
  "hard", "hard", "hard", "hard", "hard",
]

const initialUsedMap: UsedQuestionMap = {
  easy: [],
  medium: [],
  hard: [],
}

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US")
}

function gameTypeForDifficulty(difficulty: Difficulty) {
  return `millionaire-${difficulty}`
}

function getAccountStorageKey() {
  if (typeof window === "undefined") {
    return ""
  }

  return localStorage.getItem("account_number") || localStorage.getItem("accountNumber") || ""
}

function usedQuestionsStorageKey(accountKey: string, difficulty: Difficulty) {
  return `millionaire_used_${accountKey}_${difficulty}`
}

function verticalProgressHeight(currentQuestionIndex: number) {
  if (currentQuestionIndex < 0) {
    return "0%"
  }

  return `${(currentQuestionIndex / PRIZE_LADDER.length) * 100}%`
}

function progressFillHeight(currentQuestionIndex: number) {
  if (currentQuestionIndex <= 0) {
    return "0px"
  }

  return `max(calc(${verticalProgressHeight(currentQuestionIndex)} - 16px), 56px)`
}

function ladderBottomOffset(index: number) {
  if (PRIZE_LADDER.length <= 1) {
    return "0%"
  }

  const safeStart = 4
  const safeEnd = 96
  return `${safeStart + (index / (PRIZE_LADDER.length - 1)) * (safeEnd - safeStart)}%`
}

function generateAudienceVotes(correctOption: number): AudienceVote[] {
  const correctPercentage = 34 + Math.floor(Math.random() * 7)
  const baseValues = [18 + Math.floor(Math.random() * 8), 17 + Math.floor(Math.random() * 8), 16 + Math.floor(Math.random() * 8)]
  const baseTotal = baseValues.reduce((sum, value) => sum + value, 0)
  const targetTotal = 100 - correctPercentage
  const scaledValues = baseValues.map((value) => Math.max(12, Math.floor((value / baseTotal) * targetTotal)))
  let remainder = targetTotal - scaledValues.reduce((sum, value) => sum + value, 0)

  while (remainder > 0) {
    for (let index = 0; index < scaledValues.length && remainder > 0; index += 1) {
      if (scaledValues[index] + 1 < correctPercentage) {
        scaledValues[index] += 1
        remainder -= 1
      }
    }
  }

  while (remainder < 0) {
    for (let index = 0; index < scaledValues.length && remainder < 0; index += 1) {
      if (scaledValues[index] > 12) {
        scaledValues[index] -= 1
        remainder += 1
      }
    }
  }

  const wrongOptionNumbers = [1, 2, 3, 4].filter((optionNumber) => optionNumber !== correctOption)
  const shuffledWrongPercentages = [...scaledValues].sort(() => Math.random() - 0.5)
  const voteMap = new Map<number, number>()

  voteMap.set(correctOption, correctPercentage)
  wrongOptionNumbers.forEach((optionNumber, index) => {
    voteMap.set(optionNumber, shuffledWrongPercentages[index])
  })

  return [1, 2, 3, 4].map((optionNumber) => ({
    optionNumber,
    percentage: voteMap.get(optionNumber) || 0,
  }))
}

export default function MillionaireGamePage() {
  const [questionsByDifficulty, setQuestionsByDifficulty] = useState<Record<Difficulty, MillionaireQuestion[]>>({
    easy: [],
    medium: [],
    hard: [],
  })
  const [usedQuestionIds, setUsedQuestionIds] = useState<UsedQuestionMap>(initialUsedMap)
  const [accountKey, setAccountKey] = useState("")
  const [loading, setLoading] = useState(true)
  const [questionLoading, setQuestionLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
  const [currentQuestion, setCurrentQuestion] = useState<MillionaireQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([])
  const [fiftyUsed, setFiftyUsed] = useState(false)
  const [phoneUsed, setPhoneUsed] = useState(false)
  const [audienceUsed, setAudienceUsed] = useState(false)
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle")
  const [timeLeft, setTimeLeft] = useState(60)
  const [timerActive, setTimerActive] = useState(false)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [phoneTimeLeft, setPhoneTimeLeft] = useState(100)
  const [audienceModalOpen, setAudienceModalOpen] = useState(false)
  const [audienceVotes, setAudienceVotes] = useState<AudienceVote[]>([])
  const [exhaustedDifficulty, setExhaustedDifficulty] = useState<Difficulty | null>(null)
  const [resettingQuestions, setResettingQuestions] = useState(false)
  const [result, setResult] = useState<ResultState>({
    status: "idle",
    title: "",
    message: "",
    amount: 0,
    reason: null,
  })

  useEffect(() => {
    if (!timerActive || questionLoading || !currentQuestion || answerState !== "idle") {
      return
    }

    if (timeLeft === 0) {
      setTimerActive(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [answerState, currentQuestion, questionLoading, timeLeft, timerActive])

  useEffect(() => {
    if (!phoneModalOpen) {
      return
    }

    if (phoneTimeLeft === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPhoneTimeLeft((prev) => Math.max(prev - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [phoneModalOpen, phoneTimeLeft])

  const fetchUsedQuestions = async (difficulty: Difficulty) => {
    try {
      const response = await fetch(`/api/used-questions?gameType=${gameTypeForDifficulty(difficulty)}`)
      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error(`Error fetching used millionaire questions for ${difficulty}:`, error)
      return []
    }
  }

  const getStoredUsedQuestions = (difficulty: Difficulty, currentAccountKey: string) => {
    if (!currentAccountKey || typeof window === "undefined") {
      return []
    }

    try {
      const stored = localStorage.getItem(usedQuestionsStorageKey(currentAccountKey, difficulty))
      const parsed = stored ? JSON.parse(stored) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error(`Error reading stored millionaire questions for ${difficulty}:`, error)
      return []
    }
  }

  const setStoredUsedQuestions = (difficulty: Difficulty, currentAccountKey: string, questionIds: string[]) => {
    if (!currentAccountKey || typeof window === "undefined") {
      return
    }

    localStorage.setItem(usedQuestionsStorageKey(currentAccountKey, difficulty), JSON.stringify(questionIds))
  }

  const clearUsedQuestionsForDifficulty = (difficulty: Difficulty, currentAccountKey: string) => {
    setUsedQuestionIds((prev) => ({
      ...prev,
      [difficulty]: [],
    }))
    setStoredUsedQuestions(difficulty, currentAccountKey, [])
  }

  const markQuestionAsUsed = async (difficulty: Difficulty, questionId: string) => {
    try {
      await fetch("/api/used-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: gameTypeForDifficulty(difficulty), questionId }),
      })
    } catch (error) {
      console.error(`Error marking millionaire question as used for ${difficulty}:`, error)
    }
  }

  const resetUsedQuestions = async (difficulty: Difficulty) => {
    try {
      await fetch(`/api/used-questions?gameType=${gameTypeForDifficulty(difficulty)}`, {
        method: "DELETE",
      })
    } catch (error) {
      console.error(`Error resetting millionaire used questions for ${difficulty}:`, error)
    }
  }

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true)

        const currentAccountKey = getAccountStorageKey()
        setAccountKey(currentAccountKey)

        const [questionsResponse, easyUsedApi, mediumUsedApi, hardUsedApi] = await Promise.all([
          fetch("/api/millionaire-questions"),
          fetchUsedQuestions("easy"),
          fetchUsedQuestions("medium"),
          fetchUsedQuestions("hard"),
        ])

        const easyUsed = Array.from(new Set([...getStoredUsedQuestions("easy", currentAccountKey), ...easyUsedApi]))
        const mediumUsed = Array.from(new Set([...getStoredUsedQuestions("medium", currentAccountKey), ...mediumUsedApi]))
        const hardUsed = Array.from(new Set([...getStoredUsedQuestions("hard", currentAccountKey), ...hardUsedApi]))

        setStoredUsedQuestions("easy", currentAccountKey, easyUsed)
        setStoredUsedQuestions("medium", currentAccountKey, mediumUsed)
        setStoredUsedQuestions("hard", currentAccountKey, hardUsed)

        const questionsData = await questionsResponse.json()
        const allQuestions = Array.isArray(questionsData) ? questionsData : []

        setQuestionsByDifficulty({
          easy: allQuestions.filter((question) => question.difficulty === "easy"),
          medium: allQuestions.filter((question) => question.difficulty === "medium"),
          hard: allQuestions.filter((question) => question.difficulty === "hard"),
        })
        setUsedQuestionIds({
          easy: easyUsed,
          medium: mediumUsed,
          hard: hardUsed,
        })
      } catch (error) {
        console.error("Error loading millionaire game data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()
  }, [])

  const questionCounts = useMemo(() => {
    return {
      easy: questionsByDifficulty.easy.length,
      medium: questionsByDifficulty.medium.length,
      hard: questionsByDifficulty.hard.length,
    }
  }, [questionsByDifficulty])

  const hasEnoughQuestions = useMemo(() => {
    return questionCounts.easy >= 5 && questionCounts.medium >= 5 && questionCounts.hard >= 5
  }, [questionCounts])

  const securedPrize = currentQuestionIndex > 0 ? PRIZE_LADDER[currentQuestionIndex - 1] : 0

  const prepareQuestion = async (nextIndex: number) => {
    const difficulty = QUESTION_DIFFICULTY_SEQUENCE[nextIndex]
    const allQuestionsForDifficulty = questionsByDifficulty[difficulty]

    setQuestionLoading(true)
    setCurrentQuestionIndex(nextIndex)
    setSelectedOption(null)
    setHiddenOptions([])
    setAnswerState("idle")
    setTimeLeft(60)
    setTimerActive(false)

    try {
      let usedIds = usedQuestionIds[difficulty] || []
      let availableQuestions = allQuestionsForDifficulty.filter((question) => !usedIds.includes(question.id))

      if (availableQuestions.length === 0) {
        setExhaustedDifficulty(difficulty)
        setResult({
          status: "lost",
          title: "انتهت الأسئلة",
          message: "",
          amount: securedPrize,
          reason: "questions-exhausted",
        })
        setCurrentQuestion(null)
        return
      }

      setExhaustedDifficulty(null)
      const nextQuestion = availableQuestions[0]
      const nextUsedIds = [...usedIds, nextQuestion.id]

      setCurrentQuestion(nextQuestion)
      setTimeLeft(60)
      setTimerActive(true)
      setUsedQuestionIds((prev) => ({
        ...prev,
        [difficulty]: nextUsedIds,
      }))
      setStoredUsedQuestions(difficulty, accountKey, nextUsedIds)

      void markQuestionAsUsed(difficulty, nextQuestion.id)
    } finally {
      setQuestionLoading(false)
    }
  }

  const startGame = async () => {
    setHasStarted(true)
    setFiftyUsed(false)
    setExhaustedDifficulty(null)
    setResult({ status: "idle", title: "", message: "", amount: 0, reason: null })
    await prepareQuestion(0)
  }

  const handleResetQuestions = async () => {
    if (!exhaustedDifficulty) {
      return
    }

    setResettingQuestions(true)

    try {
      await resetUsedQuestions(exhaustedDifficulty)
      clearUsedQuestionsForDifficulty(exhaustedDifficulty, accountKey)
      setExhaustedDifficulty(null)
      setResult({ status: "idle", title: "", message: "", amount: 0, reason: null })
      await prepareQuestion(currentQuestionIndex)
    } finally {
      setResettingQuestions(false)
    }
  }

  const handleAnswer = (optionNumber: number) => {
    if (!currentQuestion || answerState !== "idle") {
      return
    }

    const isCorrect = optionNumber === currentQuestion.correct_option
    setSelectedOption(optionNumber)
    setAnswerState(isCorrect ? "correct" : "wrong")
    setTimerActive(false)

    window.setTimeout(async () => {
      if (isCorrect) {
        if (currentQuestionIndex === PRIZE_LADDER.length - 1) {
          setTimerActive(false)
          setResult({
            status: "won",
            title: "مبروك!",
            message: "أجبت على جميع الأسئلة الصحيحة وفزت بالجائزة الكبرى.",
            amount: PRIZE_LADDER[currentQuestionIndex],
            reason: null,
          })
          setCurrentQuestion(null)
          return
        }

        await prepareQuestion(currentQuestionIndex + 1)
        return
      }

      setTimerActive(false)
      setResult({
        status: "lost",
        title: "انتهت اللعبة",
        message: `الإجابة الصحيحة كانت الخيار ${currentQuestion.correct_option}.`,
        amount: currentQuestionIndex > 0 ? PRIZE_LADDER[currentQuestionIndex - 1] : 0,
        reason: null,
      })
      setCurrentQuestion(null)
    }, 900)
  }

  const handleFiftyFifty = () => {
    if (!currentQuestion || fiftyUsed || answerState !== "idle") {
      return
    }

    const wrongOptions = [1, 2, 3, 4].filter((option) => option !== currentQuestion.correct_option)
    const removedOptions = [...wrongOptions].sort(() => Math.random() - 0.5).slice(0, 2)

    setHiddenOptions(removedOptions)
    setFiftyUsed(true)
  }

  const handlePhoneFriend = () => {
    if (!currentQuestion || phoneUsed || answerState !== "idle") {
      return
    }

    setPhoneUsed(true)
    setPhoneTimeLeft(100)
    setPhoneModalOpen(true)
  }

  const handleAudiencePoll = () => {
    if (!currentQuestion || audienceUsed || answerState !== "idle") {
      return
    }

    setAudienceUsed(true)
    setAudienceVotes(generateAudienceVotes(currentQuestion.correct_option))
    setAudienceModalOpen(true)
  }

  const resetGame = () => {
    setHasStarted(false)
    setCurrentQuestionIndex(-1)
    setCurrentQuestion(null)
    setSelectedOption(null)
    setHiddenOptions([])
    setFiftyUsed(false)
    setPhoneUsed(false)
    setAudienceUsed(false)
    setAnswerState("idle")
    setTimeLeft(60)
    setTimerActive(false)
    setPhoneModalOpen(false)
    setPhoneTimeLeft(100)
    setAudienceModalOpen(false)
    setAudienceVotes([])
    setExhaustedDifficulty(null)
    setResult({ status: "idle", title: "", message: "", amount: 0, reason: null })
  }

  if (loading) {
    return <SiteLoader fullScreen />
  }

  const optionValues = currentQuestion
    ? [currentQuestion.option_1, currentQuestion.option_2, currentQuestion.option_3, currentQuestion.option_4]
    : []

  return (
    <div dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_45%,#ffffff_100%)] px-3 py-3 md:px-4 md:py-4">
      <div className={`mx-auto ${hasStarted ? "max-w-[1700px]" : "max-w-3xl"}`}>
        <div dir={hasStarted ? "ltr" : "rtl"} className={`grid grid-cols-1 ${hasStarted ? "gap-6 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-stretch" : ""}`}>
          <main dir="rtl" className={hasStarted ? "space-y-6 xl:order-1" : "flex min-h-[calc(100vh-2rem)] items-center justify-center xl:order-1"}>
            {!hasStarted ? (
              <div className="w-full rounded-[32px] border border-[#d8c9fb]/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.44)_0%,rgba(244,239,255,0.2)_100%)] p-8 shadow-[0_24px_80px_rgba(124,58,237,0.08)] backdrop-blur-xl md:p-12">
                <div className="mx-auto max-w-xl text-center space-y-8">
                  <div className="space-y-4">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white shadow-lg shadow-[#7c3aed]/25">
                      <Trophy className="h-10 w-10" />
                    </div>
                    <h2 className="overflow-visible bg-gradient-to-r from-[#1f1147] to-[#7c3aed] bg-clip-text pb-3 text-4xl font-black leading-[1.2] text-transparent md:text-6xl">من سيربح المليون</h2>
                  </div>

                  <Button
                    onClick={startGame}
                    disabled={!hasEnoughQuestions}
                    className="rounded-full bg-[#7c3aed] px-14 py-7 text-xl font-bold text-white shadow-lg shadow-[#7c3aed]/25 hover:bg-[#6d28d9]"
                  >
                    ابدأ اللعبة
                  </Button>

                  {!hasEnoughQuestions && (
                    <p className="text-center text-sm font-semibold text-red-600">أضف الأسئلة الناقصة من إدارة من سيربح المليون ثم ابدأ.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[32px] border border-[#7c3aed]/12 bg-white/88 p-5 shadow-[0_28px_90px_rgba(124,58,237,0.10)] backdrop-blur md:p-8 xl:min-h-[calc(100vh-2rem)]">
                <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[#ddd6fe]/55 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-[#c4b5fd]/35 blur-3xl" />
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center" dir="ltr">
                  <div className="hidden md:block" />

                  <div className="relative flex items-center justify-center gap-3 text-[#6d28d9] md:justify-self-center" dir="rtl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white shadow-md shadow-[#7c3aed]/25">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <p className="text-[28px] font-black leading-none">{timeLeft}</p>
                  </div>

                  <div className="relative flex flex-wrap items-center gap-3 md:justify-self-end">
                    <div className="group relative">
                      <Button
                        variant="outline"
                        onClick={handleFiftyFifty}
                        disabled={fiftyUsed || !currentQuestion || answerState !== "idle"}
                        aria-label="حذف خيارين"
                        className="flex h-16 min-w-[72px] items-center justify-center rounded-[24px] border-[#cbb9fa] bg-gradient-to-br from-[#ffffff] via-[#f6f1ff] to-[#ebe2ff] shadow-[0_12px_24px_rgba(124,58,237,0.12)] hover:from-[#fcfbff] hover:via-[#f3edff] hover:to-[#e7dcff] disabled:opacity-50"
                      >
                        <span className="text-[26px] font-black leading-none tracking-[-0.04em] text-[#6d28d9]" dir="ltr">
                          50/50
                        </span>
                      </Button>
                      <div className="pointer-events-none absolute -bottom-14 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#d9d2f6] bg-white px-4 py-2 text-base font-bold text-[#6d28d9] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        حذف خيارين
                      </div>
                    </div>

                    <div className="group relative">
                      <Button
                        variant="outline"
                        onClick={handlePhoneFriend}
                        disabled={phoneUsed || !currentQuestion || answerState !== "idle"}
                        aria-label="اتصال بصديق"
                        className="flex h-16 min-w-[72px] items-center justify-center rounded-[24px] border-[#cbb9fa] bg-gradient-to-br from-[#ffffff] via-[#f6f1ff] to-[#ebe2ff] shadow-[0_12px_24px_rgba(124,58,237,0.12)] hover:from-[#fcfbff] hover:via-[#f3edff] hover:to-[#e7dcff] disabled:opacity-50 [&_svg]:!w-9 [&_svg]:!h-9"
                      >
                        <PhoneCall style={{ width: "34px", height: "34px" }} className="text-[#6d28d9]" />
                      </Button>
                      <div className="pointer-events-none absolute -bottom-14 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#d9d2f6] bg-white px-4 py-2 text-base font-bold text-[#6d28d9] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        الإتصال بصديق
                      </div>
                    </div>

                    <div className="group relative">
                      <Button
                        variant="outline"
                        onClick={handleAudiencePoll}
                        disabled={audienceUsed || !currentQuestion || answerState !== "idle"}
                        aria-label="تصويت الجمهور"
                        className="flex h-16 min-w-[72px] items-center justify-center rounded-[24px] border-[#cbb9fa] bg-gradient-to-br from-[#ffffff] via-[#f6f1ff] to-[#ebe2ff] shadow-[0_12px_24px_rgba(124,58,237,0.12)] hover:from-[#fcfbff] hover:via-[#f3edff] hover:to-[#e7dcff] disabled:opacity-50 [&_svg]:!w-9 [&_svg]:!h-9"
                      >
                        <BarChart3 style={{ width: "34px", height: "34px" }} className="text-[#6d28d9]" />
                      </Button>
                      <div className="pointer-events-none absolute -bottom-14 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#d9d2f6] bg-white px-4 py-2 text-base font-bold text-[#6d28d9] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        تصويت الجمهور
                      </div>
                    </div>
                  </div>
                </div>

                {questionLoading ? (
                  <div className="flex flex-1 items-center justify-center py-16">
                    <SiteLoader />
                  </div>
                ) : currentQuestion ? (
                  <>
                    <div className="flex flex-1 flex-col gap-5">
                      <div className="rounded-[28px] border border-[#d9d2f6] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 text-center shadow-[0_18px_45px_rgba(124,58,237,0.08)] md:p-8">
                        <p className="text-2xl font-black leading-[1.9] text-[#1f1147] md:text-4xl">{currentQuestion.question}</p>
                      </div>

                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                        {optionValues.map((option, index) => {
                          const optionNumber = index + 1
                          const isHidden = hiddenOptions.includes(optionNumber)
                          const isCorrect = currentQuestion.correct_option === optionNumber
                          const isSelected = selectedOption === optionNumber

                          let optionClass = "border-[#ddd5fb] bg-white text-[#1f1147] hover:border-[#a78bfa] hover:bg-[#faf7ff]"
                          if (answerState !== "idle") {
                            if (isCorrect) {
                              optionClass = "border-emerald-300 bg-emerald-50 text-emerald-700"
                            } else if (isSelected) {
                              optionClass = "border-red-300 bg-red-50 text-red-700"
                            } else {
                              optionClass = "border-[#ebe5fb] bg-[#f7f5ff] text-slate-400"
                            }
                          }

                          return (
                            <button
                              key={optionNumber}
                              onClick={() => handleAnswer(optionNumber)}
                              disabled={isHidden || answerState !== "idle"}
                              className={`min-h-[104px] rounded-[26px] border p-5 text-right shadow-[0_14px_32px_rgba(124,58,237,0.06)] transition-all md:min-h-[128px] flex items-center ${
                                isHidden ? "pointer-events-none opacity-0" : optionClass
                              }`}
                            >
                              <div className="flex w-full items-center gap-4">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-xl font-black text-white shadow-md shadow-[#7c3aed]/20 md:h-14 md:w-14 md:text-2xl">{optionNumber}</span>
                                <span className="text-xl font-bold leading-8 md:text-3xl">{option}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </main>

          {hasStarted ? (
            <aside dir="ltr" className="relative hidden xl:flex xl:order-2 xl:h-[calc(100vh-2rem)] xl:items-stretch xl:justify-center">
              <div className="relative h-full w-full max-w-[220px]">
                <div className="absolute inset-y-0 left-1/2 w-[150px] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-[#8370b8] via-[#f3efff] to-[#7a66b0] p-[6px] shadow-[0_20px_40px_rgba(91,33,182,0.22)]">
                  <div className="relative h-full w-full overflow-hidden rounded-[999px] bg-gradient-to-b from-[#9d91cf] via-[#e5ddfb] to-[#8475bb]">
                    <div className="absolute inset-x-[8px] bottom-[8px] top-[8px] rounded-[999px] bg-gradient-to-b from-[#b2a7dd] via-[#f8f6ff] to-[#9486ca]" />
                    <div
                      className="absolute bottom-[10px] left-[10px] right-[10px] rounded-[999px] bg-gradient-to-t from-[#5b21b6] via-[#7c3aed] to-[#c4b5fd] shadow-[0_0_22px_rgba(124,58,237,0.32)] transition-all duration-700 ease-out"
                      style={{ height: progressFillHeight(currentQuestionIndex), bottom: "8px", left: "8px", right: "8px" }}
                    />
                    <div className="absolute inset-x-[10px] bottom-[10px] top-[10px] rounded-[999px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]" />

                    {PRIZE_LADDER.map((amount, index) => {
                      const isCompleted = index < currentQuestionIndex

                      return (
                        <div
                          key={amount}
                          className="absolute inset-x-[12px]"
                          style={{ bottom: `calc(${ladderBottomOffset(index)} - 0.8rem)` }}
                        >
                          <div className="flex items-center justify-center">
                            <span
                              className={`text-[15px] font-black leading-none tracking-[0.01em] transition-colors ${
                                isCompleted
                                  ? "text-[#ffffff]"
                                  : "text-[#475569]"
                              }`}
                            >
                              {formatAmount(amount)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </aside>
          ) : null}
        </div>
      </div>

      {result.status !== "idle" && (
        <GameFinishOverlay
          title={result.title}
          subtitle={result.message}
          celebration={result.status === "won"}
          maxWidthClassName="max-w-xl"
          details={
            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-500">نتيجتك النهائية</p>
              <p className="mt-2 text-4xl font-black text-[#7c3aed]">{formatAmount(result.amount)}</p>
            </div>
          }
          actions={[
            ...(result.reason === "questions-exhausted"
              ? [
                  {
                    label: resettingQuestions ? "جارٍ إعادة الأسئلة..." : "إعادة الأسئلة",
                    onClick: () => {
                      void handleResetQuestions()
                    },
                    tone: "primary" as const,
                  },
                ]
              : []),
            {
              label: "لعب مرة أخرى",
              onClick: resetGame,
              icon: <RefreshCcw className="ml-2 h-5 w-5" />,
            },
            {
              label: "العودة للمسابقات",
              onClick: () => {
                window.location.href = "/competitions"
              },
              tone: "outline",
            },
          ]}
        />
      )}

      {phoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" onClick={() => setPhoneModalOpen(false)}>
          <div className="w-full max-w-lg rounded-[32px] border border-[#d9d2f6] bg-gradient-to-br from-[#ffffff] via-[#f7f3ff] to-[#eee6ff] p-8 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white shadow-lg shadow-[#7c3aed]/25">
              <PhoneCall className="h-9 w-9" />
            </div>
            <h2 className="mt-5 text-3xl font-black text-[#1f1147]">اتصال بصديق</h2>
            <p className="mt-3 text-lg font-bold text-[#5b5570]">اتصل عليه قبل أن ينتهي الوقت</p>
            <div className="mt-6 rounded-[28px] border border-[#ded5fb] bg-white/85 p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7c3aed]">الوقت المتبقي</p>
              <p className="mt-2 text-5xl font-black text-[#6d28d9]">{phoneTimeLeft}</p>
              <p className="mt-2 text-sm font-semibold text-[#7b7492]">ثانية</p>
            </div>
          </div>
        </div>
      )}

      {audienceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm" onClick={() => setAudienceModalOpen(false)}>
          <div className="w-full max-w-md rounded-[30px] border border-[#d9d2f6] bg-gradient-to-br from-[#ffffff] via-[#f7f3ff] to-[#eee6ff] p-5 shadow-[0_20px_55px_rgba(91,33,182,0.18)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 text-center">
              <h2 className="text-2xl font-black text-[#1f1147]">تصويت الجمهور</h2>
            </div>

            <div className="rounded-[24px] border border-[#d9d2f6] bg-[linear-gradient(180deg,#1a1333_0%,#241744_100%)] px-4 py-6 shadow-[inset_0_0_0_1px_rgba(196,181,253,0.14)]">
              <div className="flex h-[260px] items-end justify-between gap-3">
                {audienceVotes.map((vote) => (
                  <div key={vote.optionNumber} className="flex w-full flex-col items-center justify-end gap-2">
                    <p className="text-lg font-black text-white">{vote.percentage}%</p>
                    <div className="flex h-[170px] w-full max-w-[54px] items-end rounded-t-[8px] border border-[#c4b5fd]/35 bg-white/5 p-[3px] shadow-[0_0_12px_rgba(124,58,237,0.18)]">
                      <div
                        className="w-full rounded-t-[6px] bg-gradient-to-t from-[#5b21b6] via-[#7c3aed] to-[#c4b5fd] shadow-[inset_0_0_0_1px_rgba(243,240,255,0.35)]"
                        style={{ height: `${Math.max(vote.percentage, 6)}%` }}
                      />
                    </div>
                    <p className="text-[28px] font-black leading-none text-white">{vote.optionNumber}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}