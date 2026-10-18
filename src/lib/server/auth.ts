import "server-only";

import { NextResponse } from "next/server";
import { getAdminAuth } from "./firebase-admin";

/**
 * Server-side Authentication & Firebase ID Token Verification
 *
 * Verifies the incoming `Authorization: Bearer <idToken>` header using Firebase Admin Auth.
 * Derives user identity strictly from the cryptographically verified token claims.
 */

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export class AuthenticationError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.name = "AuthenticationError";
    this.status = status;
    this.code = code;
  }
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedUser> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new AuthenticationError("Authentication required. Missing Bearer token in Authorization header.", 401);
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      displayName: (decodedToken.name as string | undefined) ?? null,
      photoURL: (decodedToken.picture as string | undefined) ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid or expired Firebase ID token";
    throw new AuthenticationError(`Token verification failed: ${message}`, 401);
  }
}

export async function getOptionalAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      displayName: (decodedToken.name as string | undefined) ?? null,
      photoURL: (decodedToken.picture as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

export function createAuthErrorResponse(
  message: string,
  status = 401,
  code = "UNAUTHORIZED"
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}
