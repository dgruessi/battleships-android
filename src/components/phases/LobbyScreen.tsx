import { useState, useEffect, useRef } from 'react'
import {
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, auth, functions, isFirebaseAvailable } from '@/firebase'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore } from '@/store/multiplayerStore'
import { soundManager } from '@/audio/soundManager'
import Button from '@/components/ui/Button'
import './LobbyScreen.css'

type View = 'menu' | 'creating-type' | 'creating' | 'joining' | 'browsing'
type Status = 'idle' | 'waiting' | 'connected' | 'error'
type Visibility = 'public' | 'private'

interface RoomEntry {
  id: string         // Firestore doc ID (for subscription cleanup)
  joinCode: string   // 6-char code used to join
  hostName: string
  hostUid: string
  createdAt: Timestamp | null
}

function timeAgo(ts: Timestamp | null): string {
  if (!ts) return ''
  const secs = Math.floor(Date.now() / 1000 - ts.seconds)
  if (secs < 60) return 'gerade eben'
  if (secs < 3600) return `${Math.floor(secs / 60)} Min.`
  return `${Math.floor(secs / 3600)} Std.`
}

export default function LobbyScreen() {
  const returnToSetup = useGameStore((s) => s.returnToSetup)
  const startMultiPlacement = useGameStore((s) => s.startMultiPlacement)
  const playerName = useGameStore((s) => s.playerName)
  const initRoom = useMultiplayerStore((s) => s.initRoom)
  const resetMultiplayer = useMultiplayerStore((s) => s.resetMultiplayer)

  const [view, setView] = useState<View>('menu')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [roomCode, setRoomCode] = useState('')  // joinCode for display/sharing
  const [inputCode, setInputCode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [rooms, setRooms] = useState<RoomEntry[]>([])

  const unsubRef = useRef<Unsubscribe | null>(null)
  // Stores the Firestore document ID of the room this user created, for cleanup.
  const ownedRoomIdRef = useRef<string | null>(null)
  const sonarVariant = useRef(Math.floor(Math.random() * 4))

  useEffect(() => {
    resetMultiplayer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => soundManager.playEffectVariant('place', sonarVariant.current), 3500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      unsubRef.current?.()
      const roomId = ownedRoomIdRef.current
      if (roomId && db) {
        deleteDoc(doc(db, 'rooms', roomId)).catch(() => {})
      }
    }
  }, [])

  async function transitionToGame(roomId: string, roomDoc: {
    joinCode: string
    hostUid: string
    guestUid: string
    status: string
  }, myUid: string) {
    const isHost = roomDoc.hostUid === myUid
    const opponentUid = isHost ? roomDoc.guestUid : roomDoc.hostUid

    // Fetch opponent display name from players subcollection
    let opponentName = 'Admiral'
    try {
      const playerSnap = await getDoc(doc(db!, 'rooms', roomId, 'players', opponentUid))
      opponentName = playerSnap.data()?.displayName ?? 'Admiral'
    } catch {
      // Fall back to generic name if rules not yet deployed or other error
    }

    // Clear owned-room ref so cleanup effect won't delete the room
    ownedRoomIdRef.current = null

    initRoom({
      roomId,
      roomCode: roomDoc.joinCode,
      isHost,
      myUid,
      opponentUid,
      opponentName,
    })
    startMultiPlacement()
  }

  function resetToMenu() {
    unsubRef.current?.()
    unsubRef.current = null
    const roomId = ownedRoomIdRef.current
    if (roomId && db) {
      deleteDoc(doc(db, 'rooms', roomId)).catch(() => {})
      ownedRoomIdRef.current = null
    }
    setView('menu')
    setStatus('idle')
    setErrorMsg('')
    setRoomCode('')
    setInputCode('')
    setRooms([])
  }

  function subscribeToRoom(roomId: string, myUid: string) {
    unsubRef.current?.()
    unsubRef.current = onSnapshot(doc(db!, 'rooms', roomId), (snap) => {
      if (!snap.exists()) return
      const data = snap.data() as {
        joinCode: string
        hostUid: string
        guestUid: string
        status: string
      }
      if (data.status === 'PLACING') {
        unsubRef.current?.()
        unsubRef.current = null
        transitionToGame(roomId, data, myUid)
      }
    })
  }

  async function handleCreate(vis: Visibility) {
    setVisibility(vis)
    setView('creating')
    setStatus('waiting')
    setErrorMsg('')

    try {
      const myUid = auth!.currentUser!.uid
      const createRoomFn = httpsCallable(functions!, 'createRoom')
      const result = await createRoomFn({ displayName: playerName, visibility: vis })
      const { roomId, joinCode } = result.data as { roomId: string; joinCode: string }

      setRoomCode(joinCode)
      ownedRoomIdRef.current = roomId
      subscribeToRoom(roomId, myUid)
    } catch (e) {
      const errCode = (e as { code?: string }).code ?? 'unknown'
      setErrorMsg(`Raum konnte nicht erstellt werden. [${errCode}]`)
      setStatus('error')
    }
  }

  function handleShare() {
    const text = `Tritt meinem Navy Fury Raum bei!\nCode: ${roomCode}`
    if (navigator.share) {
      navigator.share({ title: 'Navy Fury — Einladung', text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }

  async function joinByCode(code: string) {
    setStatus('waiting')
    setErrorMsg('')

    try {
      const myUid = auth!.currentUser!.uid
      const joinRoomFn = httpsCallable(functions!, 'joinRoom')
      const result = await joinRoomFn({ joinCode: code, displayName: playerName })
      const { roomId } = result.data as { roomId: string }

      setRoomCode(code)
      setStatus('connected')

      // Guest: room is already PLACING after joinRoom returns — subscribe to pick it up
      subscribeToRoom(roomId, myUid)
    } catch (e) {
      const errCode = (e as { code?: string }).code ?? 'unknown'
      setErrorMsg(`Verbindung fehlgeschlagen. [${errCode}]`)
      setStatus('error')
    }
  }

  async function handleJoin() {
    const code = inputCode.trim().toUpperCase()
    if (code.length !== 6) {
      setErrorMsg('Bitte einen 6-stelligen Code eingeben.')
      return
    }
    await joinByCode(code)
  }

  function handleBrowse() {
    unsubRef.current?.()
    setView('browsing')
    setStatus('idle')
    setErrorMsg('')
    setRooms([])

    const q = query(
      collection(db!, 'rooms'),
      where('status', '==', 'WAITING'),
      limit(20)
    )
    unsubRef.current = onSnapshot(q, (snapshot) => {
      const myUid = auth!.currentUser!.uid
      const list: RoomEntry[] = []
      snapshot.forEach((d) => {
        if (d.data().hostUid === myUid) return
        if (d.data().visibility !== 'public') return
        list.push({
          id: d.id,
          joinCode: d.data().joinCode ?? d.id,
          hostName: d.data().hostName ?? d.data().displayName ?? 'Admiral',
          hostUid: d.data().hostUid,
          createdAt: d.data().createdAt ?? null,
        })
      })
      list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setRooms(list)
    })
  }

  if (!isFirebaseAvailable || !db || !auth?.currentUser) {
    return (
      <div className="lobby-screen">
        <div className="lobby-panel">
          <h2 className="lobby-heading">Multiplayer</h2>
          <p className="lobby-offline">Kein Netzwerk — Multiplayer nicht verfügbar.</p>
          <Button variant="secondary" onClick={returnToSetup}>← Zurück</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="lobby-screen">
      <div className={`lobby-panel${view === 'browsing' ? ' lobby-panel--wide' : ''}`}>
        <h2 className="lobby-heading">Multiplayer</h2>

        {view === 'menu' && (
          <>
            <Button variant="primary" className="lobby-btn" onClick={() => setView('creating-type')}>
              Raum erstellen
            </Button>
            <Button variant="secondary" className="lobby-btn" onClick={handleBrowse}>
              Räume durchsuchen
            </Button>
            <Button variant="secondary" className="lobby-btn" onClick={() => { setView('joining'); setErrorMsg('') }}>
              Code eingeben
            </Button>
            <Button variant="secondary" className="lobby-btn" onClick={returnToSetup}>
              ← Zurück
            </Button>
          </>
        )}

        {view === 'creating-type' && (
          <>
            <p className="lobby-label">Sichtbarkeit wählen:</p>
            <button className="room-type-option" onClick={() => handleCreate('public')}>
              <span className="room-type-title">Öffentlich</span>
              <span className="room-type-desc">Erscheint in der Räume-Liste</span>
            </button>
            <button className="room-type-option" onClick={() => handleCreate('private')}>
              <span className="room-type-title">Privat</span>
              <span className="room-type-desc">Nur per Code oder Link beitreten</span>
            </button>
            <Button variant="secondary" className="lobby-btn" onClick={resetToMenu}>
              ← Zurück
            </Button>
          </>
        )}

        {view === 'creating' && (
          <>
            <p className="lobby-label">
              {visibility === 'private' ? 'Privater Raum — teile den Code:' : 'Dein Raumcode:'}
            </p>
            {roomCode && <p className="lobby-code">{roomCode}</p>}
            {visibility === 'private' && status !== 'connected' && roomCode && (
              <Button variant="secondary" className="lobby-btn" onClick={handleShare}>
                Code teilen
              </Button>
            )}
            {status === 'waiting' && <p className="lobby-hint">Warte auf Gegner…</p>}
            {status === 'connected' && (
              <p className="lobby-connected">Gegner verbunden! Spielstart folgt…</p>
            )}
            {errorMsg && <p className="lobby-error">{errorMsg}</p>}
            <Button variant="secondary" className="lobby-btn" onClick={resetToMenu}>
              ← Zurück
            </Button>
          </>
        )}

        {view === 'joining' && (
          <>
            {status !== 'connected' && (
              <>
                <p className="lobby-label">Raumcode eingeben:</p>
                <input
                  className="lobby-input"
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="z. B. AB3XYZ"
                  autoCapitalize="characters"
                />
              </>
            )}
            {errorMsg && <p className="lobby-error">{errorMsg}</p>}
            {status === 'connected' && (
              <p className="lobby-connected">Verbunden! Warte auf Spielstart…</p>
            )}
            {status !== 'connected' && (
              <Button
                variant="primary"
                className="lobby-btn"
                onClick={handleJoin}
                disabled={status === 'waiting'}
              >
                {status === 'waiting' ? 'Verbinde…' : 'Beitreten'}
              </Button>
            )}
            <Button variant="secondary" className="lobby-btn" onClick={resetToMenu}>
              ← Zurück
            </Button>
          </>
        )}

        {view === 'browsing' && (
          <>
            {status === 'connected' ? (
              <p className="lobby-connected">Verbunden! Warte auf Spielstart…</p>
            ) : rooms.length === 0 ? (
              <p className="lobby-hint">Keine offenen Räume…</p>
            ) : (
              <ul className="room-list">
                {rooms.map((room) => (
                  <li key={room.id} className="room-item">
                    <div className="room-item-info">
                      <span className="room-item-name">{room.hostName}</span>
                      <span className="room-item-meta">{room.joinCode} · {timeAgo(room.createdAt)}</span>
                    </div>
                    <button
                      className="room-item-join"
                      onClick={() => joinByCode(room.joinCode)}
                      disabled={status === 'waiting'}
                    >
                      Beitreten
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errorMsg && <p className="lobby-error">{errorMsg}</p>}
            <Button variant="secondary" className="lobby-btn" onClick={resetToMenu}>
              ← Zurück
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
