import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

type FinishAction = {
  label: string
  onClick: () => void
  icon?: ReactNode
  tone?: "primary" | "danger" | "outline"
}

type GameFinishOverlayProps = {
  title: ReactNode
  subtitle?: ReactNode
  details?: ReactNode
  actions?: FinishAction[]
  celebration?: boolean
  maxWidthClassName?: string
}

const CONFETTI_ITEMS = [
  { className: "left-[12%] top-[18%] h-3 w-16 rotate-[28deg] bg-[#facc15]/80", delay: "0s", duration: "3.4s" },
  { className: "left-[18%] top-[32%] h-3 w-10 rotate-[62deg] bg-[#7c3aed]/75", delay: ".4s", duration: "2.8s" },
  { className: "left-[28%] top-[12%] h-3 w-12 rotate-[112deg] bg-[#a78bfa]/80", delay: ".8s", duration: "3.1s" },
  { className: "left-[36%] top-[16%] h-3 w-8 rotate-[18deg] bg-[#fde68a]/80", delay: ".2s", duration: "2.7s" },
  { className: "left-[42%] top-[26%] h-3 w-14 rotate-[126deg] bg-[#8b5cf6]/75", delay: "1s", duration: "3.7s" },
  { className: "right-[16%] top-[14%] h-3 w-12 rotate-[18deg] bg-[#a78bfa]/75", delay: ".3s", duration: "3.2s" },
  { className: "right-[12%] top-[28%] h-3 w-9 rotate-[72deg] bg-[#f59e0b]/75", delay: ".7s", duration: "2.9s" },
  { className: "right-[26%] top-[22%] h-3 w-14 rotate-[140deg] bg-[#8b5cf6]/75", delay: ".5s", duration: "3.6s" },
  { className: "right-[34%] top-[18%] h-3 w-10 rotate-[36deg] bg-[#facc15]/75", delay: ".6s", duration: "2.6s" },
  { className: "right-[42%] top-[30%] h-3 w-12 rotate-[98deg] bg-[#c4b5fd]/80", delay: ".9s", duration: "3.1s" },
  { className: "left-[10%] bottom-[22%] h-3 w-12 rotate-[34deg] bg-[#8b5cf6]/75", delay: ".35s", duration: "3.5s" },
  { className: "left-[22%] bottom-[14%] h-3 w-9 rotate-[128deg] bg-[#fde68a]/80", delay: ".75s", duration: "2.8s" },
  { className: "left-[30%] bottom-[20%] h-3 w-14 rotate-[64deg] bg-[#f59e0b]/75", delay: ".45s", duration: "3.3s" },
  { className: "left-[40%] bottom-[10%] h-3 w-10 rotate-[142deg] bg-[#a78bfa]/80", delay: "1.1s", duration: "3s" },
  { className: "right-[24%] bottom-[20%] h-3 w-14 rotate-[120deg] bg-[#fde68a]/80", delay: ".65s", duration: "3.4s" },
  { className: "right-[10%] bottom-[12%] h-3 w-10 rotate-[52deg] bg-[#7c3aed]/75", delay: ".95s", duration: "2.7s" },
  { className: "right-[18%] bottom-[30%] h-3 w-8 rotate-[24deg] bg-[#facc15]/75", delay: ".25s", duration: "3.2s" },
  { className: "right-[36%] bottom-[16%] h-3 w-12 rotate-[116deg] bg-[#8b5cf6]/75", delay: ".85s", duration: "3.6s" },
  { className: "left-[16%] top-[48%] h-2.5 w-8 rotate-[16deg] bg-white/80", delay: "0s", duration: "2.3s", sparkle: true },
  { className: "left-[26%] top-[58%] h-2.5 w-6 rotate-[72deg] bg-white/75", delay: ".5s", duration: "2s", sparkle: true },
  { className: "right-[20%] top-[52%] h-2.5 w-8 rotate-[44deg] bg-white/80", delay: ".3s", duration: "2.4s", sparkle: true },
  { className: "right-[30%] top-[62%] h-2.5 w-6 rotate-[118deg] bg-white/75", delay: ".8s", duration: "2.1s", sparkle: true },
]

function actionClassName(tone: FinishAction["tone"] = "primary") {
  if (tone === "danger") {
    return "bg-gradient-to-r from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800"
  }

  if (tone === "outline") {
    return "border border-[#d9d2f6] bg-white text-[#5b21b6] hover:bg-[#faf7ff]"
  }

  return "bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] text-white hover:bg-[linear-gradient(135deg,#6d28d9_0%,#5b21b6_100%)]"
}

export function GameFinishOverlay({
  title,
  subtitle,
  details,
  actions = [],
  celebration = true,
  maxWidthClassName = "max-w-2xl",
}: GameFinishOverlayProps) {
  const actionLayoutClassName =
    actions.length === 2 ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"

  return (
    <>
      <div className="fixed inset-0 z-[80] overflow-hidden bg-black/30 backdrop-blur-[6px]">
        <div className="pointer-events-none absolute inset-0 opacity-95">
          <div
            className="absolute -right-16 top-10 h-44 w-44 rounded-full bg-[#c4b5fd]/28 blur-3xl"
            style={{ animation: "victoryBlobDrift 7.2s ease-in-out infinite alternate" }}
          />
          <div
            className="absolute -left-12 bottom-12 h-40 w-40 rounded-full bg-[#ddd6fe]/30 blur-3xl"
            style={{ animation: "victoryBlobDrift 8.1s ease-in-out infinite alternate-reverse" }}
          />
          {celebration
            ? CONFETTI_ITEMS.map((item) => (
                <div
                  key={`${item.className}-${item.delay}`}
                  className={`absolute rounded-full ${item.className}`}
                  style={{
                    animation: `${item.sparkle ? "victorySparkle" : "victoryConfettiFloat"} ${item.duration} ease-in-out ${item.delay} infinite alternate`,
                  }}
                />
              ))
            : null}
        </div>

        <div className="relative flex h-full items-center justify-center px-4">
          <div className={`relative w-full overflow-hidden rounded-2xl border border-[#7c3aed]/15 bg-white p-6 text-center shadow-2xl sm:p-12 ${maxWidthClassName}`}>
            <div className="relative flex flex-col items-center">
              <div className="text-3xl font-black text-[#7c3aed] sm:text-4xl">{title}</div>
              {subtitle ? <div className="mt-3 text-lg font-bold text-[#4c4570] sm:text-xl">{subtitle}</div> : null}
              {details ? <div className="mt-5 w-full">{details}</div> : null}
              {actions.length > 0 ? (
                <div className={`mt-8 grid w-full gap-3 ${actionLayoutClassName}`}>
                  {actions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={action.onClick}
                      variant={action.tone === "outline" ? "outline" : undefined}
                      className={`w-full min-w-0 justify-center whitespace-normal break-words px-4 py-5 text-base sm:text-lg ${actionClassName(action.tone)}`}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes victoryBlobDrift {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(20px, -16px, 0) scale(1.08); }
        }

        @keyframes victoryConfettiFloat {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          100% { transform: translate3d(0, -14px, 0) rotate(14deg); }
        }

        @keyframes victorySparkle {
          0% { transform: scale(0.92) translate3d(0, 0, 0); opacity: 0.45; }
          100% { transform: scale(1.12) translate3d(0, -6px, 0); opacity: 1; }
        }
      `}</style>
    </>
  )
}