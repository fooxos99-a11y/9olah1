export type LeaderboardTheme = {
  primary: string
  secondary: string
  tertiary: string
}

const LOCKED_RANK_THEMES: LeaderboardTheme[] = [
  { primary: "#f4c542", secondary: "#d4a017", tertiary: "#9c6f00" },
  { primary: "#d9dee5", secondary: "#b8c2cc", tertiary: "#7d8896" },
  { primary: "#cd7f32", secondary: "#a85d1a", tertiary: "#7a3e0c" },
]

const DEFAULT_BEIGE_THEME: LeaderboardTheme = {
  primary: "#e8d7b4",
  secondary: "#d8c298",
  tertiary: "#b89b68",
}

export function isLockedLeaderboardRank(index: number) {
  return index >= 0 && index < 3
}

export function getLockedLeaderboardTheme(index: number) {
  return LOCKED_RANK_THEMES[index] ?? DEFAULT_BEIGE_THEME
}

export function getDefaultLeaderboardTheme() {
  return DEFAULT_BEIGE_THEME
}