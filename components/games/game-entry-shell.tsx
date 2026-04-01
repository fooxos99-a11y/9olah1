import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type GameEntryShellProps = {
  title: string
  subtitle?: string
  badge?: string
  headerAction?: ReactNode
  children: ReactNode
  className?: string
  containerClassName?: string
  backgroundDecor?: ReactNode
}

export function GameEntryShell({ title, subtitle, badge, headerAction, children, className, containerClassName, backgroundDecor }: GameEntryShellProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_45%,#ffffff_100%)] px-4 py-8 md:px-6 md:py-10", className)} dir="rtl">
      {backgroundDecor ? <div className="pointer-events-none absolute inset-0">{backgroundDecor}</div> : null}
      <div className={cn("mx-auto max-w-6xl", containerClassName)}>
        <div className="relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/58 p-6 shadow-[0_24px_80px_rgba(124,58,237,0.06)] backdrop-blur-md md:p-8">
          <div className="absolute left-0 top-0 h-36 w-36 rounded-full bg-[#ddd6fe]/38 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[#c4b5fd]/22 blur-3xl" />
          {headerAction ? <div className="absolute right-6 top-6 z-20 md:right-8 md:top-8">{headerAction}</div> : null}
          <div className="relative space-y-3 text-center">
            {badge ? (
              <div className="inline-flex items-center rounded-full border border-white/55 bg-white/44 px-4 py-2 text-sm font-semibold text-[#6d28d9] backdrop-blur-sm">
                {badge}
              </div>
            ) : null}
            <h1 className="text-3xl font-black text-[#1f1147] md:text-5xl">{title}</h1>
            {subtitle ? <p className="mx-auto max-w-2xl text-base leading-8 text-[#5b5570] md:text-lg">{subtitle}</p> : null}
          </div>

          <div className="relative mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

type GameEntryPanelProps = {
  children: ReactNode
  className?: string
}

export function GameEntryPanel({ children, className }: GameEntryPanelProps) {
  return (
    <div className={cn("rounded-[1.75rem] border border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.56)_0%,rgba(252,251,255,0.42)_100%)] p-5 shadow-[0_20px_60px_rgba(124,58,237,0.05)] backdrop-blur-md md:p-8", className)}>
      {children}
    </div>
  )
}

type GameFieldProps = {
  label: ReactNode
  children: ReactNode
  hint?: string
}

export function GameField({ label, children, hint }: GameFieldProps) {
  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-bold text-[#1f1147] md:text-base">{label}</label>
      {children}
      {hint ? <p className="text-xs font-medium text-[#7b7492] md:text-sm">{hint}</p> : null}
    </div>
  )
}