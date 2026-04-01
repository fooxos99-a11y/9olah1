"use client"

import { useState } from "react"
import { GameEntryShell } from "@/components/games/game-entry-shell"
import { LetterHiveLocalEntry } from "@/app/competitions/letter-hive/teams"

const LETTER_HIVE_BG_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='156' viewBox='0 0 180 156'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.46' stroke-width='1.8'%3E%3Cpolygon points='45,4 83,26 83,70 45,92 7,70 7,26'/%3E%3Cpolygon points='135,4 173,26 173,70 135,92 97,70 97,26'/%3E%3Cpolygon points='90,64 128,86 128,130 90,152 52,130 52,86'/%3E%3C/g%3E%3C/svg%3E\")"

export default function LetterHiveTeams() {
  const [teamNames, setTeamNames] = useState(["", ""])

  const handleChange = (index: number, value: string) => {
    const newNames = [...teamNames]
    newNames[index] = value
    setTeamNames(newNames)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `/competitions/letter-hive/game?team1=${encodeURIComponent(teamNames[0])}&team2=${encodeURIComponent(teamNames[1])}`
  }

  return (
    <GameEntryShell
      title="خلية الحروف"
      containerClassName="max-w-3xl"
      className="bg-[linear-gradient(180deg,#fff9f3_0%,#fff2e8_32%,#f7fbfa_68%,#f7f7ff_100%)]"
      backgroundDecor={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(223,16,58,0.16)_0%,rgba(223,16,58,0.06)_18%,rgba(223,16,58,0)_42%),radial-gradient(circle_at_82%_76%,rgba(16,223,181,0.18)_0%,rgba(16,223,181,0.06)_20%,rgba(16,223,181,0)_44%),radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.05)_0%,rgba(124,58,237,0.02)_22%,rgba(124,58,237,0)_52%)]" />
          <div className="absolute -right-[90px] -top-[180px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(223,16,58,0.22)_0%,rgba(223,16,58,0.08)_34%,rgba(223,16,58,0)_68%)] blur-[8px]" />
          <div className="absolute -bottom-[210px] -left-[120px] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(16,223,181,0.2)_0%,rgba(16,223,181,0.08)_36%,rgba(16,223,181,0)_70%)] blur-[10px]" />
          <div className="absolute inset-[6%_5%] rounded-[48px] border border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.26)_32%,rgba(255,255,255,0.12)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-1px_0_rgba(255,255,255,0.18)]" />
          <div className="absolute inset-[9%_8%] rounded-[40px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_100%)]" />
          <div className="absolute left-[7%] top-[11%] h-[230px] w-[230px] rotate-[-10deg] border border-[rgba(223,16,58,0.12)] bg-[linear-gradient(135deg,rgba(223,16,58,0.12)_0%,rgba(223,16,58,0.02)_100%)] [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]" />
          <div className="absolute right-[10%] top-[9%] h-[170px] w-[170px] rotate-[8deg] border border-[rgba(223,16,58,0.1)] bg-[linear-gradient(135deg,rgba(223,16,58,0.08)_0%,rgba(223,16,58,0.012)_100%)] [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" />
          <div className="absolute bottom-[12%] left-[9%] h-[185px] w-[185px] rotate-[-8deg] border border-[rgba(16,223,181,0.1)] bg-[linear-gradient(135deg,rgba(16,223,181,0.09)_0%,rgba(16,223,181,0.014)_100%)] [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" />
          <div className="absolute bottom-[10%] right-[8%] h-[270px] w-[270px] rotate-[10deg] border border-[rgba(16,223,181,0.12)] bg-[linear-gradient(135deg,rgba(16,223,181,0.13)_0%,rgba(16,223,181,0.02)_100%)] [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]" />
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
      <LetterHiveLocalEntry teamNames={teamNames} onChange={handleChange} onSubmit={handleSubmit} />
    </GameEntryShell>
  )
}
