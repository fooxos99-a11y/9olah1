export const LETTER_HIVE_LIVE_BASE_LETTERS = [
  "ص", "ح", "خ", "م", "د", "ز", "ع", "و", "هـ", "ط",
  "ج", "ض", "ل", "ك", "ي", "س", "أ", "ت", "ش", "ق",
  "ر", "ن", "غ", "ف", "ب",
]

export type LetterHiveLiveRole = "presenter" | "team_a" | "team_b"
export type LetterHiveLiveStatus = "waiting" | "live" | "finished"

export type LetterHiveLiveMatchRow = {
  id: string
  title: string
  created_by_user_id: string | null
  created_by_name: string | null
  presenter_token: string
  team_a_token: string
  team_b_token: string
  team_a_name: string | null
  team_b_name: string | null
  status: LetterHiveLiveStatus
  is_open: boolean
  buzz_enabled: boolean
  first_buzz_side: "team_a" | "team_b" | null
  first_buzzed_at: string | null
  current_prompt: string | null
  current_answer: string | null
  current_letter: string | null
  current_cell_index: number | null
  show_answer: boolean
  team_a_score: number
  team_b_score: number
  board_letters: string[]
  claimed_cells: Array<null | "team_a" | "team_b">
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function shuffleLetters(letters: string[]) {
  const shuffled = [...letters]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled
}

export function sanitizeTeamName(input: unknown) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80)
}

export function resolveMatchRole(match: Pick<LetterHiveLiveMatchRow, "presenter_token" | "team_a_token" | "team_b_token">, token: string): LetterHiveLiveRole | null {
  if (token === match.presenter_token) {
    return "presenter"
  }

  if (token === match.team_a_token) {
    return "team_a"
  }

  if (token === match.team_b_token) {
    return "team_b"
  }

  return null
}

export function buildMatchLinks(origin: string, match: Pick<LetterHiveLiveMatchRow, "presenter_token" | "team_a_token" | "team_b_token">) {
  return {
    presenter: `${origin}/competitions/letter-hive-live/presenter/${match.presenter_token}`,
    teamA: `${origin}/competitions/letter-hive-live/team/${match.team_a_token}`,
    teamB: `${origin}/competitions/letter-hive-live/team/${match.team_b_token}`,
  }
}

export function normalizeBoardLetters(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "")) : []
}

export function normalizeClaimedCells(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<null | "team_a" | "team_b">
  }

  return value.map((item) => (item === "team_a" || item === "team_b" ? item : null))
}

export function sanitizeMatchForClient(match: LetterHiveLiveMatchRow, role: LetterHiveLiveRole, origin: string) {
  const base = {
    id: match.id,
    title: match.title,
    role,
    status: match.status,
    isOpen: match.is_open,
    buzzEnabled: match.buzz_enabled,
    firstBuzzSide: match.first_buzz_side,
    firstBuzzedAt: match.first_buzzed_at,
    currentPrompt: match.current_prompt,
    currentAnswer: role === "presenter" || match.show_answer ? match.current_answer : null,
    currentLetter: match.current_letter,
    currentCellIndex: match.current_cell_index,
    showAnswer: match.show_answer,
    teamAName: match.team_a_name,
    teamBName: match.team_b_name,
    teamAScore: match.team_a_score,
    teamBScore: match.team_b_score,
    boardLetters: normalizeBoardLetters(match.board_letters),
    claimedCells: normalizeClaimedCells(match.claimed_cells),
    createdAt: match.created_at,
    updatedAt: match.updated_at,
  }

  if (role === "presenter") {
    return {
      ...base,
      links: buildMatchLinks(origin, match),
    }
  }

  return base
}