import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInAnonymously, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, onSnapshot, type Firestore } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, httpsCallable, type Functions } from 'firebase/functions'

export const PROJECT = 'navyfury-6cf7a'
const FIREBASE_CONFIG = { apiKey: 'test-api-key', projectId: PROJECT }

export type Player = {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  fns: Functions
}

export async function createPlayer(name: 'player-a' | 'player-b'): Promise<Player> {
  const existing = getApps().find((a) => a.name === name)
  if (existing) await deleteApp(existing)
  const app = initializeApp(FIREBASE_CONFIG, name)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const fns = getFunctions(app, 'us-central1')
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(fns, '127.0.0.1', 5001)
  return { app, auth, db, fns }
}

export async function signIn(auth: Auth): Promise<string> {
  const { user } = await signInAnonymously(auth)
  return user.uid
}

export async function clearFirestore(): Promise<void> {
  const url = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`
  const res = await fetch(url, { method: 'DELETE' })
  // 200 = cleared, 404 = already empty — both acceptable
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore clear failed: HTTP ${res.status}`)
  }
}

export function call<Req = unknown, Res = unknown>(fns: Functions, name: string) {
  return httpsCallable<Req, Res>(fns, name)
}

/**
 * Subscribes to a Firestore document and resolves when the given field satisfies the predicate.
 * Rejects after timeoutMs if the condition is never met.
 */
export async function waitForDocField<T>(
  db: Firestore,
  docPath: string,
  field: string,
  predicate: (value: T) => boolean,
  timeoutMs = 15_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub()
      reject(new Error(`Timeout after ${timeoutMs}ms: "${docPath}".${field} never satisfied predicate`))
    }, timeoutMs)

    const unsub = onSnapshot(
      doc(db, docPath),
      (snap) => {
        if (!snap.exists()) return
        const val = snap.data()?.[field] as T
        if (predicate(val)) {
          clearTimeout(timer)
          unsub()
          resolve(val)
        }
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

// Fleet A occupies rows 0–4, cols 0–(size-1)
export const VALID_FLEET_A = [
  { type: 'CARRIER',     row: 0, col: 0, orientation: 'HORIZONTAL' },
  { type: 'CRUISER',     row: 1, col: 0, orientation: 'HORIZONTAL' },
  { type: 'DESTROYER_A', row: 2, col: 0, orientation: 'HORIZONTAL' },
  { type: 'DESTROYER_B', row: 3, col: 0, orientation: 'HORIZONTAL' },
  { type: 'PATROL_BOAT', row: 4, col: 0, orientation: 'HORIZONTAL' },
]

// Fleet B occupies rows 5–9, cols 0–(size-1)
export const VALID_FLEET_B = [
  { type: 'CARRIER',     row: 5, col: 0, orientation: 'HORIZONTAL' },
  { type: 'CRUISER',     row: 6, col: 0, orientation: 'HORIZONTAL' },
  { type: 'DESTROYER_A', row: 7, col: 0, orientation: 'HORIZONTAL' },
  { type: 'DESTROYER_B', row: 8, col: 0, orientation: 'HORIZONTAL' },
  { type: 'PATROL_BOAT', row: 9, col: 0, orientation: 'HORIZONTAL' },
]

// All 17 cells belonging to Fleet B (for win-condition tests where A fires all of them)
export const FLEET_B_CELLS: { row: number; col: number }[] = [
  ...Array.from({ length: 5 }, (_, c) => ({ row: 5, col: c })), // CARRIER
  ...Array.from({ length: 4 }, (_, c) => ({ row: 6, col: c })), // CRUISER
  ...Array.from({ length: 3 }, (_, c) => ({ row: 7, col: c })), // DESTROYER_A
  ...Array.from({ length: 3 }, (_, c) => ({ row: 8, col: c })), // DESTROYER_B
  ...Array.from({ length: 2 }, (_, c) => ({ row: 9, col: c })), // PATROL_BOAT
]

// 19 water cells on A's board (rows 0–4 occupied in cols 0–4 max)
// Safe for B to fire at — never hits A's ships
export const A_WATER_CELLS: { row: number; col: number }[] = [
  { row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 }, { row: 0, col: 8 }, { row: 0, col: 9 },
  { row: 1, col: 4 }, { row: 1, col: 5 }, { row: 1, col: 6 }, { row: 1, col: 7 }, { row: 1, col: 8 }, { row: 1, col: 9 },
  { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 2, col: 7 },
  { row: 3, col: 3 }, { row: 3, col: 4 }, { row: 3, col: 5 },
]
