export const LETTER_HIVE_LIVE_BASE_LETTERS = [
  "ص", "ح", "خ", "م", "د", "ز", "ع", "و", "هـ", "ط",
  "ج", "ض", "ل", "ك", "ي", "س", "أ", "ت", "ش", "ق",
  "ر", "ن", "غ", "ف", "ب",
]

export type LetterHiveLiveTeamSide = "team_a" | "team_b"
export type LetterHiveLiveRole = "presenter" | LetterHiveLiveTeamSide | "player"
export type LetterHiveLiveStatus = "waiting" | "live" | "finished"
export const DEFAULT_LETTER_HIVE_LIVE_ROUND_TARGET = 3
export const MIN_LETTER_HIVE_LIVE_ROUND_TARGET = 1
export const MAX_LETTER_HIVE_LIVE_ROUND_TARGET = 9
export const DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM = 2
export const MIN_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM = 1
export const MAX_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM = 3
export const DEFAULT_LETTER_HIVE_LIVE_BUZZ_OWNER_TIMER_SECONDS = 5
export const DEFAULT_LETTER_HIVE_LIVE_BUZZ_OPPONENT_TIMER_SECONDS = 30
export const MIN_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS = 1
export const MAX_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS = 90
export const LETTER_HIVE_LIVE_PLAYER_SLOT_COUNT = MAX_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM * 2

export type LetterHiveLivePlayerSlot = {
  slot: number
  name: string | null
  color: LetterHiveLiveTeamSide | null
}

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

export function resolveLetterHiveLivePlayerSlot(value: unknown) {
  const parsedSlot = Number(value)

  if (!Number.isFinite(parsedSlot)) {
    return null
  }

  const normalizedSlot = Math.trunc(parsedSlot)

  if (normalizedSlot < 1 || normalizedSlot > LETTER_HIVE_LIVE_PLAYER_SLOT_COUNT) {
    return null
  }

  return normalizedSlot
}

export function resolveLetterHiveLivePlayersPerTeam(value: unknown) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return null
  }

  return Math.max(
    MIN_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM,
    Math.min(MAX_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM, Math.trunc(parsedValue)),
  )
}

export function resolveConfiguredLetterHiveLivePlayersPerTeam(metadata: unknown) {
  const normalizedMetadata = normalizeMatchMetadata(metadata)

  return resolveLetterHiveLivePlayersPerTeam(normalizedMetadata.playersPerTeam)
    ?? DEFAULT_LETTER_HIVE_LIVE_PLAYERS_PER_TEAM
}

export function getLetterHiveLiveActivePlayerSlotCount(metadata: unknown) {
  return resolveConfiguredLetterHiveLivePlayersPerTeam(metadata) * 2
}

export function isLetterHiveLivePlayerSlotActive(metadata: unknown, slot: number) {
  return slot >= 1 && slot <= getLetterHiveLiveActivePlayerSlotCount(metadata)
}

export function normalizeLetterHiveLivePlayerSlots(metadata: unknown) {
  const normalizedMetadata = normalizeMatchMetadata(metadata)
  const rawSlots = normalizedMetadata.playerSlots
  const playerSlots: LetterHiveLivePlayerSlot[] = []

  for (let slot = 1; slot <= LETTER_HIVE_LIVE_PLAYER_SLOT_COUNT; slot += 1) {
    const rawValue = rawSlots && typeof rawSlots === "object" && !Array.isArray(rawSlots)
      ? (rawSlots as Record<string, unknown>)[String(slot)]
      : null

    const playerName = rawValue && typeof rawValue === "object"
      ? sanitizeTeamName((rawValue as Record<string, unknown>).name)
      : ""
    const playerColor = rawValue && typeof rawValue === "object"
      ? (rawValue as Record<string, unknown>).color
      : null

    playerSlots.push({
      slot,
      name: playerName || null,
      color: playerColor === "team_a" || playerColor === "team_b" ? playerColor : null,
    })
  }

  return playerSlots
}

export function buildLetterHiveLivePlayerSlotsMetadata(playerSlots: LetterHiveLivePlayerSlot[]) {
  return playerSlots.reduce<Record<string, { name: string; color: LetterHiveLiveTeamSide }>>((accumulator, playerSlot) => {
    if (!playerSlot.name || !playerSlot.color) {
      return accumulator
    }

    accumulator[String(playerSlot.slot)] = {
      name: playerSlot.name,
      color: playerSlot.color,
    }

    return accumulator
  }, {})
}

export function groupLetterHiveLivePlayerNamesByColor(playerSlots: LetterHiveLivePlayerSlot[]) {
  const teamAPlayers = playerSlots.filter((playerSlot) => playerSlot.color === "team_a" && playerSlot.name).map((playerSlot) => playerSlot.name as string)
  const teamBPlayers = playerSlots.filter((playerSlot) => playerSlot.color === "team_b" && playerSlot.name).map((playerSlot) => playerSlot.name as string)

  return {
    teamAName: teamAPlayers.length > 0 ? teamAPlayers.join(" + ") : null,
    teamBName: teamBPlayers.length > 0 ? teamBPlayers.join(" + ") : null,
  }
}

export function buildMatchLinks(origin: string, match: Pick<LetterHiveLiveMatchRow, "presenter_token" | "team_a_token" | "team_b_token" | "metadata">) {
  const activePlayerSlotCount = getLetterHiveLiveActivePlayerSlotCount(match.metadata)

  return {
    presenter: `${origin}/competitions/letter-hive-live/presenter/${match.presenter_token}`,
    teamA: `${origin}/competitions/letter-hive-live/team/${match.team_a_token}`,
    teamB: `${origin}/competitions/letter-hive-live/team/${match.team_b_token}`,
    players: Array.from({ length: activePlayerSlotCount }, (_, index) => {
      const slot = index + 1

      return {
        slot,
        href: `${origin}/competitions/letter-hive-live/team/${match.presenter_token}?slot=${slot}`,
      }
    }),
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

export function normalizeMatchMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

export function resolveLetterHiveLiveRoundTarget(metadata: unknown) {
  const normalizedMetadata = normalizeMatchMetadata(metadata)
  const parsedTarget = Number(normalizedMetadata.roundTarget)

  if (!Number.isFinite(parsedTarget)) {
    return DEFAULT_LETTER_HIVE_LIVE_ROUND_TARGET
  }

  return Math.max(
    MIN_LETTER_HIVE_LIVE_ROUND_TARGET,
    Math.min(MAX_LETTER_HIVE_LIVE_ROUND_TARGET, Math.trunc(parsedTarget)),
  )
}

function resolveLetterHiveLiveTimerSeconds(rawValue: unknown, fallbackSeconds: number) {
  const parsedSeconds = Number(rawValue)

  if (!Number.isFinite(parsedSeconds)) {
    return fallbackSeconds
  }

  return Math.max(
    MIN_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS,
    Math.min(MAX_LETTER_HIVE_LIVE_BUZZ_TIMER_SECONDS, Math.trunc(parsedSeconds)),
  )
}

export function resolveLetterHiveLiveBuzzOwnerTimerSeconds(metadata: unknown) {
  const normalizedMetadata = normalizeMatchMetadata(metadata)

  return resolveLetterHiveLiveTimerSeconds(
    normalizedMetadata.buzzOwnerTimerSeconds,
    DEFAULT_LETTER_HIVE_LIVE_BUZZ_OWNER_TIMER_SECONDS,
  )
}

export function resolveLetterHiveLiveBuzzOpponentTimerSeconds(metadata: unknown) {
  const normalizedMetadata = normalizeMatchMetadata(metadata)

  return resolveLetterHiveLiveTimerSeconds(
    normalizedMetadata.buzzOpponentTimerSeconds,
    DEFAULT_LETTER_HIVE_LIVE_BUZZ_OPPONENT_TIMER_SECONDS,
  )
}

function getClaimedCellNeighbors(index: number) {
  const row = Math.floor(index / 5)
  const col = index % 5
  const deltas = row % 2 === 0
    ? [[-1, 0], [-1, -1], [0, -1], [0, 1], [1, 0], [1, -1]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]

  return deltas
    .map(([rowDelta, colDelta]) => ({ row: row + rowDelta, col: col + colDelta }))
    .filter(({ row: nextRow, col: nextCol }) => nextRow >= 0 && nextRow < 5 && nextCol >= 0 && nextCol < 5)
    .map(({ row: nextRow, col: nextCol }) => nextRow * 5 + nextCol)
}

export function hasCompletedLetterHiveLiveRound(claimedCells: Array<null | "team_a" | "team_b">, side: LetterHiveLiveTeamSide) {
  const normalizedClaims = normalizeClaimedCells(claimedCells)
  const startIndexes = side === "team_a"
    ? [0, 5, 10, 15, 20]
    : [0, 1, 2, 3, 4]

  const targetIndexes = new Set(side === "team_a"
    ? [4, 9, 14, 19, 24]
    : [20, 21, 22, 23, 24])

  const queue = startIndexes.filter((index) => normalizedClaims[index] === side)
  const visited = new Set(queue)

  while (queue.length > 0) {
    const currentIndex = queue.shift()

    if (currentIndex === undefined) {
      continue
    }

    if (targetIndexes.has(currentIndex)) {
      return true
    }

    for (const neighborIndex of getClaimedCellNeighbors(currentIndex)) {
      if (visited.has(neighborIndex) || normalizedClaims[neighborIndex] !== side) {
        continue
      }

      visited.add(neighborIndex)
      queue.push(neighborIndex)
    }
  }

  return false
}

export function sanitizeMatchForClient(match: LetterHiveLiveMatchRow, role: LetterHiveLiveRole, origin: string, playerSlot?: number | null) {
  const normalizedMetadata = normalizeMatchMetadata(match.metadata)
  const playersPerTeam = resolveConfiguredLetterHiveLivePlayersPerTeam(match.metadata)
  const roundTarget = resolveLetterHiveLiveRoundTarget(match.metadata)
  const buzzOwnerTimerSeconds = resolveLetterHiveLiveBuzzOwnerTimerSeconds(match.metadata)
  const buzzOpponentTimerSeconds = resolveLetterHiveLiveBuzzOpponentTimerSeconds(match.metadata)
  const playerSlots = normalizeLetterHiveLivePlayerSlots(match.metadata)
  const groupedPlayerNames = groupLetterHiveLivePlayerNamesByColor(playerSlots)
  const base = {
    id: match.id,
    title: match.title,
    role,
    status: match.status,
    isOpen: match.is_open,
    buzzEnabled: match.buzz_enabled,
    firstBuzzSide: match.first_buzz_side,
    firstBuzzedAt: match.first_buzzed_at,
    firstBuzzPlayerName: sanitizeTeamName(normalizedMetadata.firstBuzzPlayerName) || null,
    currentPrompt: match.current_prompt,
    currentAnswer: role === "presenter" || match.show_answer ? match.current_answer : null,
    currentLetter: match.current_letter,
    currentCellIndex: match.current_cell_index,
    showAnswer: match.show_answer,
    teamAName: groupedPlayerNames.teamAName || match.team_a_name,
    teamBName: groupedPlayerNames.teamBName || match.team_b_name,
    teamAScore: match.team_a_score,
    teamBScore: match.team_b_score,
    playersPerTeam,
    roundTarget,
    buzzOwnerTimerSeconds,
    buzzOpponentTimerSeconds,
    playerSlot: playerSlot ?? null,
    playerSlots,
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