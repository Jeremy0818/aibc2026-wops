import "server-only";

import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { applicationDefault } from "firebase-admin/app";

/**
 * Firebase Admin SDK Initialization (Server-only)
 *
 * Requirements:
 * 1. Uses Application Default Credentials (ADC) locally (via `gcloud auth application-default login`)
 *    and Google Cloud runtime identity (Cloud Run / App Engine) in production.
 * 2. Explicitly targets project 'wops-ai-2026'.
 * 3. Does NOT require or parse service-account JSON keys.
 * 4. Guarded with 'server-only' to prevent accidental inclusion into browser bundles.
 */

const FIREBASE_ADMIN_APP_NAME = "wops-admin";
const TARGET_PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCP_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!TARGET_PROJECT_ID || TARGET_PROJECT_ID === "your-gcp-project-id") {
  throw new Error(
    "Firebase Admin requires a valid project ID. Expected wops-ai-2026."
  );
}

if (
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  TARGET_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
) {
  throw new Error(
    "Firebase Admin project ID does not match Firebase Web project ID."
  );
}

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApp = getApps().find((app) => app.name === FIREBASE_ADMIN_APP_NAME);
  if (existingApp) {
    adminApp = existingApp;
    return adminApp;
  }

  try {
    adminApp = initializeApp(
      {
        credential: applicationDefault(),
        projectId: TARGET_PROJECT_ID,
      },
      FIREBASE_ADMIN_APP_NAME
    );
    return adminApp;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[Firebase Admin] Initialization failed for project ${TARGET_PROJECT_ID}:`,
      message
    );
    throw new Error(
      `Firebase Admin initialization failed: ${message}. Ensure Google Application Default Credentials (ADC) are configured.`
    );
  }
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (!adminDb) {
    const app = getAdminApp();
    const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
    adminDb = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);
  }
  return adminDb;
}
