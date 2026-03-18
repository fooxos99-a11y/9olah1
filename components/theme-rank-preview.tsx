type ThemeRankPreviewProps = {
  primary: string
  secondary: string
  tertiary: string
  premium?: boolean
  circleAlign?: "start" | "end"
}

export function ThemeRankPreview({
  primary,
  secondary,
  tertiary,
  premium = false,
  circleAlign = "start",
}: ThemeRankPreviewProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[22px] border-2"
      style={{
        backgroundColor: premium ? "rgba(250, 248, 245, 0.98)" : "rgba(255, 255, 255, 0.95)",
        borderColor: primary,
        borderWidth: premium ? "3px" : "2px",
        backgroundImage: premium
          ? `linear-gradient(90deg, ${primary}08 1px, transparent 1px), linear-gradient(${primary}08 1px, transparent 1px), radial-gradient(circle at 10% 20%, ${primary}05 0%, transparent 50%)`
          : `radial-gradient(circle at 20% 80%, ${primary}08 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${secondary}06 0%, transparent 50%)`,
        backgroundSize: premium ? "20px 20px, 20px 20px, 100% 100%" : undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-1.5"
        style={{
          backgroundImage: premium
            ? `linear-gradient(to right, ${primary}, ${secondary}, ${primary})`
            : `linear-gradient(to right, ${primary}, ${secondary})`,
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-6 top-4 h-20 w-20 rounded-full blur-3xl" style={{ backgroundColor: `${primary}22` }} />
        <div className="absolute -left-8 bottom-0 h-16 w-16 rounded-full blur-3xl" style={{ backgroundColor: `${secondary}18` }} />
      </div>

      <div className="relative z-10 p-3">
        <div className={`flex w-full items-center ${circleAlign === "end" ? "justify-end" : "justify-start"}`}>
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)]"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${secondary}, ${primary})`,
              borderColor: `${tertiary}66`,
            }}
          >
            <div className="absolute inset-[3px] rounded-full border border-white/25" />
            <div className="absolute h-1.5 w-1.5 rounded-full bg-white/30 top-2 right-2" />
          </div>
        </div>
      </div>
    </div>
  )
}