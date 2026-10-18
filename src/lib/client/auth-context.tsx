"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import { getClientAuth, googleAuthProvider, isFirebaseClientConfigured } from "./firebase";
import { authenticatedFetch } from "./api-client";
import type { UserProfile } from "@/lib/server/user-profile";

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const isConfigured = isFirebaseClientConfigured();
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState<string | null>(null);

  // Synchronize user profile with backend upon successful authentication
  const syncProfile = useCallback(async (token: string, currentUser: User) => {
    try {
      const res = await authenticatedFetch(
        "/api/auth/me",
        {
          method: "POST",
        },
        token
      );
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfile(data.user);
          return;
        }
      }
    } catch (e) {
      console.warn("[Auth] Profile synchronization warning:", e);
    }

    // Fallback profile if backend sync was unreachable
    setProfile({
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // Listen for Firebase Auth state and token changes
  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          void syncProfile(token, currentUser);
        } catch (e) {
          console.error("[Auth] Failed to acquire token:", e);
          setIdToken(null);
        }
      } else {
        setIdToken(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncProfile]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) {
      setError("Firebase Authentication is not configured in this environment.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setUser(result.user);
      setIdToken(token);
      await syncProfile(token, result.user);
    } catch (err: unknown) {
      // Handle known Firebase popup errors gracefully
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errCode = (err as any)?.code;
      if (errCode === "auth/popup-closed-by-user" || errCode === "auth/cancelled-popup-request") {
        // User voluntarily closed popup; do not display as an alarming system error
        setError(null);
      } else {
        const message = err instanceof Error ? err.message : "Failed to sign in with Google";
        console.error("[Auth] Google Sign-in error:", err);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [syncProfile]);

  const signOut = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) return;

    setError(null);
    setLoading(true);

    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      setIdToken(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign out";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      const auth = getClientAuth();
      if (!auth?.currentUser) return null;
      try {
        const token = await auth.currentUser.getIdToken(forceRefresh);
        setIdToken(token);
        return token;
      } catch (e) {
        console.warn("[Auth] Failed to refresh token:", e);
        return null;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        idToken,
        loading,
        error,
        isConfigured,
        signInWithGoogle,
        signOut,
        getIdToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
