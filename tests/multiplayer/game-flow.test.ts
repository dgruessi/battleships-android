import { describe, test, expect, beforeEach, afterAll } from 'vitest'
import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { getDoc, doc } from 'firebase/firestore'
import {
  createPlayer,
  signIn,
  clearFirestore,
  call,
  waitForDocField,
  VALID_FLEET_A,
  VALID_FLEET_B,
  FLEET_B_CELLS,
  A_WATER_CELLS,
  PROJECT,
  type Player,
} from './helpers'

let pA: Player
let pB: Player
let uidA: string
let uidB: string

beforeEach(async () => {
  await clearFirestore()
  pA = await createPlayer('player-a')
  pB = await createPlayer('player-b')
  uidA = await signIn(pA.auth)
  uidB = await signIn(pB.auth)
})

afterAll(async () => {
  for (const app of getApps()) await deleteApp(app)
})

// ── Shared helpers ────────────────────────────────────────────────────────────

async function doCreateRoom(displayName = 'Alice'): Promise<{ roomId: string; joinCode: string }> {
  const fn = call<{ displayName: string }, { roomId: string; joinCode: string }>(pA.fns, 'createRoom')
  const { data } = await fn({ displayName })
  return data
}

async function doJoinRoom(joinCode: string, displayName = 'Bob'): Promise<string> {
  const fn = call<{ joinCode: string; displayName: string }, { roomId: string }>(pB.fns, 'joinRoom')
  const { data } = await fn({ joinCode, displayName })
  return data.roomId
}

async function submitBoth(roomId: string) {
  const submitA = call<{ roomId: string; ships: unknown[] }, { success: boolean }>(pA.fns, 'submitPlacement')
  const submitB = call<{ roomId: string; ships: unknown[] }, { success: boolean }>(pB.fns, 'submitPlacement')
  await submitA({ roomId, ships: VALID_FLEET_A })
  await submitB({ roomId, ships: VALID_FLEET_B })
  await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'BATTLE')
}

async function reachBattle(): Promise<{ roomId: string; joinCode: string }> {
  const { roomId, joinCode } = await doCreateRoom()
  await doJoinRoom(joinCode)
  await submitBoth(roomId)
  return { roomId, joinCode }
}

async function reachResults(): Promise<string> {
  const { roomId } = await reachBattle()
  const fireA = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pA.fns, 'fireShot')
  const fireB = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pB.fns, 'fireShot')

  let waterIdx = 0
  for (const cell of FLEET_B_CELLS) {
    await fireA({ roomId, row: cell.row, col: cell.col })
    const snap = await getDoc(doc(pA.db, 'rooms', roomId))
    if (snap.data()?.status === 'RESULTS') break
    // Between A's shots, B fires at water on A's board (never hits A's ships)
    const w = A_WATER_CELLS[waterIdx++]
    await fireB({ roomId, row: w.row, col: w.col })
  }

  await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'RESULTS')
  return roomId
}

// ── createRoom ────────────────────────────────────────────────────────────────

describe('createRoom', () => {
  test('returns roomId and 6-char joinCode', async () => {
    const { roomId, joinCode } = await doCreateRoom()
    expect(roomId).toBeTruthy()
    expect(joinCode).toMatch(/^[A-Z2-9]{6}$/)
  })

  test('room document exists in Firestore with status WAITING', async () => {
    const { roomId } = await doCreateRoom()
    const snap = await getDoc(doc(pA.db, 'rooms', roomId))
    expect(snap.exists()).toBe(true)
    expect(snap.data()?.status).toBe('WAITING')
    expect(snap.data()?.hostUid).toBe(uidA)
    expect(snap.data()?.guestUid).toBeNull()
  })

  test('displayName required — rejects empty string', async () => {
    const fn = call<{ displayName: string }, unknown>(pA.fns, 'createRoom')
    await expect(fn({ displayName: '' })).rejects.toMatchObject({ code: 'functions/invalid-argument' })
  })

  test('rejects unauthenticated call', async () => {
    const app = initializeApp({ apiKey: 'test', projectId: PROJECT }, 'no-auth-test')
    const fns = getFunctions(app, 'us-central1')
    connectFunctionsEmulator(fns, '127.0.0.1', 5001)
    try {
      const fn = httpsCallable(fns, 'createRoom')
      await expect(fn({ displayName: 'Ghost' })).rejects.toMatchObject({ code: 'functions/unauthenticated' })
    } finally {
      await deleteApp(app)
    }
  })
})

// ── joinRoom ──────────────────────────────────────────────────────────────────

describe('joinRoom', () => {
  test('guest joins by joinCode → room status becomes PLACING', async () => {
    const { roomId, joinCode } = await doCreateRoom()
    await doJoinRoom(joinCode)
    await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'PLACING')
    const snap = await getDoc(doc(pA.db, 'rooms', roomId))
    expect(snap.data()?.guestUid).toBe(uidB)
  })

  test('both players appear in /players subcollection', async () => {
    const { roomId, joinCode } = await doCreateRoom('Alice')
    await doJoinRoom(joinCode, 'Bob')
    await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'PLACING')
    const docA = await getDoc(doc(pA.db, 'rooms', roomId, 'players', uidA))
    const docB = await getDoc(doc(pB.db, 'rooms', roomId, 'players', uidB))
    expect(docA.data()?.displayName).toBe('Alice')
    expect(docB.data()?.displayName).toBe('Bob')
  })

  test('cannot join own room', async () => {
    const { joinCode } = await doCreateRoom()
    const fn = call<{ joinCode: string; displayName: string }, unknown>(pA.fns, 'joinRoom')
    await expect(fn({ joinCode, displayName: 'Alice2' })).rejects.toMatchObject({
      code: 'functions/failed-precondition',
    })
  })

  test('cannot join with invalid joinCode', async () => {
    const fn = call<{ joinCode: string; displayName: string }, unknown>(pB.fns, 'joinRoom')
    await expect(fn({ joinCode: 'XXXXXX', displayName: 'Bob' })).rejects.toMatchObject({
      code: 'functions/not-found',
    })
  })

  test('cannot join a room already in PLACING', async () => {
    const { joinCode } = await doCreateRoom()
    await doJoinRoom(joinCode) // first join → PLACING
    // Try to join again — query filters for status=WAITING, finds nothing
    const fn = call<{ joinCode: string; displayName: string }, unknown>(pB.fns, 'joinRoom')
    await expect(fn({ joinCode, displayName: 'Bob2' })).rejects.toMatchObject({
      code: 'functions/not-found',
    })
  })
})

// ── submitPlacement ───────────────────────────────────────────────────────────

describe('submitPlacement', () => {
  test('first player submits → status stays PLACING, player marked ready', async () => {
    const { roomId, joinCode } = await doCreateRoom()
    await doJoinRoom(joinCode)
    await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'PLACING')

    const submitA = call<{ roomId: string; ships: unknown[] }, { success: boolean }>(pA.fns, 'submitPlacement')
    await submitA({ roomId, ships: VALID_FLEET_A })

    const [roomSnap, playerASnap] = await Promise.all([
      getDoc(doc(pA.db, 'rooms', roomId)),
      getDoc(doc(pA.db, 'rooms', roomId, 'players', uidA)),
    ])
    expect(roomSnap.data()?.status).toBe('PLACING')
    expect(playerASnap.data()?.ready).toBe(true)
  })

  test('both players submit → status becomes BATTLE, host fires first', async () => {
    const { roomId } = await reachBattle()
    const snap = await getDoc(doc(pA.db, 'rooms', roomId))
    expect(snap.data()?.status).toBe('BATTLE')
    expect(snap.data()?.currentTurnUid).toBe(uidA) // host (A) goes first
  })

  test('both maskedBoards initialised with 10×10 UNKNOWN cells', async () => {
    const { roomId } = await reachBattle()
    const [boardA, boardB] = await Promise.all([
      getDoc(doc(pA.db, 'rooms', roomId, 'maskedBoards', uidA)),
      getDoc(doc(pA.db, 'rooms', roomId, 'maskedBoards', uidB)),
    ])
    for (const board of [boardA, boardB]) {
      expect(board.exists()).toBe(true)
      const cells = board.data()!.cells as string[]
      expect(cells.length).toBe(100)
      expect(cells.every((c) => c === 'UNKNOWN')).toBe(true)
    }
  })

  test('invalid fleet (wrong count) rejected', async () => {
    const { roomId, joinCode } = await doCreateRoom()
    await doJoinRoom(joinCode)
    await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'PLACING')
    const fn = call<{ roomId: string; ships: unknown[] }, unknown>(pA.fns, 'submitPlacement')
    await expect(fn({ roomId, ships: VALID_FLEET_A.slice(0, 4) })).rejects.toMatchObject({
      code: 'functions/invalid-argument',
    })
  })

  test('cannot submit when game is in BATTLE', async () => {
    const { roomId } = await reachBattle()
    const fn = call<{ roomId: string; ships: unknown[] }, unknown>(pA.fns, 'submitPlacement')
    await expect(fn({ roomId, ships: VALID_FLEET_A })).rejects.toMatchObject({
      code: 'functions/failed-precondition',
    })
  })
})

// ── fireShot ──────────────────────────────────────────────────────────────────

describe('fireShot', () => {
  test('shot on water → MISS, cell updated in maskedBoard', async () => {
    const { roomId } = await reachBattle()
    // B's ships are in rows 5–9; row 0 col 0 is water on B's board
    const fn = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pA.fns, 'fireShot')
    await fn({ roomId, row: 0, col: 0 })

    const boardSnap = await getDoc(doc(pA.db, 'rooms', roomId, 'maskedBoards', uidB))
    expect(boardSnap.data()!.cells[0]).toBe('EMPTY')
  })

  test('shot on CARRIER → HIT, cell updated', async () => {
    const { roomId } = await reachBattle()
    // B's CARRIER is at row 5, cols 0–4
    const fn = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pA.fns, 'fireShot')
    await fn({ roomId, row: 5, col: 0 })

    const boardSnap = await getDoc(doc(pA.db, 'rooms', roomId, 'maskedBoards', uidB))
    expect(boardSnap.data()!.cells[50]).toBe('HIT')
  })

  test('sinking PATROL_BOAT → all cells become SUNK', async () => {
    const { roomId } = await reachBattle()
    const fireA = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pA.fns, 'fireShot')
    const fireB = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pB.fns, 'fireShot')
    // B's PATROL_BOAT at row 9, cols 0–1
    await fireA({ roomId, row: 9, col: 0 }) // A fires → HIT, turn → B
    await fireB({ roomId, row: 0, col: 5 }) // B fires water → MISS, turn → A
    await fireA({ roomId, row: 9, col: 1 }) // A fires → SUNK

    const boardSnap = await getDoc(doc(pA.db, 'rooms', roomId, 'maskedBoards', uidB))
    expect(boardSnap.data()!.cells[90]).toBe('SUNK')
    expect(boardSnap.data()!.cells[91]).toBe('SUNK')
  })

  test('turn advances to opponent after shot', async () => {
    const { roomId } = await reachBattle()
    const fn = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pA.fns, 'fireShot')
    await fn({ roomId, row: 0, col: 0 })

    await waitForDocField(pA.db, `rooms/${roomId}`, 'currentTurnUid', (uid: string) => uid === uidB)
    const snap = await getDoc(doc(pA.db, 'rooms', roomId))
    expect(snap.data()?.currentTurnUid).toBe(uidB)
  })

  test('game ends with correct winner when all ships sunk', async () => {
    const roomId = await reachResults()
    const snap = await getDoc(doc(pA.db, 'rooms', roomId))
    expect(snap.data()?.status).toBe('RESULTS')
    expect(snap.data()?.winnerUid).toBe(uidA) // A sank all of B's ships
  })

  test('cannot fire out of turn', async () => {
    const { roomId } = await reachBattle()
    // It's A's (host's) turn — B fires immediately → should fail
    const fn = call<{ roomId: string; row: number; col: number }, unknown>(pB.fns, 'fireShot')
    await expect(fn({ roomId, row: 0, col: 0 })).rejects.toMatchObject({
      code: 'functions/failed-precondition',
    })
  })

  test('cannot fire same cell twice', async () => {
    const { roomId } = await reachBattle()
    const fireA = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pA.fns, 'fireShot')
    const fireB = call<{ roomId: string; row: number; col: number }, { success: boolean }>(pB.fns, 'fireShot')
    await fireA({ roomId, row: 0, col: 0 }) // MISS → turn to B
    await fireB({ roomId, row: 0, col: 5 }) // B fires water → turn to A
    const fnA = call<{ roomId: string; row: number; col: number }, unknown>(pA.fns, 'fireShot')
    await expect(fnA({ roomId, row: 0, col: 0 })).rejects.toMatchObject({
      code: 'functions/failed-precondition',
    })
  })
})

// ── startRematch ──────────────────────────────────────────────────────────────

describe('startRematch', () => {
  test('status returns to PLACING and ready flags reset', async () => {
    const roomId = await reachResults()
    const fn = call<{ roomId: string }, { success: boolean }>(pA.fns, 'startRematch')
    await fn({ roomId })

    await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'PLACING')
    const [playerA, playerB] = await Promise.all([
      getDoc(doc(pA.db, 'rooms', roomId, 'players', uidA)),
      getDoc(doc(pB.db, 'rooms', roomId, 'players', uidB)),
    ])
    expect(playerA.data()?.ready).toBe(false)
    expect(playerB.data()?.ready).toBe(false)
  })

  test('maskedBoards are deleted after rematch', async () => {
    const roomId = await reachResults()
    const fn = call<{ roomId: string }, { success: boolean }>(pA.fns, 'startRematch')
    await fn({ roomId })
    await waitForDocField(pA.db, `rooms/${roomId}`, 'status', (s: string) => s === 'PLACING')

    const [boardA, boardB] = await Promise.all([
      getDoc(doc(pA.db, 'rooms', roomId, 'maskedBoards', uidA)),
      getDoc(doc(pA.db, 'rooms', roomId, 'maskedBoards', uidB)),
    ])
    expect(boardA.exists()).toBe(false)
    expect(boardB.exists()).toBe(false)
  })

  test('cannot rematch from BATTLE status', async () => {
    const { roomId } = await reachBattle()
    const fn = call<{ roomId: string }, unknown>(pA.fns, 'startRematch')
    await expect(fn({ roomId })).rejects.toMatchObject({ code: 'functions/failed-precondition' })
  })
})
