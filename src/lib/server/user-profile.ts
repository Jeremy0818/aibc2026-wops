import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "./firebase-admin";
import type { AuthenticatedUser } from "./auth";

/**
 * User Profile Firestore Data Access (Server-only)
 *
 * Collection: `users/{firebaseUid}`
 *
 * Canonical user identifier is strictly the verified Firebase UID.
 */

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
}

const USERS_COLLECTION = "users";

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === "string") {
    return val;
  }
  return new Date().toISOString();
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getAdminFirestore();
  const docSnap = await db.collection(USERS_COLLECTION).doc(uid).get();

  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data();
  if (!data) return null;

  return {
    uid: docSnap.id,
    displayName: (data.displayName as string | undefined) ?? null,
    email: (data.email as string | undefined) ?? null,
    photoURL: (data.photoURL as string | undefined) ?? null,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export async function upsertUserProfile(user: AuthenticatedUser): Promise<UserProfile> {
  const db = getAdminFirestore();
  const userRef = db.collection(USERS_COLLECTION).doc(user.uid);
  const nowIso = new Date().toISOString();

  const docSnap = await userRef.get();

  if (!docSnap.exists) {
    const newProfileData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await userRef.set(newProfileData);

    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  // Document exists: update profile attributes and timestamp
  await userRef.update({
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedSnap = await userRef.get();
  const updatedData = updatedSnap.data();

  return {
    uid: user.uid,
    displayName: (updatedData?.displayName as string | undefined) ?? user.displayName,
    email: (updatedData?.email as string | undefined) ?? user.email,
    photoURL: (updatedData?.photoURL as string | undefined) ?? user.photoURL,
    createdAt: toIsoString(updatedData?.createdAt),
    updatedAt: toIsoString(updatedData?.updatedAt),
  };
}

/**
 * Look up a user profile by email in Firestore.
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  if (!email || !email.trim()) return null;
  const db = getAdminFirestore();
  const normalized = email.trim();

  // Primary check: exact match
  const snap = await db
    .collection(USERS_COLLECTION)
    .where("email", "==", normalized)
    .limit(1)
    .get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: (data.displayName as string | undefined) ?? null,
      email: (data.email as string | undefined) ?? null,
      photoURL: (data.photoURL as string | undefined) ?? null,
      createdAt: toIsoString(data.createdAt),
      updatedAt: toIsoString(data.updatedAt),
    };
  }

  // Fallback: check lowercase if different
  if (normalized.toLowerCase() !== normalized) {
    const lowerSnap = await db
      .collection(USERS_COLLECTION)
      .where("email", "==", normalized.toLowerCase())
      .limit(1)
      .get();

    if (!lowerSnap.empty) {
      const doc = lowerSnap.docs[0];
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: (data.displayName as string | undefined) ?? null,
        email: (data.email as string | undefined) ?? null,
        photoURL: (data.photoURL as string | undefined) ?? null,
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
      };
    }
  }

  return null;
}

/**
 * List registered team users from Firestore (useful for participant assignment).
 */
export async function listRegisteredUsers(limit = 50): Promise<UserProfile[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(USERS_COLLECTION).limit(limit).get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: (data.displayName as string | undefined) ?? null,
      email: (data.email as string | undefined) ?? null,
      photoURL: (data.photoURL as string | undefined) ?? null,
      createdAt: toIsoString(data.createdAt),
      updatedAt: toIsoString(data.updatedAt),
    };
  });
}
