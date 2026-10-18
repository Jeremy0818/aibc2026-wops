import { connection, NextResponse } from "next/server";
import { authenticateRequest, AuthenticationError, createAuthErrorResponse } from "@/lib/server/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/server/user-profile";

/**
 * GET /api/auth/me
 *
 * Protected endpoint to inspect the current authenticated user profile.
 * - Missing / invalid token -> HTTP 401 Unauthorized
 * - Valid token -> HTTP 200 with user profile
 */
export async function GET(request: Request) {
  await connection();
  try {
    const authUser = await authenticateRequest(request);
    let profile = await getUserProfile(authUser.uid);

    // If profile does not exist in Firestore yet, provide fallback from token claims without mutating on GET
    if (!profile) {
      profile = {
        uid: authUser.uid,
        displayName: authUser.displayName,
        email: authUser.email,
        photoURL: authUser.photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      user: profile,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createAuthErrorResponse(error.message, error.status, error.code);
    }
    const message = error instanceof Error ? error.message : "Internal authentication error";
    return createAuthErrorResponse(message, 500, "INTERNAL_ERROR");
  }
}

/**
 * POST /api/auth/me
 *
 * Explicitly synchronizes / creates the Firestore user profile from verified token claims.
 */
export async function POST(request: Request) {
  try {
    const authUser = await authenticateRequest(request);
    const profile = await upsertUserProfile(authUser);

    return NextResponse.json({
      user: profile,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createAuthErrorResponse(error.message, error.status, error.code);
    }
    const message = error instanceof Error ? error.message : "Failed to synchronize profile";
    return createAuthErrorResponse(message, 500, "INTERNAL_ERROR");
  }
}
