"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Users2 } from "lucide-react"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { MAX_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM, MIN_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM } from "@/lib/letter-hive-live"

type AuthUser = {
  id: string
  name: string
  role: string
}

export default function LetterHiveLiveEntryPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [playersPerTeam, setPlayersPerTeam] = useState(2)
  const [registrationForm, setRegistrationForm] = useState({
    teamName: "",
    playerOneName: "",
    playerTwoName: "",
  })
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [registrationError, setRegistrationError] = useState("")
  const [registrationMessage, setRegistrationMessage] = useState("")

  const isAdmin = user?.role === "admin"
  const canRegisterTeam = Boolean(user)

  useEffect(() => {
    let cancelled = false

    const loadAuth = async () => {
      try {
        const response = await fetch("/api/auth", { cache: "no-store" })
        const data = await response.json()

        if (!cancelled) {
          setUser(data?.success ? data.user || null : null)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
        }
      }
    }

    void loadAuth()

    return () => {
      cancelled = true
    }
  }, [])

  const handleCreateMatch = async () => {
    try {
      setCreating(true)
      setError("")

      if (!user) {
        toast({
          title: "سجل دخولك أولًا",
          description: "سوف يتم تحويلك إلى صفحة تسجيل الدخول.",
        })
        router.push("/login")
        return
      }

      if (!isAdmin) {
        toast({
          title: "هذا الزر ليس للاعبين",
          description: "تم نقلك إلى قسم تسجيل الفريق بالأسفل.",
        })
        document.getElementById("team-registration")?.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }

      const response = await fetch("/api/letter-hive-live/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playersPerTeam }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر إنشاء اللعبة")
      }

      toast({
        title: "تم إنشاء البطولة",
        description: "سيتم نقلك الآن إلى صفحة إدارة البطولة.",
      })
      router.push(data.links.presenter)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "تعذر إنشاء اللعبة"
      setError(message)
      toast({
        variant: "destructive",
        title: "تعذر تنفيذ الطلب",
        description: message,
      })
    } finally {
      setCreating(false)
    }
  }

  const handleRegistrationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setRegistrationLoading(true)
      setRegistrationError("")
      setRegistrationMessage("")

      if (!canRegisterTeam) {
        throw new Error("يجب تسجيل الدخول أولًا لتسجيل الفريق")
      }

      const response = await fetch("/api/letter-hive-live/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ التسجيل")
      }

      setRegistrationForm({
        teamName: "",
        playerOneName: "",
        playerTwoName: "",
      })
      setRegistrationMessage("تم تسجيل الفريق بنجاح")
    } catch (requestError) {
      setRegistrationError(requestError instanceof Error ? requestError.message : "تعذر حفظ التسجيل")
    } finally {
      setRegistrationLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,rgba(254,243,199,0.42)_18%,transparent_40%),radial-gradient(circle_at_right,#ddd6fe_0%,rgba(221,214,254,0.45)_20%,transparent_42%),linear-gradient(180deg,#fffdf8_0%,#faf7ff_52%,#ffffff_100%)]" dir="rtl">
      <Header />
      <main className="px-4 py-10 md:px-6 md:py-14">
        <div className="mx-auto max-w-6xl space-y-12">
          <section className="rounded-[2.4rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(250,245,255,0.64)_100%)] px-6 py-8 shadow-[0_30px_100px_rgba(109,40,217,0.08)] backdrop-blur-xl md:px-10 md:py-12">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-[2rem] border border-[#e7dcff] bg-[linear-gradient(145deg,rgba(255,255,255,0.96)_0%,rgba(248,242,255,0.88)_100%)] p-6 text-center shadow-[0_24px_70px_rgba(124,58,237,0.12)] md:p-8">
                <h1 className="text-3xl font-black leading-tight text-[#1f1147] md:text-5xl">بطولة خلية الحروف للقيمرزيون</h1>

                <div className="mt-8 space-y-4">
                  <div className="mx-auto max-w-md rounded-[1.6rem] border border-[#e7dcff] bg-white/85 p-4 text-right shadow-[0_12px_36px_rgba(124,58,237,0.08)]">
                    <p className="text-sm font-black text-[#6d28d9]">كم لاعب لكل فريق؟</p>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {Array.from({ length: MAX_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM - MIN_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM + 1 }, (_, index) => {
                        const option = index + MIN_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setPlayersPerTeam(option)}
                            className={`h-12 rounded-[1.25rem] border text-sm font-black transition ${playersPerTeam === option ? "border-[#7c3aed] bg-[linear-gradient(135deg,#8b5cf6_0%,#6d28d9_100%)] text-white shadow-[0_10px_28px_rgba(124,58,237,0.2)]" : "border-[#d9cdf8] bg-[#fcfbff] text-[#4c3d77] hover:border-[#bda8f6]"}`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleCreateMatch}
                    disabled={creating || authLoading}
                    className="mx-auto h-16 w-full max-w-md rounded-[1.6rem] bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_58%,#312e81_120%)] px-8 text-lg font-black text-white shadow-[0_22px_46px_rgba(109,40,217,0.28)] transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Sparkles className="h-5 w-5" />
                    {creating ? "جارٍ إنشاء البطولة..." : "إنشاء البطولة"}
                  </Button>

                  {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section id="team-registration" className="rounded-[2.2rem] border border-[#e8ddff] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,245,255,0.82)_100%)] p-6 shadow-[0_24px_80px_rgba(124,58,237,0.08)] backdrop-blur-xl md:p-8">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-[2rem] border border-[#e7dcff] bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(248,242,255,0.9)_100%)] p-6 text-center shadow-[0_24px_70px_rgba(124,58,237,0.1)] md:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8c9fb]/55 bg-white/80 px-4 py-2 text-sm font-black text-[#6d28d9]">
                  <Users2 className="h-4 w-4" />
                  تسجيل الفرق
                </div>
                <h2 className="mt-4 text-2xl font-black text-[#1f1147] md:text-3xl">سجل فريقك للدخول في البطولة</h2>

                <form onSubmit={handleRegistrationSubmit} className="mx-auto mt-8 max-w-3xl space-y-4 rounded-[1.8rem] border border-[#ede4ff] bg-white/90 p-5 text-right shadow-[0_18px_50px_rgba(124,58,237,0.08)] md:p-6">
                {!authLoading && !canRegisterTeam ? (
                  <div className="rounded-[1.25rem] border border-[#e9ddff] bg-[#faf7ff] px-4 py-3 text-sm font-bold text-[#6d28d9]">
                    يجب عليك التسجيل أولًا حتى تتمكن من تسجيل الفريق.
                  </div>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-sm font-black text-[#1f1147]">اسم الفريق</span>
                  <input
                    value={registrationForm.teamName}
                    onChange={(event) => setRegistrationForm((current) => ({ ...current, teamName: event.target.value }))}
                    disabled={authLoading || !canRegisterTeam}
                    className="h-12 w-full rounded-2xl border border-[#d9cdf8] bg-[#fcfbff] px-4 text-sm font-medium text-[#1f1147] outline-none transition placeholder:text-[#a69dc2] focus:border-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-55"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-black text-[#1f1147]">اسم اللاعب الأول</span>
                    <input
                      value={registrationForm.playerOneName}
                      onChange={(event) => setRegistrationForm((current) => ({ ...current, playerOneName: event.target.value }))}
                      disabled={authLoading || !canRegisterTeam}
                      className="h-12 w-full rounded-2xl border border-[#d9cdf8] bg-[#fcfbff] px-4 text-sm font-medium text-[#1f1147] outline-none transition placeholder:text-[#a69dc2] focus:border-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="اللاعب الأول"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-black text-[#1f1147]">اسم اللاعب الثاني</span>
                    <input
                      value={registrationForm.playerTwoName}
                      onChange={(event) => setRegistrationForm((current) => ({ ...current, playerTwoName: event.target.value }))}
                      disabled={authLoading || !canRegisterTeam}
                      className="h-12 w-full rounded-2xl border border-[#d9cdf8] bg-[#fcfbff] px-4 text-sm font-medium text-[#1f1147] outline-none transition placeholder:text-[#a69dc2] focus:border-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="اللاعب الثاني"
                    />
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={registrationLoading || authLoading || !canRegisterTeam}
                  className="w-full rounded-[1.5rem] bg-[linear-gradient(135deg,#8b5cf6_0%,#7c3aed_52%,#6d28d9_100%)] py-3.5 text-base font-black text-white shadow-[0_20px_45px_rgba(124,58,237,0.24)] transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {registrationLoading ? "جارٍ إرسال التسجيل..." : "تسجيل الفريق"}
                </Button>

                {registrationError ? <p className="text-sm font-bold text-red-600">{registrationError}</p> : null}
                {registrationMessage ? <p className="text-sm font-bold text-[#047857]">{registrationMessage}</p> : null}
                </form>
              </div>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  )
}