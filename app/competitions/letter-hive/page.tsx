"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CircleAlert, Globe2, MonitorPlay } from "lucide-react"
import { GameEntryShell } from "@/components/games/game-entry-shell"
import { LetterHiveOnlineEntry } from "@/components/games/letter-hive-online-entry"
import { LetterHiveLocalEntry } from "@/app/competitions/letter-hive/teams"

const LETTER_HIVE_BG_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='156' viewBox='0 0 180 156'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.46' stroke-width='1.8'%3E%3Cpolygon points='45,4 83,26 83,70 45,92 7,70 7,26'/%3E%3Cpolygon points='135,4 173,26 173,70 135,92 97,70 97,26'/%3E%3Cpolygon points='90,64 128,86 128,130 90,152 52,130 52,86'/%3E%3C/g%3E%3C/svg%3E\")"

export default function LetterHiveModePage() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<"local" | "online" | null>(null)
  const [playersPerTeam, setPlayersPerTeam] = useState(1)
  const [teamNames, setTeamNames] = useState(["", ""])

  const handleLocalTeamChange = (index: number, value: string) => {
    setTeamNames((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)))
  }

  const handleLocalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    router.push(`/competitions/letter-hive/game?team1=${encodeURIComponent(teamNames[0])}&team2=${encodeURIComponent(teamNames[1])}`)
  }

  return (
    <GameEntryShell
      title="خلية الحروف"
      headerAction={
        <div className="group relative">
          <div className="text-[#b45309] drop-shadow-[0_8px_18px_rgba(245,158,11,0.18)]">
            <CircleAlert className="h-7 w-7" />
          </div>
          <div className="pointer-events-none absolute right-0 top-[calc(100%+10px)] min-w-[260px] rounded-[1.2rem] border border-[#fde68a] bg-[linear-gradient(135deg,rgba(255,251,235,0.98)_0%,rgba(255,247,214,0.94)_100%)] px-4 py-3 text-right text-sm font-black leading-7 text-[#92400e] opacity-0 shadow-[0_18px_36px_rgba(245,158,11,0.14)] transition duration-150 group-hover:opacity-100">
            يفضل اللعب بحساب واحد لعدم تكرار الأسئلة
          </div>
        </div>
      }
      containerClassName="max-w-5xl"
      className="bg-[linear-gradient(180deg,#fff9f3_0%,#fff2e8_32%,#f7fbfa_68%,#f7f7ff_100%)]"
      backgroundDecor={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(223,16,58,0.16)_0%,rgba(223,16,58,0.06)_18%,rgba(223,16,58,0)_42%),radial-gradient(circle_at_82%_76%,rgba(16,223,181,0.18)_0%,rgba(16,223,181,0.06)_20%,rgba(16,223,181,0)_44%),radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.05)_0%,rgba(124,58,237,0.02)_22%,rgba(124,58,237,0)_52%)]" />
          <div className="absolute -right-[90px] -top-[180px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(223,16,58,0.22)_0%,rgba(223,16,58,0.08)_34%,rgba(223,16,58,0)_68%)] blur-[8px]" />
          <div className="absolute -bottom-[210px] -left-[120px] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(16,223,181,0.2)_0%,rgba(16,223,181,0.08)_36%,rgba(16,223,181,0)_70%)] blur-[10px]" />
          <div className="absolute inset-[6%_5%] rounded-[48px] border border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.26)_32%,rgba(255,255,255,0.12)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-1px_0_rgba(255,255,255,0.18)]" />
          <div className="absolute inset-[9%_8%] rounded-[40px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_100%)]" />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: LETTER_HIVE_BG_PATTERN,
              backgroundSize: "180px 156px",
              backgroundPosition: "center center",
              maskImage: "radial-gradient(circle at center, black 38%, transparent 88%)",
            }}
          />
        </>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => setSelectedMode((current) => (current === "local" ? null : "local"))}
            className={`flex h-24 flex-1 items-center justify-center gap-4 rounded-[1.9rem] border px-6 text-2xl font-black shadow-[0_22px_52px_rgba(124,58,237,0.12)] transition ${selectedMode === "local" ? "border-[#5b21b6] bg-[linear-gradient(135deg,#a78bfa_0%,#7c3aed_58%,#5b21b6_100%)] text-white ring-4 ring-[#c4b5fd]/45" : "border-[#d9cdf8] bg-[linear-gradient(135deg,rgba(245,243,255,0.98)_0%,rgba(237,233,254,0.92)_100%)] text-[#5b21b6] hover:border-[#8b5cf6]"}`}
          >
            <MonitorPlay className="h-5 w-5" />
            محلي
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode((current) => (current === "online" ? null : "online"))}
            className={`flex h-24 flex-1 items-center justify-center gap-4 rounded-[1.9rem] border px-6 text-2xl font-black shadow-[0_22px_52px_rgba(15,118,110,0.12)] transition ${selectedMode === "online" ? "border-[#0f766e] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white ring-4 ring-[#99f6e4]/40" : "border-[#bdeee7] bg-[linear-gradient(135deg,rgba(240,253,250,0.98)_0%,rgba(204,251,241,0.9)_100%)] text-[#0f766e] hover:border-[#14b8a6]"}`}
          >
            <Globe2 className="h-5 w-5" />
            عبر الإنترنت
          </button>
        </div>

        {selectedMode === "local" ? (
          <div className="mt-2 w-full rounded-[2.1rem] border border-[#ddd0ff] bg-white/88 p-7 text-right shadow-[0_22px_52px_rgba(124,58,237,0.12)]">
            <p className="text-lg font-black text-[#5b21b6]">أدخل أسماء الفرق</p>
            <div className="mt-6">
              <LetterHiveLocalEntry teamNames={teamNames} onChange={handleLocalTeamChange} onSubmit={handleLocalSubmit} embedded />
            </div>
          </div>
        ) : null}

        {selectedMode === "online" ? (
          <div className="mt-2 w-full rounded-[2.1rem] border border-[#c9f7ef] bg-white/86 p-7 text-right shadow-[0_22px_52px_rgba(15,118,110,0.1)]">
            <p className="text-lg font-black text-[#0f766e]">عدد اللاعبين في كل فريق</p>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[1, 2, 3].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPlayersPerTeam(option)}
                  className={`h-16 rounded-2xl border text-xl font-black transition ${playersPerTeam === option ? "border-[#0f766e] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white" : "border-[#d7efeb] bg-[#f8fffd] text-[#0f766e] hover:border-[#14b8a6]"}`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <LetterHiveOnlineEntry routeBase="/competitions/letter-hive/online" initialPlayersPerTeam={playersPerTeam} embedded />
            </div>
          </div>
        ) : null}
      </div>
    </GameEntryShell>
  )
}