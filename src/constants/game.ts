export enum GamePhase {
  SETUP = 'SETUP',
  PLACEMENT = 'PLACEMENT',
  BATTLE = 'BATTLE',
  RESULTS = 'RESULTS',
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum CellState {
  EMPTY = 'EMPTY',
  SHIP = 'SHIP',
  HIT = 'HIT',
  MISS = 'MISS',
  SUNK = 'SUNK',
}

export enum Orientation {
  HORIZONTAL = 'H',
  VERTICAL = 'V',
}

export const SCHEMA_VERSION = 1
