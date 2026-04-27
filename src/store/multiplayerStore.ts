import { create } from 'zustand'
import { BoardState } from '@/models/types'
import { createEmptyBoard } from '@/logic/shipPlacement'

// Cell states as stored in Firestore maskedBoards by the Cloud Function
export type ServerCellState = 'UNKNOWN' | 'EMPTY' | 'HIT' | 'SUNK'
export type RoomStatus = 'WAITING' | 'PLACING' | 'BATTLE' | 'RESULTS'

interface MultiplayerState {
  roomId: string | null
  roomCode: string | null     // 6-char joinCode shown to players
  isHost: boolean
  myUid: string | null
  opponentUid: string | null
  opponentName: string | null
  myBoard: BoardState         // locally placed ships — used for defense grid display
  currentTurnUid: string | null
  roomStatus: RoomStatus | null
  winnerUid: string | null
  attackGrid: ServerCellState[]  // what I've fired at opponent (maskedBoards/{opponentUid}), flat 100-element
  defenseGrid: ServerCellState[]  // what opponent has fired at me (maskedBoards/{myUid}), flat 100-element
  sunkOpponentTypes: string[]       // cloud-function ship type strings ('CARRIER', etc.)
  error: string | null
}

interface MultiplayerActions {
  initRoom(params: {
    roomId: string
    roomCode: string
    isHost: boolean
    myUid: string
    opponentUid: string
    opponentName: string
  }): void
  setMyBoard(board: BoardState): void
  setRoomStatus(status: RoomStatus): void
  setCurrentTurnUid(uid: string | null): void
  setWinnerUid(uid: string | null): void
  setAttackGrid(cells: ServerCellState[]): void
  setDefenseGrid(cells: ServerCellState[]): void
  addSunkOpponentType(type: string): void
  clearBattleState(): void
  setError(msg: string | null): void
  resetMultiplayer(): void
}

export type MultiplayerStore = MultiplayerState & MultiplayerActions

const emptyGrid = (): ServerCellState[] =>
  Array<ServerCellState>(100).fill('UNKNOWN')

const initialState: MultiplayerState = {
  roomId: null,
  roomCode: null,
  isHost: false,
  myUid: null,
  opponentUid: null,
  opponentName: null,
  myBoard: createEmptyBoard(),
  currentTurnUid: null,
  roomStatus: null,
  winnerUid: null,
  attackGrid: emptyGrid(),
  defenseGrid: emptyGrid(),
  sunkOpponentTypes: [],
  error: null,
}

export const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  ...initialState,

  initRoom: (params) =>
    set({
      ...params,
      roomStatus: 'PLACING',
      currentTurnUid: null,
      winnerUid: null,
      attackGrid: emptyGrid(),
      defenseGrid: emptyGrid(),
      sunkOpponentTypes: [],
      myBoard: createEmptyBoard(),
      error: null,
    }),

  setMyBoard: (board) => set({ myBoard: board }),
  setRoomStatus: (status) => set({ roomStatus: status }),
  setCurrentTurnUid: (uid) => set({ currentTurnUid: uid }),
  setWinnerUid: (uid) => set({ winnerUid: uid }),
  setAttackGrid: (cells) => set({ attackGrid: cells }),
  setDefenseGrid: (cells) => set({ defenseGrid: cells }),
  addSunkOpponentType: (type) =>
    set((s) => ({
      sunkOpponentTypes: s.sunkOpponentTypes.includes(type)
        ? s.sunkOpponentTypes
        : [...s.sunkOpponentTypes, type],
    })),
  clearBattleState: () =>
    set({
      attackGrid: emptyGrid(),
      defenseGrid: emptyGrid(),
      sunkOpponentTypes: [],
      currentTurnUid: null,
      winnerUid: null,
      error: null,
    }),
  setError: (msg) => set({ error: msg }),
  resetMultiplayer: () => set(initialState),
}))
