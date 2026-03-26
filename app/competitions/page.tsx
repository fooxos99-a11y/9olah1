"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { getCachedClientAuth, persistClientAuth, setCachedClientAuth } from "@/lib/auth/client"
import {
  ChevronLeft,
  Loader2,
  Lock,
} from "lucide-react"

type GameCard = {
  id: string
  title: string
  description: string
  tagline: string
  preview?: "letter-hive"
  available: boolean
  publicAccess?: boolean
  path: string
  accent: string
  surfaceClass: string
  glowClass: string
  patternClass: string
}

const REGISTERED_LIBRARY_ROLES = ["registered"]
const FULL_LIBRARY_ROLES = ["registered", "subscriber", "admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]
const LETTER_HIVE_CARD_THEME = {
  surfaceClass:
    "bg-[linear-gradient(135deg,#f0fdf4_0%,#dcfce7_48%,#bbf7d0_100%)] text-[#14532d] border-[#86efac]/60",
  glowClass: "bg-[#22c55e]/18",
  patternClass:
    "bg-[radial-gradient(circle_at_18%_22%,rgba(34,197,94,0.24),transparent_16%),radial-gradient(circle_at_82%_72%,rgba(22,163,74,0.16),transparent_18%),linear-gradient(30deg,rgba(255,255,255,0.22)_12%,transparent_12%,transparent_50%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.22)_62%,transparent_62%,transparent)] bg-[size:auto,auto,52px_52px]",
}
const AUCTION_CARD_THEME = {
  surfaceClass:
    "bg-[linear-gradient(135deg,#fff8f1_0%,#ffedd5_48%,#fdba74_140%)] text-[#7c2d12] border-[#fdba74]/50",
  glowClass: "bg-[#fb923c]/20",
  patternClass:
    "bg-[radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.24),transparent_18%),radial-gradient(circle_at_20%_80%,rgba(234,88,12,0.16),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.22)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.22)_75%,transparent_75%,transparent)] bg-[size:auto,auto,44px_44px]",
}

const games: GameCard[] = [
  {
    id: "categories",
    title: "لعبة الفئات",
    description: "اختر الفئة اللي تعرف لها، جاوب بسرعة، وفوز!",
    tagline: "أجواء لوحات التحدي الكلاسيكية",
    available: true,
    path: "/competitions/categories",
    accent: "#7c3aed",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
  {
    id: "auction",
    title: "لعبة المزاد",
    description: "زايد، غامر، وسوم على السؤال اللي واثق بإجابته.",
    tagline: "توتر، مخاطرة، وقرارات سريعة",
    available: true,
    path: "/competitions/auction",
    accent: "#ea580c",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
  {
    id: "guess-images",
    title: "خمن الصورة",
    description: "ركز وخمن الصورة بسرعة قبل خصمك!",
    tagline: "لعبة بصرية سريعة ومسلية",
    available: true,
    path: "/competitions/guess-images",
    accent: "#0f766e",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
  {
    id: "letter-hive",
    title: "خلية الحروف",
    description: "حاول توصل لونك من جهة الى جهة بأجوبتك السريعة!",
    tagline: "تفكير سريع ولمسة ذكاء",
    preview: "letter-hive",
    available: true,
    path: "/competitions/letter-hive/teams",
    accent: "#16a34a",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
  {
    id: "millionaire-game",
    title: "من سيربح المليون",
    description: "جاوب صح، اطلع خطوة خطوة، ووصل لسؤال المليون.",
    tagline: "بانتظار الإطلاق",
    available: false,
    path: "/competitions/millionaire-game",
    accent: "#2563eb",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
  {
    id: "family-feud",
    title: "فايملي فيود",
    description: "تحدٍ جماعي سريع يعتمد على أشهر الإجابات والتوقعات بين الفرق.",
    tagline: "بانتظار الإطلاق",
    available: false,
    path: "/competitions/family-feud",
    accent: "#dc2626",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
  {
    id: "higher-lower",
    title: "أعلى أو أقل",
    description: "تخمينات سريعة ومفاجآت متتالية في كل جولة.",
    tagline: "قريبًا ضمن باقة الألعاب",
    available: false,
    path: "/competitions/higher-lower",
    accent: "#64748b",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
  {
    id: "focus-challenge",
    title: "تحدي التركيز",
    description: "اختبر قوة ملاحظتك وتركيزك في تحديات دقيقة وسريعة.",
    tagline: "بانتظار الإطلاق",
    available: false,
    path: "/competitions/focus-challenge",
    accent: "#f59e0b",
    surfaceClass: "bg-white text-[#1f1147] border-[#7c3aed]/10 shadow-[0_8px_30px_rgba(124,58,237,0.04)]",
    glowClass: "bg-[#7c3aed]/10",
    patternClass: "bg-[linear-gradient(to_right,#f3e8ff_1px,transparent_1px),linear-gradient(to_bottom,#f3e8ff_1px,transparent_1px)] [background-size:2rem_2rem] opacity-[0.4]",
  },
]

const letterHiveRows = [
  ["ط", "ص", "د", "غ", "س"],
  ["أ", "ن", "ل", "هـ", "و"],
  ["ك", "ح", "ر", "ف", "ض"],
  ["ج", "ب", "ع", "خ", "ش"],
  ["م", "ز", "ت", "ي", "ق"],
]

function LetterHivePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[310px] overflow-hidden rounded-[1.75rem] border border-white/50 bg-[#20d3bf] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#e70b42_0%,#e70b42_18%,transparent_18%,transparent_82%,#e70b42_82%,#e70b42_100%)] opacity-95" />
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[#c70a3a]/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_38%)]" />

      <div className="relative rounded-[1.5rem] border border-white/30 bg-white/10 p-3 backdrop-blur-[2px]">
        <div className="space-y-[-14px]">
          {letterHiveRows.map((row, rowIndex) => (
            <div
              key={row.join("-")}
              className={`flex items-center justify-center gap-[2px] ${rowIndex % 2 === 1 ? "pr-10" : ""}`}
            >
              {row.map((letter) => (
                <div key={`${rowIndex}-${letter}`} className="relative flex h-[58px] w-[52px] items-center justify-center">
                  <div
                    className="absolute inset-0 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.14)]"
                    style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
                  />
                  <div
                    className="absolute inset-[2px] border-[3px] border-[#3a4d63] bg-[#fcfcfb]"
                    style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
                  />
                  <span className="relative text-[1.65rem] font-black text-[#334155]">{letter}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameArtwork({ game, index }: { game: GameCard; index: number }) {
  if (game.preview === "letter-hive") {
    return (
      <div className="relative w-full max-w-[420px] rotate-[-2deg] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.02]">
        <div className="absolute -inset-4 rounded-[2.25rem] blur-3xl" style={{ backgroundColor: `${game.accent}24` }} />
        <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/55 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${game.accent}18 0%, rgba(255,255,255,0.9) 55%, ${game.accent}10 100%)` }} />
          <div className="relative overflow-hidden rounded-[1.6rem] border border-black/10 bg-white/70">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_38%)]" />
            <img
              src="/خلية.png"
              alt="معاينة لعبة خلية الحروف"
              className="block h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    )
  }

  if (game.id === "categories") {
    return (
      <div className="relative w-full max-w-[420px] rotate-[-2deg] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.02]">
        <div className="absolute -inset-4 rounded-[2.25rem] blur-3xl" style={{ backgroundColor: `${game.accent}24` }} />
        <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/55 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${game.accent}18 0%, rgba(255,255,255,0.9) 55%, ${game.accent}10 100%)` }} />
          <div className="relative overflow-hidden rounded-[1.6rem] border border-black/10 bg-white/70">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_38%)]" />
            <img
              src="/فئات.png"
              alt="معاينة لعبة الفئات"
              className="block h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    )
  }

  if (game.id === "auction") {
    return (
      <div className="relative w-full max-w-[420px] rotate-[-2deg] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.02]">
        <div className="absolute -inset-4 rounded-[2.25rem] blur-3xl" style={{ backgroundColor: `${game.accent}24` }} />
        <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/55 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${game.accent}18 0%, rgba(255,255,255,0.9) 55%, ${game.accent}10 100%)` }} />
          <div className="relative overflow-hidden rounded-[1.6rem] border border-black/10 bg-white/70">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_38%)]" />
            <img
              src="/المزاد.png"
              alt="معاينة لعبة المزاد"
              className="block h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    )
  }

  if (game.id === "guess-images") {
    return (
      <div className="relative w-full max-w-[420px] rotate-[-2deg] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.02]">
        <div className="absolute -inset-4 rounded-[2.25rem] blur-3xl" style={{ backgroundColor: `${game.accent}24` }} />
        <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/55 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${game.accent}18 0%, rgba(255,255,255,0.9) 55%, ${game.accent}10 100%)` }} />
          <div className="relative overflow-hidden rounded-[1.6rem] border border-black/10 bg-white/70">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_38%)]" />
            <img
              src="/خمن.png"
              alt="معاينة لعبة خمن الصورة"
              className="block h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="absolute -inset-4 rounded-[2.25rem] blur-3xl" style={{ backgroundColor: `${game.accent}24` }} />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-white/55 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm">
        <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${game.accent}24 0%, rgba(255,255,255,0.92) 55%, ${game.accent}10 100%)` }} />
        <div className="absolute -left-8 top-8 h-24 w-24 rounded-full" style={{ backgroundColor: `${game.accent}22` }} />
        <div className="absolute -bottom-10 right-6 h-28 w-28 rounded-full" style={{ backgroundColor: `${game.accent}1a` }} />
        <div className="absolute inset-x-6 top-6 h-px bg-black/10" />
        <div className="absolute bottom-6 left-6 right-6 h-px bg-black/5" />

        <div className="relative flex min-h-[240px] flex-col justify-between rounded-[1.6rem] border border-black/10 bg-white/65 p-6 text-right">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-bold text-[#1f1147]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${game.accent}16`, color: game.accent }}>
              {game.available ? "جاهزة الآن" : "قريبًا"}
            </span>
          </div>

          <div className="space-y-3">
            <div className="text-3xl font-black leading-tight text-[#1f1147] md:text-4xl">{game.title}</div>
            <div className="text-sm font-bold tracking-[0.18em] text-black/40">SOULAH WA JAWLAH</div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="max-w-[12rem] text-sm leading-7 text-[#4b5563]">{game.tagline}</div>
            <div className="text-6xl font-black leading-none text-black/6 md:text-7xl">{String(index + 1).padStart(2, "0")}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompetitionsPage() {
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null)
  const [hasFullAccess, setHasFullAccess] = useState(false)
  const [hasRegisteredAccess, setHasRegisteredAccess] = useState(false)
  const [authResolved, setAuthResolved] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function loadAccess() {
      const cachedUser = getCachedClientAuth()
      if (!cancelled && cachedUser?.role) {
        setHasFullAccess(FULL_LIBRARY_ROLES.includes(cachedUser.role))
        setHasRegisteredAccess(REGISTERED_LIBRARY_ROLES.includes(cachedUser.role))
        setAuthResolved(true)
      }

      try {
        const response = await fetch("/api/auth", { cache: "no-store" })
        const data = await response.json()
        const resolvedUser = data?.user
          ? {
              id: String(data.user.id || ""),
              name: data.user.name || "",
              role: data.user.role || "",
              accountNumber: String(data.user.accountNumber || ""),
              halaqah: data.user.halaqah || "",
              email: data.user.email || "",
              phoneNumber: data.user.phoneNumber || "",
            }
          : null
        const role = resolvedUser?.role || cachedUser?.role || ""

        if (resolvedUser) {
          persistClientAuth(resolvedUser)
        } else {
          setCachedClientAuth(null)
        }

        if (!cancelled) {
          setHasFullAccess(FULL_LIBRARY_ROLES.includes(role))
          setHasRegisteredAccess(REGISTERED_LIBRARY_ROLES.includes(role))
        }
      } catch {
        const role = cachedUser?.role || ""
        if (!cancelled) {
          setHasFullAccess(FULL_LIBRARY_ROLES.includes(role))
          setHasRegisteredAccess(REGISTERED_LIBRARY_ROLES.includes(role))
        }
      } finally {
        if (!cancelled) {
          setAuthResolved(true)
        }
      }
    }

    void loadAccess()

    const handlePageShow = () => {
      void loadAccess()
    }

    window.addEventListener("pageshow", handlePageShow)

    games.forEach((game) => {
      if (game.available && (game.publicAccess || hasFullAccess || hasRegisteredAccess)) {
        router.prefetch(game.path)
      }
    })

    return () => {
      cancelled = true
      window.removeEventListener("pageshow", handlePageShow)
    }
  }, [hasFullAccess, hasRegisteredAccess, router])

  const handleGameNavigation = (path: string, gameId: string) => {
    if (loadingGameId || !authResolved) {
      return
    }

    const selectedGame = games.find((game) => game.id === gameId)

    if (selectedGame?.publicAccess) {
      setLoadingGameId(gameId)
      requestAnimationFrame(() => {
        router.push(path)
      })
      return
    }

    if (!hasFullAccess && !hasRegisteredAccess) {
      router.push("/register")
      return
    }

    setLoadingGameId(gameId)
    requestAnimationFrame(() => {
      router.push(path)
    })
  }

  if (!authResolved) {
    return (
      <div dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_48%,#ffffff_100%)]">
        <Header />
        <main className="flex min-h-[calc(100vh-220px)] items-center justify-center px-4">
          <SiteLoader size="lg" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_48%,#ffffff_100%)]">
      <Header />

      <main className="flex-1 px-4 py-12 md:py-16">
        <div className="container mx-auto max-w-6xl space-y-10">
          <div className="text-center">
            <h1 className="text-3xl font-black text-[#1f1147] md:text-5xl">اختر لعبتك الان!</h1>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game, index) => {
              const isLoading = loadingGameId === game.id
              const isUnlocked = authResolved && game.available && (game.publicAccess || hasFullAccess || hasRegisteredAccess)
              const cardTheme = {
                surfaceClass: game.surfaceClass,
                glowClass: game.glowClass,
                patternClass: game.patternClass,
              }

              return (
                <button
                  key={game.id}
                  type="button"
                  disabled={!game.available || !authResolved || (loadingGameId !== null && loadingGameId !== game.id)}
                  onClick={() => {
                    handleGameNavigation(game.path, game.id)
                  }}
                  className={`group relative flex w-full flex-col overflow-hidden rounded-[2rem] border text-right shadow-[0_24px_80px_rgba(15,23,42,0.06)] transition duration-300 ${cardTheme.surfaceClass} ${
                    isUnlocked && loadingGameId === null
                      ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,23,42,0.12)]"
                      : "cursor-pointer opacity-85"
                  }`}
                >
                  <div className={`absolute inset-0 transition-opacity duration-300 group-hover:opacity-100 ${cardTheme.patternClass}`} />
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 14% 18%, #7c3aed04 0%, transparent 40%), radial-gradient(circle at 86% 72%, #7c3aed04 0%, transparent 40%)`,
                    }}
                  />
                  <div className={`absolute -left-8 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-100 ${cardTheme.glowClass}`} />
                  
                  <div className="relative flex flex-col p-6 w-full h-full lg:p-8">
                    <div className="mb-6 flex items-center justify-center min-h-[220px]">
                      <GameArtwork game={game} index={index} />
                    </div>

                    <div className="flex flex-1 flex-col space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-[-0.02em] md:text-[1.75rem]">{game.title}</h2>
                        {!game.available ? (
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
                            style={{ backgroundColor: `${game.accent}18`, color: game.accent }}
                          >
                            قريبًا
                          </span>
                        ) : game.publicAccess ? (
                          <span className="inline-flex rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-[#6d28d9] backdrop-blur">
                            الدخول متاح
                          </span>
                        ) : !isUnlocked ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-[#7c3aed] backdrop-blur">
                            <Lock className="h-3.5 w-3.5" />
                            سجّل للعب
                          </span>
                        ) : null}
                      </div>

                      <p className="text-base leading-7 opacity-85">{game.description}</p>
                      
                      <div className="mt-auto pt-6">
                        {isUnlocked && isLoading ? (
                          <div
                            className="inline-flex items-center justify-center w-full gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-all"
                            style={{ backgroundColor: "#7c3aed" }}
                          >
                            <Loader2 className="h-5 w-5 animate-spin" />
                            جاري التحميل
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center justify-center w-full gap-3 rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-sm transition-all hover:bg-[#6d28d9]"
                            style={{ backgroundColor: "#7c3aed" }}
                          >
                            <span>
                              {!game.available ? "بانتظار الإطلاق" : isUnlocked ? "ادخل اللعبة" : "سجّل لفتح اللعبة"}
                            </span>
                            {game.available ? <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" /> : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="rounded-[2rem] border border-[#7c3aed]/10 bg-white px-6 py-6 text-center shadow-[0_20px_60px_rgba(124,58,237,0.06)] md:px-8">
            <p className="text-lg leading-8 text-[#5b5570] md:text-xl">
              {hasFullAccess
                ? "كل الألعاب مفتوحة لك الآن، اختر اللعبة التي تناسبك وابدأ مباشرة."
                : hasRegisteredAccess
                  ? "حسابك جاهز، كل الألعاب متاحة لك الآن."
                  : "أنشئ حسابك أولًا ثم ابدأ اللعب مباشرة."}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
