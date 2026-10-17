import {
  App,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import fs from "node:fs";

let cachedFirestore: Firestore | null = null;
let cachedStorage: Storage | null = null;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return (
    trimmed === "" ||
    trimmed.startsWith("your-") ||
    trimmed === "./path/to/service-account-key.json"
  );
}

/**
 * Determines whether live Firebase Admin (Firestore / Cloud Storage) should be used.
 * Automatically activates on Firebase App Hosting (`FIREBASE_CONFIG` / `K_SERVICE`),
 * when a Firebase Emulator is configured (`FIRESTORE_EMULATOR_HOST`),
 * or when valid GCP/Firebase credentials are provided in environment variables.
 */
export function isFirebaseConfigured(): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return true;
  }
  if (process.env.FIREBASE_CONFIG || process.env.K_SERVICE) {
    return true;
  }
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.GCP_PROJECT_ID;
  if (isPlaceholder(projectId)) {
    return false;
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && !isPlaceholder(credPath)) {
    return fs.existsSync(credPath);
  }
  return process.env.USE_FIREBASE_ADC === "true";
}

export function getFirebaseAdminApp(): App | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GCP_PROJECT_ID ??
    undefined;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ??
    (!isPlaceholder(process.env.GCS_BUCKET_NAME)
      ? process.env.GCS_BUCKET_NAME
      : undefined);

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && !isPlaceholder(credPath) && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf8"));
    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
      storageBucket,
    });
  }

  // On Firebase App Hosting / Cloud Run, initializeApp() with no args or applicationDefault()
  // automatically picks up the runtime service account and FIREBASE_CONFIG.
  if (process.env.FIREBASE_CONFIG) {
    return initializeApp();
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket,
  });
}

export function getDb(): Firestore | null {
  if (cachedFirestore) {
    return cachedFirestore;
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }

  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  cachedFirestore =
    databaseId && databaseId !== "(default)"
      ? getFirestore(app, databaseId)
      : getFirestore(app);

  cachedFirestore.settings({ ignoreUndefinedProperties: true });
  return cachedFirestore;
}

export function getStorageBucketName(): string {
  const bucket =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.GCS_BUCKET_NAME;
  if (bucket && !isPlaceholder(bucket)) {
    return bucket;
  }
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.GCP_PROJECT_ID ?? "wops-demo";
  return `${projectId}.firebasestorage.app`;
}

export function getCloudStorage(): Storage | null {
  if (cachedStorage) {
    return cachedStorage;
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }

  cachedStorage = getStorage(app);
  return cachedStorage;
}
