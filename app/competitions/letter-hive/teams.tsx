"use client"

import type { FormEvent } from "react"
import { ArrowLeft } from "lucide-react"

type LetterHiveLocalEntryProps = {
	teamNames: string[]
	onChange: (index: number, value: string) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	embedded?: boolean
}

export function LetterHiveLocalEntry({ teamNames, onChange, onSubmit, embedded = false }: LetterHiveLocalEntryProps) {
	return (
		<form onSubmit={onSubmit} className={embedded ? "space-y-5" : "space-y-5 md:px-2"}>
			<div className="space-y-4">
				<div className="space-y-3">
					<div className="text-sm font-bold text-[#1f1147] md:text-base">اسم الفريق الأول</div>
					<input
						type="text"
						value={teamNames[0]}
						onChange={(event) => onChange(0, event.target.value)}
						required
						placeholder="اكتب اسم الفريق الأول"
						className="h-14 w-full rounded-2xl border border-[#cfc2ff] bg-white/82 px-4 text-right text-[#3f2a76] placeholder:text-[#8f7fb1] outline-none transition focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10"
					/>
				</div>

				<div className="space-y-3">
					<div className="text-sm font-bold text-[#1f1147] md:text-base">اسم الفريق الثاني</div>
					<input
						type="text"
						value={teamNames[1]}
						onChange={(event) => onChange(1, event.target.value)}
						required
						placeholder="اكتب اسم الفريق الثاني"
						className="h-14 w-full rounded-2xl border border-[#cfc2ff] bg-white/82 px-4 text-right text-[#3f2a76] placeholder:text-[#8f7fb1] outline-none transition focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10"
					/>
				</div>
			</div>

			<button
				type="submit"
				className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#8b5cf6_0%,#6d28d9_100%)] px-6 text-lg font-black text-white transition hover:opacity-95"
			>
				ابدأ اللعبة
				<ArrowLeft className="h-5 w-5" />
			</button>
		</form>
	)
}
