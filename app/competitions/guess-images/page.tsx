"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"

import TrophyIcon from "@/components/TrophyIcon"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import { getGuessImagesByStage, getGuessStages } from "@/lib/guess-stages"

type Step = "stage" | "teams" | "game"

const GUESS_IMAGES_BG_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cg fill='none'%3E%3Ccircle cx='56' cy='54' r='18' stroke='%237c3aed' stroke-opacity='0.12' stroke-width='1.5'/%3E%3Ccircle cx='184' cy='62' r='26' stroke='%23a855f7' stroke-opacity='0.10' stroke-width='1.2'/%3E%3Ccircle cx='176' cy='176' r='42' stroke='%237c3aed' stroke-opacity='0.08' stroke-width='1.2'/%3E%3Cpath d='M28 168h64M148 110h50M70 32v34M210 150v28' stroke='%237c3aed' stroke-opacity='0.08' stroke-width='1.4' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E\")"

export default function GuessImagesGame() {
  const [step, setStep] = useState<Step>("stage")
  const [stages, setStages] = useState<any[]>([])
  const [selectedStage, setSelectedStage] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [team1Name, setTeam1Name] = useState("")
  const [team2Name, setTeam2Name] = useState("")
  const [team1Score, setTeam1Score] = useState(0)
  const [team2Score, setTeam2Score] = useState(0)
  const [stagesLoading, setStagesLoading] = useState(false)
  const [imagesLoading, setImagesLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [answeredTeam, setAnsweredTeam] = useState<number | undefined>(undefined)

  const current = images[currentIndex]
  const rankings = [
    { name: team1Name, score: team1Score },
    { name: team2Name, score: team2Score },
  ].sort((a, b) => b.score - a.score)

  const loadStages = async () => {
    setStagesLoading(true)
    setLoadError(null)

    try {
      const data = await getGuessStages()
      setStages(data)

      if (data.length === 1) {
        setSelectedStage(data[0])
        setImagesLoading(true)
        const imgs = await getGuessImagesByStage(data[0].id)
        setImages(imgs)
        setStep("teams")
        setImagesLoading(false)
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "تعذر تحميل المراحل")
      setStages([])
    } finally {
      setStagesLoading(false)
    }
  }

  useEffect(() => {
    if (step !== "stage") {
      return
    }

    void loadStages()
  }, [step])

  const handleShowDialog = (open: boolean) => {
    setShowDialog(open)
    if (open) {
      setAnsweredTeam(undefined)
    }
  }

  const handleStageSelect = async (stage: any) => {
    setSelectedStage(stage)
    setLoadError(null)
    setImagesLoading(true)
    setStep("teams")

    try {
      const imgs = await getGuessImagesByStage(stage.id)
      setImages(imgs)

      if (team1Name.trim() && team2Name.trim()) {
        setStep("game")
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "تعذر تحميل صور المرحلة")
      setStep("stage")
    } finally {
      setImagesLoading(false)
    }
  }

  const handleTeamsSubmit = () => {
    if (imagesLoading) {
      return
    }

    if (team1Name.trim() && team2Name.trim()) {
      setStep("game")
    }
  }

  const advanceRound = () => {
    setShowDialog(false)
    setAnsweredTeam(undefined)
    setTimeout(() => {
      setCurrentIndex((index) => index + 1)
    }, 100)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#faf6ff_38%,#f5efff_100%)] p-0">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(168,85,247,0.20)_0%,rgba(168,85,247,0.08)_18%,transparent_42%),radial-gradient(circle_at_84%_20%,rgba(124,58,237,0.18)_0%,rgba(124,58,237,0.05)_20%,transparent_42%),radial-gradient(circle_at_50%_82%,rgba(192,132,252,0.14)_0%,rgba(192,132,252,0.05)_18%,transparent_40%)]" />
        <div className="absolute -left-24 top-[10%] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.22)_0%,rgba(124,58,237,0.08)_36%,transparent_72%)] blur-3xl" />
        <div className="absolute -right-20 bottom-[8%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18)_0%,rgba(168,85,247,0.07)_36%,transparent_72%)] blur-3xl" />
        <div className="absolute left-[8%] top-[18%] h-[160px] w-[280px] rotate-[-11deg] rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(248,240,255,0.34)_100%)] shadow-[0_24px_80px_rgba(124,58,237,0.12)]" />
        <div className="absolute right-[9%] top-[24%] h-[220px] w-[150px] rotate-[12deg] rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(243,232,255,0.28)_100%)] shadow-[0_24px_80px_rgba(124,58,237,0.10)]" />
        <div className="absolute bottom-[14%] left-[10%] h-[190px] w-[150px] rotate-[-14deg] rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.58)_0%,rgba(245,235,255,0.26)_100%)] shadow-[0_24px_80px_rgba(124,58,237,0.08)]" />
        <div className="absolute bottom-[10%] right-[10%] h-[150px] w-[300px] rotate-[8deg] rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.58)_0%,rgba(245,235,255,0.24)_100%)] shadow-[0_24px_80px_rgba(124,58,237,0.08)]" />
        <div className="absolute inset-[6%_4%] rounded-[3rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.06)_100%)]" />
        <div className="absolute inset-0 opacity-70" style={{ backgroundImage: GUESS_IMAGES_BG_PATTERN, backgroundSize: "240px 240px", backgroundPosition: "center center", maskImage: "radial-gradient(circle at center, black 32%, transparent 86%)" }} />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1700px] flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {step === "stage" && (
          <div className="flex w-full max-w-5xl flex-col items-center gap-8 rounded-[2rem] border border-white/55 bg-white/58 px-6 py-10 shadow-[0_30px_80px_rgba(88,28,135,0.08)] backdrop-blur-md sm:px-10 sm:py-12">
            <div className="text-center">
              <h2 className="mb-5 text-5xl font-extrabold tracking-[-0.04em] text-[#7c3aed] drop-shadow-[0_10px_25px_rgba(124,58,237,0.14)] sm:text-7xl">
                اختر المرحلة
              </h2>
              <div className="text-xl font-semibold text-[#22113f] sm:text-2xl">كل مرحلة بها 10 صور</div>
            </div>

            {stagesLoading ? (
              <SiteLoader size="lg" />
            ) : loadError ? (
              <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/55 bg-white/54 px-6 py-8 text-center backdrop-blur-md">
                <p className="text-lg font-bold text-[#22113f]">{loadError}</p>
                <Button className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]" onClick={() => void loadStages()}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : stages.length === 0 ? (
              <div className="rounded-[1.75rem] border border-white/55 bg-white/54 px-6 py-8 text-center text-lg font-bold text-[#22113f] backdrop-blur-md">
                لا توجد مراحل متاحة حاليًا.
              </div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {stages.map((stage) => (
                  <Button
                    key={stage.id}
                    className={`flex min-h-[112px] items-center justify-center whitespace-normal break-words rounded-[1.75rem] border-[3px] bg-white/72 px-5 py-6 text-center text-2xl font-extrabold leading-[1.3] tracking-[-0.03em] text-[#22113f] shadow-[0_22px_44px_rgba(88,28,135,0.08)] backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-white/82 hover:shadow-[0_24px_52px_rgba(88,28,135,0.12)] sm:min-h-[120px] sm:text-3xl lg:text-[2.5rem] ${selectedStage?.id === stage.id ? "border-[#7c3aed] ring-8 ring-[#7c3aed]/12" : "border-[#7c3aed]"}`}
                    onClick={() => handleStageSelect(stage)}
                  >
                    <span className="block max-w-full">{stage.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "teams" && (
          <div className="flex min-h-[70vh] w-full items-center justify-center">
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-[2rem] border border-white/55 bg-white/58 p-5 shadow-[0_28px_70px_rgba(88,28,135,0.09)] backdrop-blur-md sm:p-8">
                <h2
                  className="mb-8 mt-4 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] bg-clip-text pb-2 pt-2 text-center text-3xl font-extrabold tracking-[-0.03em] text-transparent sm:mb-14 sm:mt-8 sm:text-4xl"
                  style={{ lineHeight: 1.3 }}
                >
                  أسماء الفرق
                </h2>
                <form
                  className="space-y-8"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleTeamsSubmit()
                  }}
                >
                  <div>
                    <Label htmlFor="team1" className="text-lg font-semibold text-[#22113f]">
                      اسم الفريق الأول
                    </Label>
                    <Input
                      id="team1"
                      value={team1Name}
                      onChange={(e) => setTeam1Name(e.target.value)}
                      placeholder="أدخل اسم الفريق الأول"
                      className="mt-3 h-14 border-2 border-[#d9d2f6] bg-white py-3 text-lg focus:border-[#7c3aed]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="team2" className="text-lg font-semibold text-[#22113f]">
                      اسم الفريق الثاني
                    </Label>
                    <Input
                      id="team2"
                      value={team2Name}
                      onChange={(e) => setTeam2Name(e.target.value)}
                      placeholder="أدخل اسم الفريق الثاني"
                      className="mt-3 h-14 border-2 border-[#d9d2f6] bg-white py-3 text-lg focus:border-[#7c3aed]"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!team1Name.trim() || !team2Name.trim() || imagesLoading}
                    className="mt-6 h-16 w-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-xl text-white shadow-lg hover:from-[#8b5cf6] hover:to-[#7c3aed]"
                  >
                    {imagesLoading ? "جاري تجهيز المرحلة..." : "بدء اللعبة"}
                    <ArrowRight className="mr-2 inline" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {step === "game" && (
          <>
            <div className="mb-3 flex w-full max-w-7xl justify-between gap-4 px-2 sm:px-4 lg:px-8">
              <div className="flex flex-col items-center">
                <div className="min-w-[160px] rounded-xl border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.58)_0%,rgba(242,232,255,0.34)_100%)] px-4 py-2 text-center text-xl font-extrabold text-[#22113f] shadow-[0_18px_40px_rgba(88,28,135,0.08)] backdrop-blur-md sm:min-w-[180px] sm:text-2xl">
                  {team2Name}
                </div>
                <div className="mt-2 flex w-full min-w-[120px] items-center justify-center gap-0 rounded-lg border border-white/30 bg-[linear-gradient(135deg,rgba(124,58,237,0.82)_0%,rgba(168,85,247,0.72)_100%)] px-2 py-2 text-xl font-extrabold text-white shadow-[0_18px_34px_rgba(88,28,135,0.16)] backdrop-blur-md">
                  <Button size="icon" variant="ghost" className="!h-10 !w-10 text-white hover:bg-white/10" onClick={() => setTeam2Score((score) => score + 1)} title="إضافة">
                    <span style={{ fontSize: "1.5em", lineHeight: 1 }}>+</span>
                  </Button>
                  <span className="mx-4 min-w-[32px] select-none text-center text-2xl font-bold">{team2Score}</span>
                  <Button size="icon" variant="ghost" className="!h-10 !w-10 text-white hover:bg-white/10 disabled:text-white/50" onClick={() => setTeam2Score((score) => score - 1)} disabled={team2Score <= 0} title="إنقاص">
                    <span style={{ fontSize: "1.5em", lineHeight: 1 }}>-</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="min-w-[160px] rounded-xl border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.58)_0%,rgba(242,232,255,0.34)_100%)] px-4 py-2 text-center text-xl font-extrabold text-[#22113f] shadow-[0_18px_40px_rgba(88,28,135,0.08)] backdrop-blur-md sm:min-w-[180px] sm:text-2xl">
                  {team1Name}
                </div>
                <div className="mt-2 flex w-full min-w-[120px] items-center justify-center gap-0 rounded-lg border border-white/30 bg-[linear-gradient(135deg,rgba(124,58,237,0.82)_0%,rgba(168,85,247,0.72)_100%)] px-2 py-2 text-xl font-extrabold text-white shadow-[0_18px_34px_rgba(88,28,135,0.16)] backdrop-blur-md">
                  <Button size="icon" variant="ghost" className="!h-10 !w-10 text-white hover:bg-white/10" onClick={() => setTeam1Score((score) => score + 1)} title="إضافة">
                    <span style={{ fontSize: "1.5em", lineHeight: 1 }}>+</span>
                  </Button>
                  <span className="mx-4 min-w-[32px] select-none text-center text-2xl font-bold">{team1Score}</span>
                  <Button size="icon" variant="ghost" className="!h-10 !w-10 text-white hover:bg-white/10 disabled:text-white/50" onClick={() => setTeam1Score((score) => score - 1)} disabled={team1Score <= 0} title="إنقاص">
                    <span style={{ fontSize: "1.5em", lineHeight: 1 }}>-</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-1 flex-col items-center justify-center">
              <div className="relative mb-4 flex h-[380px] w-full max-w-7xl items-center justify-center overflow-hidden rounded-[2rem] border border-white/60 bg-white/46 shadow-[0_30px_80px_rgba(88,28,135,0.10)] backdrop-blur-md sm:h-[440px]" style={{ aspectRatio: "16/7" }}>
                {current?.image_url ? (
                  <>
                    <div
                      className="absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-2xl"
                      style={{ backgroundImage: `url(${current.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_0%,rgba(255,255,255,0.18)_68%,rgba(255,255,255,0.34)_100%)]" />
                    <img
                      src={current.image_url}
                      alt="صورة التخمين"
                      className="relative z-10 h-full w-full scale-[1.14] object-contain"
                    />
                  </>
                ) : (
                  <span className="relative z-10 text-gray-400">لا توجد صورة</span>
                )}
              </div>

              <div className="flex w-full flex-col items-center">
                <Button
                  className="mb-2 rounded-2xl bg-[#7c3aed] px-16 py-6 text-2xl font-bold text-white shadow-[0_18px_40px_rgba(88,28,135,0.22)] hover:bg-[#6d28d9]"
                  onClick={() => handleShowDialog(true)}
                >
                  الإجابة
                </Button>

                <Dialog open={showDialog} onOpenChange={handleShowDialog}>
                  <DialogContent showCloseButton={false} className="max-w-md border border-white/55 bg-white/68 backdrop-blur-md" style={{ direction: "rtl", textAlign: "right" }}>
                    <DialogHeader>
                      <DialogTitle className="text-center text-2xl">الإجابة</DialogTitle>
                      <div className="mb-2 w-full text-center text-lg font-semibold text-[#22113f]" style={{ direction: "rtl" }}>
                        اكتشف معنى الصورة قبل الفريق الآخر
                      </div>
                    </DialogHeader>
                    <div className="my-4 text-center text-2xl font-bold text-[#7c3aed]">{current?.answer}</div>
                    <div className="mt-2 flex flex-col gap-2">
                      <div className="mb-1 text-center text-lg font-semibold">من الفريق الذي أجاب؟</div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Button
                          onClick={() => {
                            setTeam1Score((score) => score + 1)
                            advanceRound()
                          }}
                          className="bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-8 py-3 text-lg font-bold text-white shadow"
                        >
                          {team1Name}
                        </Button>
                        <Button
                          onClick={() => {
                            setTeam2Score((score) => score + 1)
                            advanceRound()
                          }}
                          className="bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-8 py-3 text-lg font-bold text-white shadow"
                        >
                          {team2Name}
                        </Button>
                        <Button onClick={advanceRound} className="bg-red-500 px-8 py-3 text-lg font-bold text-white shadow hover:bg-red-600">
                          محد جاوب
                        </Button>
                      </div>
                      {typeof answeredTeam !== "undefined" && (
                        <div className="mt-4 flex justify-center">
                          <Button onClick={advanceRound} className="bg-[#7c3aed] px-8 py-3 text-xl font-bold text-white shadow">
                            التالي
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {currentIndex >= images.length && (
              <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[rgba(26,11,46,0.24)] px-4 backdrop-blur-sm">
                <div className="flex w-full max-w-2xl flex-col items-center rounded-[2rem] border border-white/55 bg-white/66 p-6 text-center shadow-[0_36px_90px_rgba(88,28,135,0.18)] backdrop-blur-md sm:p-12">
                  <TrophyIcon />
                  <h1 className="mb-2 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] bg-clip-text text-4xl font-bold text-transparent sm:text-5xl" style={{ lineHeight: 1.2, paddingBottom: "0.2em" }}>
                    مبروك!
                  </h1>
                  {team1Score === team2Score ? (
                    <p className="mb-4 text-2xl font-bold text-[#22113f]">تعادل بين الفريقين!</p>
                  ) : (
                    <>
                      <div className="mb-2 mt-4 text-5xl font-black text-[#7c3aed] sm:text-6xl">
                        {team1Score > team2Score ? team1Name : team2Name}
                      </div>
                      <div className="mb-4 text-2xl font-bold text-[#22113f]">
                        {(team1Score === team2Score ? team1Score : Math.max(team1Score, team2Score)).toLocaleString()}
                      </div>
                    </>
                  )}
                  <div className="mx-auto mt-4 w-full max-w-md space-y-4">
                    <h3 className="mb-4 text-2xl font-bold text-[#22113f]">النتائج النهائية:</h3>
                    {rankings.map((team, idx) => (
                      <div key={`${team.name}-${idx}`} className="mb-2 flex items-center justify-between rounded-xl border border-white/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.5)_0%,rgba(244,236,255,0.34)_100%)] p-4 backdrop-blur-sm">
                        <span className="text-xl font-bold text-[#22113f]">
                          {idx + 1}. {team.name}
                        </span>
                        <span className="text-2xl font-black text-[#7c3aed]">{team.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row">
                    <Button
                      onClick={() => window.location.reload()}
                      className="flex-1 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] py-6 text-xl text-white hover:from-[#8b5cf6] hover:to-[#7c3aed]"
                    >
                      <svg className="mr-2 inline h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeWidth="2" d="M4.93 19.07A10 10 0 1 1 12 22v-4m0 4 3-3m-3 3-3-3" />
                      </svg>
                      لعب مرة أخرى
                    </Button>
                    <Button
                      onClick={() => {
                        window.location.href = "/"
                      }}
                      className="flex-1 items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-700 py-6 text-xl text-white hover:from-red-600 hover:to-red-800"
                    >
                      <TrophyIcon className="mr-1 h-5 w-5" /> خروج
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
