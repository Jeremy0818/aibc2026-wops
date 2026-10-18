import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase Client SDK Initialization (Browser-safe)
 *
 * Configures Firebase Web SDK using NEXT_PUBLIC_* environment variables.
 * Uses a singleton pattern to prevent duplicate app initialization during Next.js Fast Refresh.
 *
 * IMPORTANT: Never import Firebase Admin SDK into browser bundles.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

function initFirebaseClient(): FirebaseApp | null {
  if (typeof window === "undefined") {
    // Return existing or null during server-side evaluation of client components
    return getApps().length ? getApp() : null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  if (!isFirebaseClientConfigured()) {
    console.warn(
      "[Firebase Client] Firebase configuration is incomplete. Authentication will be disabled."
    );
    return null;
  }

  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error("[Firebase Client] Initialization error:", error);
    return null;
  }
}

export const firebaseApp: FirebaseApp | null = initFirebaseClient();

export function getClientAuth(): Auth | null {
  const app = getApps().length ? getApp() : initFirebaseClient();
  if (!app) return null;
  return getAuth(app);
}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: "select_account",
});
