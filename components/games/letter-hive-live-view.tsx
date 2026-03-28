"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

const SUBTLE_HEX_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='156' viewBox='0 0 180 156'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.46' stroke-width='1.8'%3E%3Cpolygon points='45,4 83,26 83,70 45,92 7,70 7,26'/%3E%3Cpolygon points='135,4 173,26 173,70 135,92 97,70 97,26'/%3E%3Cpolygon points='90,64 128,86 128,130 90,152 52,130 52,86'/%3E%3C/g%3E%3C/svg%3E\")"

type ClaimedCell = "team_a" | "team_b" | null

type LetterHiveLiveViewProps = {
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  roundTarget?: number
  boardLetters: string[]
  claimedCells: ClaimedCell[]
  currentPrompt: string | null
  currentAnswer: string | null
  showAnswer: boolean
  currentCellIndex: number | null
  error?: string
  onBuzz?: () => void
  buzzDisabled?: boolean
  buzzing?: boolean
  buzzButtonLabel?: string
  onCellSelect?: (index: number) => void
  selectedCellIndex?: number | null
  questionOverlay?: ReactNode
  suppressDefaultQuestionOverlay?: boolean
  sidePanel?: ReactNode
}

const QUESTION_REVEAL_MIN_MS = 1400
const QUESTION_REVEAL_MAX_MS = 5200
const QUESTION_REVEAL_MS_PER_CHAR = 85
export const QUESTION_SYNC_LEAD_MS = 900

type LetterHiveLiveBuzzTimerState = {
  phase: "owner" | "opponent" | null
  remainingMs: number
  activeSide: ClaimedCell
}

const TEAM_TIMER_STYLES = {
  team_a: {
    solid: "#df103a",
    subtle: "rgba(223,16,58,0.1)",
    border: "rgba(223,16,58,0.18)",
    text: "#df103a",
  },
  team_b: {
    solid: "#10dfb5",
    subtle: "rgba(16,223,181,0.14)",
    border: "rgba(16,223,181,0.2)",
    text: "#08755f",
  },
} as const

function splitIntoGraphemes(value: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("ar", { granularity: "grapheme" })

    return Array.from(segmenter.segment(value), (segment) => segment.segment)
  }

  return Array.from(value)
}

export function resolveQuestionStartTimeMs(updatedAt: string | null | undefined, serverTimeOffsetMs = 0) {
  if (!updatedAt) {
    return null
  }

  const serverUpdatedAtMs = Date.parse(updatedAt)
  if (!Number.isFinite(serverUpdatedAtMs)) {
    return null
  }

  return serverUpdatedAtMs + QUESTION_SYNC_LEAD_MS - serverTimeOffsetMs
}

export function useSynchronizedQuestionStart(isActive: boolean, updatedAt: string | null | undefined, serverTimeOffsetMs = 0) {
  const startAtMs = resolveQuestionStartTimeMs(updatedAt, serverTimeOffsetMs)
  const [refreshToken, setRefreshToken] = useState(0)

  const hasStarted = !isActive
    ? true
    : startAtMs !== null && Date.now() >= startAtMs

  useEffect(() => {
    if (!isActive) {
      return
    }

    if (startAtMs === null) {
      return
    }

    const remainingMs = Math.max(0, startAtMs - Date.now())
    if (remainingMs === 0) {
      setRefreshToken((previousToken) => previousToken + 1)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRefreshToken((previousToken) => previousToken + 1)
    }, remainingMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isActive, startAtMs])

  void refreshToken

  return {
    hasStarted,
    startAtMs,
  }
}

export function AnimatedQuestionText({ text, paused = false, ready = true }: { text: string; paused?: boolean; ready?: boolean }) {
  const graphemes = splitIntoGraphemes(text)
  const [visibleCount, setVisibleCount] = useState(0)
  const totalDuration = Math.min(
    QUESTION_REVEAL_MAX_MS,
    Math.max(QUESTION_REVEAL_MIN_MS, graphemes.length * QUESTION_REVEAL_MS_PER_CHAR),
  )
  const perCharDelay = graphemes.length > 0 ? totalDuration / graphemes.length : QUESTION_REVEAL_MIN_MS

  useEffect(() => {
    setVisibleCount(0)
  }, [text])

  useEffect(() => {
    if (!ready || paused || !graphemes.length || visibleCount >= graphemes.length) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleCount((previousCount) => Math.min(previousCount + 1, graphemes.length))
    }, perCharDelay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [graphemes.length, paused, perCharDelay, ready, visibleCount])

  const visibleText = graphemes.slice(0, visibleCount).join("")
  const isAnimating = visibleCount < graphemes.length

  return (
    <span style={{ display: "inline" }}>
      {visibleText}
      {isAnimating ? <span style={{ opacity: 0.35 }}> </span> : null}
    </span>
  )
}

function TeamScoreCard({ name, score, color, side, roundTarget }: { name: string; score: number; color: string; side: "left" | "right"; roundTarget?: number }) {
  return (
    <div
      style={{
        width: "156px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        padding: "28px 18px",
        background: "rgba(255, 255, 255, 0.94)",
        backdropFilter: "blur(10px)",
        borderRadius: side === "left" ? "42px 14px 14px 42px" : "14px 42px 42px 14px",
        border: `2px solid ${color}`,
        boxShadow: `0 14px 30px -8px ${color}33`,
        position: "relative",
        zIndex: 3,
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-15px",
          background: color,
          color: "white",
          padding: "4px 15px",
          borderRadius: "20px",
          fontSize: "0.9rem",
          fontWeight: "bold",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        {side === "left" ? "الفريق الثاني" : "الفريق الأول"}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#444", marginTop: "10px" }}>{name}</div>
      <div
        style={{
          fontSize: "4.5rem",
          fontWeight: 900,
          color,
          lineHeight: "1",
          textShadow: "2px 2px 0px rgba(0,0,0,0.05)",
        }}
      >
        {score}
      </div>
      <div style={{ fontSize: "0.9rem", color: "#888", fontWeight: "bold" }}>جولة</div>
      <div style={{ fontSize: "0.82rem", color: "#6b7280", fontWeight: 800 }}>الهدف {roundTarget || 3}</div>
    </div>
  )
}

export function LetterHiveLiveView({
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  roundTarget = 3,
  boardLetters,
  claimedCells,
  currentPrompt,
  currentAnswer,
  showAnswer,
  currentCellIndex,
  error,
  onBuzz,
  buzzDisabled,
  buzzing,
  buzzButtonLabel,
  onCellSelect,
  selectedCellIndex,
  questionOverlay,
  suppressDefaultQuestionOverlay = false,
  sidePanel,
}: LetterHiveLiveViewProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [boardScale, setBoardScale] = useState(1)
  const [boardOffset, setBoardOffset] = useState({ x: 0, y: 0 })
  const [isPanningBoard, setIsPanningBoard] = useState(false)
  const boardSelectionLocked = !onCellSelect || currentPrompt !== null || currentCellIndex !== null || selectedCellIndex !== null

  const boardViewportRef = useRef<HTMLDivElement | null>(null)
  const boardPanStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

  const handleBoardWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const zoomStep = event.deltaY < 0 ? 0.16 : -0.16

    setBoardScale((prevScale) => {
      const nextScale = Math.min(2.4, Math.max(1, Number((prevScale + zoomStep).toFixed(2))))

      if (nextScale === prevScale) {
        return prevScale
      }

      if (nextScale === 1) {
        setBoardOffset({ x: 0, y: 0 })
      }

      return nextScale
    })
  }

  const handleBoardMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 1 || boardScale <= 1) {
      return
    }

    event.preventDefault()
    boardPanStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: boardOffset.x,
      offsetY: boardOffset.y,
    }
    setIsPanningBoard(true)
  }

  useEffect(() => {
    if (!isPanningBoard) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const start = boardPanStartRef.current
      setBoardOffset({
        x: start.offsetX + (event.clientX - start.x),
        y: start.offsetY + (event.clientY - start.y),
      })
    }

    const handleMouseUp = () => {
      setIsPanningBoard(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isPanningBoard])

  const renderHexGrid = () => {
    return claimedCells.map((status, index) => {
      const row = Math.floor(index / 5)
      const col = index % 5
      const x = col * 100 + (row % 2 === 0 ? 0 : 50)
      const y = row * 87
      const isClaimed = status !== null
      const isActive = currentCellIndex === index && Boolean(currentPrompt)
      const isSelected = selectedCellIndex === index
      const fillColor = status === "team_a" ? "#df103a" : status === "team_b" ? "#10dfb5" : "#ffffff"
      const textColor = status === "team_a" ? "#ffffff" : status === "team_b" ? "#ffffff" : "#2c3e50"
      const borderColor = status === "team_a"
        ? "rgba(120, 14, 36, 0.95)"
        : status === "team_b"
          ? "rgba(5, 116, 94, 0.95)"
          : isSelected
            ? "rgba(245, 158, 11, 0.98)"
          : "rgba(77, 55, 125, 0.82)"
      const outerBorderColor = status === "team_a"
        ? "rgba(255, 205, 214, 0.42)"
        : status === "team_b"
          ? "rgba(209, 250, 229, 0.42)"
          : isActive
            ? "rgba(196, 181, 253, 0.7)"
            : isSelected
              ? "rgba(253, 230, 138, 0.95)"
            : "rgba(124, 58, 237, 0.18)"
      const shadowFill = status === "team_a" ? "rgba(223,16,58,0.22)" : status === "team_b" ? "rgba(16,223,181,0.22)" : "rgba(44,62,80,0.08)"
      const glossFill = status ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.92)"
      const canSelectCell = !isClaimed && !boardSelectionLocked

      return (
        <g
          key={index}
          transform={`translate(${x},${y})`}
          style={{ cursor: canSelectCell ? "pointer" : "default" }}
          onClick={() => {
            if (canSelectCell && onCellSelect) {
              onCellSelect(index)
            }
          }}
        >
          <polygon points="50,7 103,36 103,90 50,120 -3,90 -3,36" fill={shadowFill} />
          <polygon points="50,0 100,29 100,87 50,116 0,87 0,29" fill={fillColor} stroke={outerBorderColor} strokeWidth={isActive || isSelected ? 8 : 6} />
          <polygon points="50,0 100,29 100,87 50,116 0,87 0,29" fill={fillColor} stroke={borderColor} strokeWidth={isSelected ? 3.4 : 2.4} style={{ transition: "fill 0.3s ease" }} />
          {!isClaimed ? (
            <polygon points="50,10 89,33 89,79 50,102 11,79 11,33" fill={glossFill} style={{ mixBlendMode: "normal", pointerEvents: "none" }} />
          ) : null}
          {!isClaimed ? (
            <polygon points="50,16 80,33 80,42 50,59 20,42 20,33" fill="rgba(255,255,255,0.24)" style={{ pointerEvents: "none" }} />
          ) : null}
          <polygon
            points="50,5 95,31 95,85 50,111 5,85 5,31"
            fill="none"
            stroke={status ? "rgba(255,255,255,0.12)" : isActive ? "rgba(124,58,237,0.34)" : "rgba(124,58,237,0.14)"}
            strokeWidth={1.35}
          />
          {!isClaimed ? (
            <text
              x="50"
              y="58"
              style={{
                fontSize: 38,
                fontWeight: "bold",
                fill: textColor,
                pointerEvents: "none",
                dominantBaseline: "middle",
                textAnchor: "middle",
                fontFamily: "Arial",
              }}
            >
              {boardLetters[index] || ""}
            </text>
          ) : null}
        </g>
      )
    })
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fff9f3 0%, #fff2e8 32%, #f7fbfa 68%, #f7f7ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 20%, rgba(223,16,58,0.16) 0%, rgba(223,16,58,0.06) 18%, rgba(223,16,58,0) 42%), radial-gradient(circle at 82% 76%, rgba(16,223,181,0.18) 0%, rgba(16,223,181,0.06) 20%, rgba(16,223,181,0) 44%), radial-gradient(circle at 50% 50%, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0.02) 22%, rgba(124,58,237,0) 52%)" }} />
        <div style={{ position: "absolute", top: "-180px", right: "-90px", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(circle, rgba(223,16,58,0.22) 0%, rgba(223,16,58,0.08) 34%, rgba(223,16,58,0) 68%)", filter: "blur(8px)" }} />
        <div style={{ position: "absolute", bottom: "-210px", left: "-120px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,223,181,0.2) 0%, rgba(16,223,181,0.08) 36%, rgba(16,223,181,0) 70%)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", inset: "6% 5%", borderRadius: "48px", background: "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.26) 32%, rgba(255,255,255,0.12) 100%)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -1px 0 rgba(255,255,255,0.18)" }} />
        <div style={{ position: "absolute", inset: "9% 8%", borderRadius: "40px", background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 100%)", border: "1px solid rgba(255,255,255,0.22)" }} />
        <div style={{ position: "absolute", top: "11%", left: "7%", width: "230px", height: "230px", transform: "rotate(-10deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(223,16,58,0.12) 0%, rgba(223,16,58,0.02) 100%)", border: "1px solid rgba(223,16,58,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)" }} />
        <div style={{ position: "absolute", top: "9%", right: "10%", width: "170px", height: "170px", transform: "rotate(8deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(223,16,58,0.08) 0%, rgba(223,16,58,0.012) 100%)", border: "1px solid rgba(223,16,58,0.1)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", bottom: "12%", left: "9%", width: "185px", height: "185px", transform: "rotate(-8deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(16,223,181,0.09) 0%, rgba(16,223,181,0.014) 100%)", border: "1px solid rgba(16,223,181,0.1)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "8%", width: "270px", height: "270px", transform: "rotate(10deg)", clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: "linear-gradient(135deg, rgba(16,223,181,0.13) 0%, rgba(16,223,181,0.02) 100%)", border: "1px solid rgba(16,223,181,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: SUBTLE_HEX_PATTERN, backgroundSize: "180px 156px", backgroundPosition: "center center", maskImage: "radial-gradient(circle at center, black 38%, transparent 88%)", opacity: 0.72 }} />
      </div>

      <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={{ position: "absolute", top: "20px", right: "20px", zIndex: 50 }}>
        <div
          style={{
            width: "24px",
            height: "24px",
            background: "#ecfdf3",
            border: "2px solid #86efac",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#15803d",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease",
          }}
        >
          !
        </div>
        {isHovered ? (
          <div
            style={{
              position: "absolute",
              top: "30px",
              right: "0",
              whiteSpace: "nowrap",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(5px)",
              padding: "8px 15px",
              borderRadius: "12px",
              border: "1px solid #86efac",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
              fontSize: "0.85rem",
              color: "#555",
              fontWeight: "bold",
            }}
          >
            اضغط على زر <span style={{ color: "#15803d" }}>F11</span> لملء الشاشة
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 50, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626", borderRadius: "16px", padding: "10px 14px", fontSize: "0.9rem", fontWeight: 700 }}>
          {error}
        </div>
      ) : null}

      {sidePanel ? (
        <div style={{ position: "absolute", top: "24px", left: "24px", zIndex: 45, width: "min(420px, calc(100vw - 48px))", maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}>
          {sidePanel}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "980px" }}>
        <div style={{ flex: "1", position: "relative", display: "flex", justifyContent: "center", zIndex: 2 }}>
          <div
            ref={boardViewportRef}
            onWheel={handleBoardWheel}
            onMouseDown={handleBoardMouseDown}
            style={{
              width: "100%",
              maxWidth: "650px",
              filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.1))",
              position: "relative",
              overflow: "visible",
              userSelect: "none",
              cursor: boardScale > 1 ? (isPanningBoard ? "grabbing" : "grab") : "default",
            }}
          >
            <div
              style={{
                position: "relative",
                transform: `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${boardScale})`,
                transformOrigin: "center center",
                transition: isPanningBoard ? "none" : "transform 0.18s ease-out",
                willChange: "transform",
              }}
            >
              <div style={{ position: "absolute", left: "0", top: "50%", transform: "translate(-98%, -50%)", zIndex: 4 }}>
                <TeamScoreCard name={teamBName} score={teamBScore} color="#10dfb5" side="left" roundTarget={roundTarget} />
              </div>
              <div style={{ position: "absolute", right: "0", top: "50%", transform: "translate(98%, -50%)", zIndex: 4 }}>
                <TeamScoreCard name={teamAName} score={teamAScore} color="#df103a" side="right" roundTarget={roundTarget} />
              </div>
              <svg viewBox="-70 -70 690 605" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                <foreignObject x="-80" y="-80" width="710" height="624">
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "30px",
                      background: `
                        linear-gradient(125deg, rgba(255,255,255,0.18) 8%, rgba(255,255,255,0.05) 18%, rgba(255,255,255,0) 30%),
                        radial-gradient(circle at 50% 50%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0) 58%),
                        linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,0.07) 100%),
                        conic-gradient(from -45deg, #10dfb5 90deg, #df103a 90deg 180deg, #10dfb5 180deg 270deg, #df103a 270deg)
                      `,
                      boxShadow: "inset 0 0 0 5px rgba(0,0,0,0.05), inset 0 20px 40px rgba(255,255,255,0.1), inset 0 -24px 40px rgba(0,0,0,0.08)",
                    }}
                  />
                </foreignObject>
                <line x1="-50" y1="232" x2="600" y2="232" stroke="rgba(0,0,0,0.1)" strokeWidth="2" strokeDasharray="10,10" />
                {renderHexGrid()}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {questionOverlay ??
        (!suppressDefaultQuestionOverlay && currentPrompt ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 110 }}>
            <div style={{ background: "white", padding: "40px 30px", borderRadius: "25px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", minWidth: 320 }}>
              <h3 style={{ marginBottom: 24, fontSize: "1.3rem", color: "#2c3e50", lineHeight: 1.9 }}>
                <AnimatedQuestionText text={currentPrompt} />
              </h3>
              {showAnswer && currentAnswer ? (
                <div style={{ fontSize: "1.5rem", color: "#008a1e", marginBottom: 18, fontWeight: "bold" }}>{currentAnswer}</div>
              ) : null}
            </div>
          </div>
        ) : null)}

      {onBuzz ? (
        <div className="fixed bottom-6 right-6 z-[140]">
          <Button
            type="button"
            onClick={onBuzz}
            disabled={buzzDisabled}
            className="h-24 w-24 rounded-[2rem] bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] text-white shadow-[0_24px_55px_rgba(124,58,237,0.3)] hover:bg-[#6d28d9] disabled:opacity-50 md:h-28 md:w-28"
          >
            <span className="flex flex-col items-center gap-1">
              <Zap className="h-8 w-8" />
              <span className="text-base font-black md:text-lg">{buzzing ? "..." : buzzButtonLabel || "الزر"}</span>
            </span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function resolveSynchronizedTimestampMs(serverTimestamp: string | null | undefined, serverTimeOffsetMs = 0) {
  if (!serverTimestamp) {
    return null
  }

  const parsedTimestamp = Date.parse(serverTimestamp)
  if (!Number.isFinite(parsedTimestamp)) {
    return null
  }

  return parsedTimestamp - serverTimeOffsetMs
}

export function useLetterHiveLiveBuzzTimer(
  firstBuzzSide: ClaimedCell,
  firstBuzzedAt: string | null | undefined,
  ownerTimerMs: number,
  opponentTimerMs: number,
  serverTimeOffsetMs = 0,
): LetterHiveLiveBuzzTimerState {
  const [tick, setTick] = useState(0)
  const firstBuzzAtMs = resolveSynchronizedTimestampMs(firstBuzzedAt, serverTimeOffsetMs)

  useEffect(() => {
    if (!firstBuzzSide || firstBuzzAtMs === null) {
      return
    }

    const finalPhaseEndsAtMs = firstBuzzAtMs + ownerTimerMs + opponentTimerMs
    if (Date.now() >= finalPhaseEndsAtMs) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTick((previousValue) => previousValue + 1)
    }, 150)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [firstBuzzAtMs, firstBuzzSide, opponentTimerMs, ownerTimerMs])

  void tick

  if (!firstBuzzSide || firstBuzzAtMs === null) {
    return {
      phase: null,
      remainingMs: 0,
      activeSide: null,
    }
  }

  const ownerPhaseEndsAtMs = firstBuzzAtMs + ownerTimerMs
  const opponentPhaseEndsAtMs = ownerPhaseEndsAtMs + opponentTimerMs
  const nowMs = Date.now()

  if (nowMs < ownerPhaseEndsAtMs) {
    return {
      phase: "owner",
      remainingMs: ownerPhaseEndsAtMs - nowMs,
      activeSide: firstBuzzSide,
    }
  }

  if (nowMs < opponentPhaseEndsAtMs) {
    return {
      phase: "opponent",
      remainingMs: opponentPhaseEndsAtMs - nowMs,
      activeSide: firstBuzzSide === "team_a" ? "team_b" : "team_a",
    }
  }

  return {
    phase: null,
    remainingMs: 0,
    activeSide: null,
  }
}

export function LetterHiveLiveBuzzTimerCard({
  firstBuzzSide,
  firstBuzzedAt,
  teamAName,
  teamBName,
  buzzOwnerTimerSeconds,
  buzzOpponentTimerSeconds,
  serverTimeOffsetMs = 0,
}: {
  firstBuzzSide: ClaimedCell
  firstBuzzedAt: string | null | undefined
  teamAName: string
  teamBName: string
  buzzOwnerTimerSeconds: number
  buzzOpponentTimerSeconds: number
  serverTimeOffsetMs?: number
}) {
  const ownerTimerMs = buzzOwnerTimerSeconds * 1000
  const opponentTimerMs = buzzOpponentTimerSeconds * 1000
  const timerState = useLetterHiveLiveBuzzTimer(firstBuzzSide, firstBuzzedAt, ownerTimerMs, opponentTimerMs, serverTimeOffsetMs)

  if (!timerState.phase || !timerState.activeSide) {
    return null
  }

  const timerStyle = TEAM_TIMER_STYLES[timerState.activeSide]
  const activeTeamName = timerState.activeSide === "team_a" ? teamAName : teamBName
  const phaseLabel = timerState.phase === "owner" ? "وقت الفريق الضاغط" : "وقت الفريق الآخر"
  const wholeSeconds = Math.max(0, Math.ceil(timerState.remainingMs / 1000))
  const totalPhaseMs = timerState.phase === "owner" ? ownerTimerMs : opponentTimerMs
  const progress = Math.max(0, Math.min(100, (timerState.remainingMs / totalPhaseMs) * 100))

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        padding: "14px 18px",
        borderRadius: "22px",
        textAlign: "center",
        boxShadow: "0 18px 36px rgba(0,0,0,0.18)",
        minWidth: 240,
        maxWidth: 340,
        width: "100%",
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: timerStyle.subtle, border: `1px solid ${timerStyle.border}`, padding: "6px 12px", color: timerStyle.text, fontSize: "0.82rem", fontWeight: 900 }}>
        {phaseLabel}
      </div>
      <div
        style={{
          marginTop: "10px",
          borderRadius: "999px",
          background: timerStyle.subtle,
          border: `1px solid ${timerStyle.border}`,
          padding: "8px 18px",
          color: timerStyle.text,
          fontSize: "0.98rem",
          fontWeight: 900,
          lineHeight: 1.2,
        }}
      >
        {activeTeamName}
      </div>
      <div style={{ marginTop: "12px", fontSize: "2rem", lineHeight: 1, fontWeight: 900, color: timerStyle.solid, fontVariantNumeric: "tabular-nums" }}>
        {wholeSeconds}
      </div>
      <div style={{ marginTop: "10px", height: "8px", borderRadius: "999px", background: "rgba(148,163,184,0.18)", overflow: "hidden" }}>
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: timerStyle.solid,
            borderRadius: "999px",
            transition: "width 120ms linear",
          }}
        />
      </div>
    </div>
  )
}