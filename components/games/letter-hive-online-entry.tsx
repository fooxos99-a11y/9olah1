"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { MAX_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM, MIN_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM } from "@/lib/letter-hive-live"

export function LetterHiveOnlineEntry({
  routeBase,
  initialPlayersPerTeam = 2,
  embedded = false,
  registrationClosed = false,
  closedMessage = "التسجيل مغلق حاليًا.",
}: {
  routeBase: string
  initialPlayersPerTeam?: number
  embedded?: boolean
  registrationClosed?: boolean
  closedMessage?: string
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [playersPerTeam, setPlayersPerTeam] = useState(initialPlayersPerTeam)
  const [requiresPresenter, setRequiresPresenter] = useState(routeBase !== "/competitions/letter-hive/online")
  const isEmbeddedUnderLetterHive = routeBase === "/competitions/letter-hive/online"

  useEffect(() => {
    setPlayersPerTeam((current) => {
      const nextValue = Math.max(MIN_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM, Math.min(MAX_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM, initialPlayersPerTeam))

      return current === nextValue ? current : nextValue
    })
  }, [initialPlayersPerTeam])

  const handleCreateMatch = async () => {
    try {
      setCreating(true)
      setError("")

      const response = await fetch("/api/letter-hive-live/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playersPerTeam, routeBase, requiresPresenter }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر إنشاء اللعبة")
      }

      toast({
        title: "تم إنشاء اللعبة",
        description: requiresPresenter ? "سيتم نقلك الآن إلى صفحة المضيف." : "تم تجهيز اللعبة بدون مقدم.",
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

  if (embedded) {
    return (
      <div className="w-full space-y-4" dir="rtl">
        {!registrationClosed ? <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRequiresPresenter(false)}
            className={`h-12 rounded-[1.25rem] border text-sm font-black transition ${!requiresPresenter ? "border-[#0f766e] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_10px_28px_rgba(15,118,110,0.2)]" : "border-[#bdeee7] bg-[#f3fffd] text-[#0f766e] hover:border-[#14b8a6]"}`}
          >
            بدون مقدم
          </button>
          <button
            type="button"
            onClick={() => setRequiresPresenter(true)}
            className={`h-12 rounded-[1.25rem] border text-sm font-black transition ${requiresPresenter ? "border-[#0f766e] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_10px_28px_rgba(15,118,110,0.2)]" : "border-[#bdeee7] bg-[#f3fffd] text-[#0f766e] hover:border-[#14b8a6]"}`}
          >
            مع مقدم
          </button>
        </div> : null}

        <Button
          type="button"
          onClick={handleCreateMatch}
          disabled={creating || registrationClosed}
          className="mx-auto flex h-16 w-full max-w-md items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] px-8 text-center text-lg font-black text-white shadow-[0_22px_46px_rgba(15,118,110,0.22)] transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {registrationClosed ? "التسجيل مغلق" : creating ? "جارٍ تجهيز اللعبة..." : "ابدأ اللعبة"}
        </Button>

        {registrationClosed ? <p className="text-center text-sm font-bold text-[#0f766e]">{closedMessage}</p> : null}
        {error ? <p className="text-center text-sm font-bold text-red-600">{error}</p> : null}
      </div>
    )
  }

  if (registrationClosed) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,rgba(254,243,199,0.42)_18%,transparent_40%),radial-gradient(circle_at_right,#ddd6fe_0%,rgba(221,214,254,0.45)_20%,transparent_42%),linear-gradient(180deg,#fffdf8_0%,#faf7ff_52%,#ffffff_100%)]" dir="rtl">
        <div className="px-4 py-10 md:px-6 md:py-14">
          <div className="mx-auto max-w-3xl">
            <section className="rounded-[2.4rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(250,245,255,0.64)_100%)] px-6 py-10 shadow-[0_30px_100px_rgba(109,40,217,0.08)] backdrop-blur-xl md:px-10 md:py-14">
              <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#d7efeb] bg-white/90 p-8 text-center shadow-[0_24px_70px_rgba(15,118,110,0.1)] md:p-10">
                <h2 className="text-3xl font-black leading-tight text-[#1f1147] md:text-5xl">التسجيل مغلق</h2>
              </div>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,rgba(254,243,199,0.42)_18%,transparent_40%),radial-gradient(circle_at_right,#ddd6fe_0%,rgba(221,214,254,0.45)_20%,transparent_42%),linear-gradient(180deg,#fffdf8_0%,#faf7ff_52%,#ffffff_100%)]" dir="rtl">
      <div className="px-4 py-10 md:px-6 md:py-14">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-[2.4rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(250,245,255,0.64)_100%)] px-6 py-8 shadow-[0_30px_100px_rgba(109,40,217,0.08)] backdrop-blur-xl md:px-10 md:py-12">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-[2rem] border border-[#e7dcff] bg-[linear-gradient(145deg,rgba(255,255,255,0.96)_0%,rgba(248,242,255,0.88)_100%)] p-6 text-center shadow-[0_24px_70px_rgba(124,58,237,0.12)] md:p-8">
                <h2 className="text-3xl font-black leading-tight text-[#1f1147] md:text-5xl">{isEmbeddedUnderLetterHive ? "خلية الحروف عبر الإنترنت" : "خلية الحروف عبر الإنترنت"}</h2>

                <div className="mt-8 space-y-4">
                  <div className="mx-auto max-w-md rounded-[1.6rem] border border-[#d7efeb] bg-white/85 p-4 text-right shadow-[0_12px_36px_rgba(15,118,110,0.08)]">
                    <p className="text-sm font-black text-[#0f766e]">نمط إدارة اللعبة</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRequiresPresenter(false)}
                        className={`h-12 rounded-[1.25rem] border text-sm font-black transition ${!requiresPresenter ? "border-[#0f766e] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_10px_28px_rgba(15,118,110,0.2)]" : "border-[#bdeee7] bg-[#f3fffd] text-[#0f766e] hover:border-[#14b8a6]"}`}
                      >
                        بدون مقدم
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequiresPresenter(true)}
                        className={`h-12 rounded-[1.25rem] border text-sm font-black transition ${requiresPresenter ? "border-[#0f766e] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_10px_28px_rgba(15,118,110,0.2)]" : "border-[#bdeee7] bg-[#f3fffd] text-[#0f766e] hover:border-[#14b8a6]"}`}
                      >
                        مع مقدم
                      </button>
                    </div>
                  </div>

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
                    disabled={creating}
                    className="mx-auto flex h-16 w-full max-w-md items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] px-8 text-center text-lg font-black text-white shadow-[0_22px_46px_rgba(15,118,110,0.22)] transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Sparkles className="h-5 w-5" />
                    {creating ? "جارٍ تجهيز اللعبة..." : "ابدأ اللعبة"}
                  </Button>

                  {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}