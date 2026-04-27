import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

export let isFirebaseAvailable = false;
export let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;
export let functions: Functions | null = null;

export const initFirebase = async () => {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    functions = getFunctions(app);

    // Emulator-Verbindung nur in Development.
    // Android-Emulator erreicht den Host-PC über 10.0.2.2, Browser über localhost.
    if (import.meta.env.DEV) {
      const host = Capacitor.isNativePlatform() ? '10.0.2.2' : 'localhost';
      try {
        connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
        connectFirestoreEmulator(db, host, 8080);
        connectFunctionsEmulator(functions, host, 5001);
        console.log(`Firebase: Verbunden mit Emulatoren (${host})`);
      } catch (e) {
        console.warn('Firebase: Emulator-Verbindung fehlgeschlagen', e);
      }
    }

    // Anonymer Login — kritischer Punkt für die SecurityException.
    // Schlägt er fehl, läuft die App trotzdem im Offline-Modus weiter.
    try {
      await signInAnonymously(auth);
      console.log('Firebase Login erfolgreich');
      isFirebaseAvailable = true;
    } catch (authError) {
      console.error('Firebase: Login fehlgeschlagen (SecurityException?), fahre offline fort', authError);
      isFirebaseAvailable = false;
    }
  } catch (globalError) {
    console.error('Firebase: Kritischer Initialisierungsfehler', globalError);
    isFirebaseAvailable = false;
  }

  return { app, db, auth, functions, isFirebaseAvailable };
};
