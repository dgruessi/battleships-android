import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { validatePlacement, ShipPlacement, GRID_SIZE } from "./validation";
import { processShot, CellState } from "./gameLogic";

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "navyfury-6cf7a" });
const db = getFirestore();

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateJoinCode(): string {
  // Omit I, O, 0, 1 to prevent misreads
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function emptyBoard(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array<CellState>(GRID_SIZE).fill("UNKNOWN"),
  );
}

// ── createRoom ───────────────────────────────────────────────────────────────

export const createRoom = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const { displayName, visibility } = request.data as { displayName?: string; visibility?: string };
  if (!displayName?.trim()) throw new HttpsError("invalid-argument", "displayName is required");
  const roomVisibility = visibility === "private" ? "private" : "public";

  // Guarantee uniqueness among active rooms (retry up to 20×)
  let joinCode = "";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateJoinCode();
    const existing = await db
      .collection("rooms")
      .where("joinCode", "==", candidate)
      .where("status", "in", ["WAITING", "PLACING", "BATTLE"])
      .limit(1)
      .get();
    if (existing.empty) { joinCode = candidate; break; }
  }
  if (!joinCode) throw new HttpsError("internal", "Could not generate a unique join code");

  const roomRef = db.collection("rooms").doc();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    tx.set(roomRef, {
      joinCode,
      status: "WAITING",
      visibility: roomVisibility,
      hostUid: uid,
      guestUid: null,
      currentTurnUid: null,
      winnerUid: null,
      createdAt: now,
      updatedAt: now,
      lastMoveAt: null,
      shotCount: 0,
      version: 0,
    });
    tx.set(roomRef.collection("players").doc(uid), {
      displayName: displayName.trim(),
      ready: false,
      online: true,
      lastSeenAt: now,
    });
  });

  return { roomId: roomRef.id, joinCode };
});

// ── joinRoom ─────────────────────────────────────────────────────────────────

export const joinRoom = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const { joinCode, displayName } = request.data as { joinCode?: string; displayName?: string };
  if (!joinCode || !displayName?.trim()) {
    throw new HttpsError("invalid-argument", "joinCode and displayName are required");
  }

  const snap = await db
    .collection("rooms")
    .where("joinCode", "==", joinCode.toUpperCase())
    .where("status", "==", "WAITING")
    .limit(1)
    .get();

  if (snap.empty) throw new HttpsError("not-found", "Room not found or game already started");

  const roomDoc = snap.docs[0];
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(roomDoc.ref);
    const data = fresh.data();
    if (!data) throw new HttpsError("not-found", "Room disappeared");
    if (data.guestUid) throw new HttpsError("failed-precondition", "Room is already full");
    if (data.hostUid === uid) throw new HttpsError("failed-precondition", "Cannot join your own room");

    tx.update(roomDoc.ref, {
      guestUid: uid,
      status: "PLACING",
      updatedAt: now,
      version: FieldValue.increment(1),
    });
    tx.set(roomDoc.ref.collection("players").doc(uid), {
      displayName: displayName.trim(),
      ready: false,
      online: true,
      lastSeenAt: now,
    });
  });

  return { roomId: roomDoc.id };
});

// ── submitPlacement ───────────────────────────────────────────────────────────

export const submitPlacement = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const { roomId, ships } = request.data as { roomId?: string; ships?: unknown };
  if (!roomId) throw new HttpsError("invalid-argument", "roomId is required");

  const validation = validatePlacement(ships);
  if (!validation.valid) throw new HttpsError("invalid-argument", validation.reason ?? "Invalid placement");

  const roomRef = db.collection("rooms").doc(roomId);

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = roomSnap.data();
    if (!room) throw new HttpsError("not-found", "Room not found");
    if (room.status !== "PLACING") throw new HttpsError("failed-precondition", "Not in placement phase");
    if (room.hostUid !== uid && room.guestUid !== uid) {
      throw new HttpsError("permission-denied", "You are not in this room");
    }

    const opponentUid: string = room.hostUid === uid ? room.guestUid : room.hostUid;

    // All reads must come before any writes in a Firestore transaction
    const opponentSnap = await tx.get(roomRef.collection("players").doc(opponentUid));
    const opponentReady = opponentSnap.data()?.ready === true;

    const now = FieldValue.serverTimestamp();

    // Store placement privately — not readable by opponent (see Firestore rules)
    tx.set(roomRef.collection("privatePlacements").doc(uid), {
      ships: ships as ShipPlacement[],
      submittedAt: now,
    });

    // Mark this player as ready
    tx.update(roomRef.collection("players").doc(uid), { ready: true });

    if (opponentReady) {
      // Initialise empty masked boards for both players (flat — Firestore forbids nested arrays)
      tx.set(roomRef.collection("maskedBoards").doc(uid), { cells: emptyBoard().flat() });
      tx.set(roomRef.collection("maskedBoards").doc(opponentUid), { cells: emptyBoard().flat() });

      // Advance to BATTLE; host fires first
      tx.update(roomRef, {
        status: "BATTLE",
        currentTurnUid: room.hostUid,
        updatedAt: now,
        version: FieldValue.increment(1),
      });
      tx.set(roomRef.collection("events").doc(), {
        type: "TURN_ADVANCED",
        byUid: "system",
        payload: { nextTurnUid: room.hostUid },
        createdAt: now,
      });
    }
  });

  return { success: true };
});

// ── fireShot ──────────────────────────────────────────────────────────────────

export const fireShot = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const { roomId, row, col } = request.data as { roomId?: string; row?: number; col?: number };
  if (!roomId) throw new HttpsError("invalid-argument", "roomId is required");
  if (
    typeof row !== "number" ||
    typeof col !== "number" ||
    row < 0 || row >= GRID_SIZE ||
    col < 0 || col >= GRID_SIZE
  ) {
    throw new HttpsError("invalid-argument", `Coordinates (${row}, ${col}) are out of bounds`);
  }

  const roomRef = db.collection("rooms").doc(roomId);

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = roomSnap.data();
    if (!room) throw new HttpsError("not-found", "Room not found");
    if (room.status !== "BATTLE") throw new HttpsError("failed-precondition", "Game is not in battle phase");
    if (room.currentTurnUid !== uid) throw new HttpsError("failed-precondition", "It is not your turn");
    if (room.hostUid !== uid && room.guestUid !== uid) {
      throw new HttpsError("permission-denied", "You are not in this room");
    }

    const opponentUid: string = room.hostUid === uid ? room.guestUid : room.hostUid;
    const now = FieldValue.serverTimestamp();

    // Retrieve opponent's private placement (server-only readable)
    const placementSnap = await tx.get(roomRef.collection("privatePlacements").doc(opponentUid));
    const placement = placementSnap.data();
    if (!placement) throw new HttpsError("internal", "Opponent placement not found");

    // Retrieve the current masked board for the *opponent* (stored flat; unflatten for processShot)
    const boardSnap = await tx.get(roomRef.collection("maskedBoards").doc(opponentUid));
    const flatCells = boardSnap.data()?.cells as CellState[] | undefined;
    const currentBoard: CellState[][] = flatCells
      ? Array.from({ length: GRID_SIZE }, (_, r) => flatCells.slice(r * GRID_SIZE, (r + 1) * GRID_SIZE))
      : emptyBoard();

    if (currentBoard[row][col] !== "UNKNOWN") {
      throw new HttpsError("failed-precondition", "That cell has already been targeted");
    }

    const { outcome, sunkShipType, isWinner, updatedBoard } = processShot(
      row,
      col,
      placement.ships as ShipPlacement[],
      currentBoard,
    );

    // Persist updated board (flatten back to 1D — Firestore forbids nested arrays)
    tx.set(roomRef.collection("maskedBoards").doc(opponentUid), { cells: updatedBoard.flat() });

    // Append shot-result event
    tx.set(roomRef.collection("events").doc(), {
      type: "SHOT_RESULT",
      byUid: uid,
      payload: { row, col, outcome, sunkShipType: sunkShipType ?? null },
      createdAt: now,
    });

    // shotCount before this shot (used for analytics on winner branch)
    const prevShotCount: number = typeof room.shotCount === "number" ? room.shotCount : 0;
    const finalShotCount = prevShotCount + 1;

    if (isWinner) {
      tx.update(roomRef, {
        status: "RESULTS",
        winnerUid: uid,
        shotCount: finalShotCount,
        updatedAt: now,
        version: FieldValue.increment(1),
      });
      tx.set(roomRef.collection("events").doc(), {
        type: "GAME_ENDED",
        byUid: "system",
        payload: { winnerUid: uid },
        createdAt: now,
      });
      // ── Analytics: persist game summary for offline querying ──
      // gameStats is a separate top-level collection — easy to aggregate with
      // BigQuery export or a scheduled Function (avg shots, session length, etc.)
      tx.set(db.collection("gameStats").doc(), {
        roomId: roomRef.id,
        winnerUid: uid,
        loserUid: opponentUid,
        shotCount: finalShotCount,
        createdAt: room.createdAt ?? now,   // room start time for session-length calc
        completedAt: now,
      });
    } else {
      tx.update(roomRef, {
        currentTurnUid: opponentUid,
        lastMoveAt: now,
        shotCount: FieldValue.increment(1),
        updatedAt: now,
        version: FieldValue.increment(1),
      });
      tx.set(roomRef.collection("events").doc(), {
        type: "TURN_ADVANCED",
        byUid: "system",
        payload: { nextTurnUid: opponentUid },
        createdAt: now,
      });
    }
  });

  return { success: true };
});

// ── startRematch ──────────────────────────────────────────────────────────────

export const startRematch = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const { roomId } = request.data as { roomId?: string };
  if (!roomId) throw new HttpsError("invalid-argument", "roomId is required");

  const roomRef = db.collection("rooms").doc(roomId);

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const room = roomSnap.data();
    if (!room) throw new HttpsError("not-found", "Room not found");
    if (room.status !== "RESULTS") throw new HttpsError("failed-precondition", "Game is not finished");
    if (room.hostUid !== uid && room.guestUid !== uid) {
      throw new HttpsError("permission-denied", "You are not in this room");
    }

    const now = FieldValue.serverTimestamp();

    tx.update(roomRef, {
      status: "PLACING",
      winnerUid: null,
      currentTurnUid: null,
      shotCount: 0,
      lastMoveAt: null,
      updatedAt: now,
      version: FieldValue.increment(1),
    });

    tx.update(roomRef.collection("players").doc(room.hostUid), { ready: false });
    tx.update(roomRef.collection("players").doc(room.guestUid), { ready: false });

    tx.delete(roomRef.collection("maskedBoards").doc(room.hostUid));
    tx.delete(roomRef.collection("maskedBoards").doc(room.guestUid));
    tx.delete(roomRef.collection("privatePlacements").doc(room.hostUid));
    tx.delete(roomRef.collection("privatePlacements").doc(room.guestUid));

    tx.set(roomRef.collection("events").doc(), {
      type: "REMATCH_STARTED",
      byUid: uid,
      payload: {},
      createdAt: now,
    });
  });

  return { success: true };
});
