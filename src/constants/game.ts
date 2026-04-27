export enum GamePhase {
  SETUP = 'SETUP',
  LOBBY = 'LOBBY',
  PLACEMENT = 'PLACEMENT',
  BATTLE = 'BATTLE',
  RESULTS = 'RESULTS',
  MULTI_PLACEMENT = 'MULTI_PLACEMENT',
  MULTI_BATTLE = 'MULTI_BATTLE',
  MULTI_RESULTS = 'MULTI_RESULTS',
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
