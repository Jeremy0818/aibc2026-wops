import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Isolated development-only endpoint to mint short-lived ephemeral tokens
 * for Gemini Live client-to-server WebSocket connections.
 * 
 * Security Controls:
 * 1. Development Access Guard: Prohibits token minting in production unless explicitly overridden.
 * 2. Scoped Permissions: Constrained to single-use (uses: 1), 30m expireTime, 5m session initiation.
 * 3. Modality Constraints: Limited strictly to AUDIO response modality on gemini-2.5-flash-native-audio-latest.
 * 4. Credential Protection: Permanent GEMINI_API_KEY never leaves server memory.
 * 5. Zero Logging: Never logs tokens, keys, or audio payloads.
 * 
 * Note for Developer B: Production session live-tokens should be mounted under authenticated
 * /api/sessions/{sessionId}/live-token once user auth & session ownership are in place.
 */
export async function POST() {
  // Explicit development-only access guard
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEV_LIVE_TOKEN !== "true"
  ) {
    return NextResponse.json(
      {
        error: "Development-only endpoint disabled in production",
        tip: "Live token minting in production requires authenticated session endpoints implemented by Developer B.",
      },
      { status: 403 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "GEMINI_API_KEY environment variable is missing on server",
        tip: "Please configure GEMINI_API_KEY in .env.local to enable real Gemini Live audio.",
      },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: "v1alpha",
    });

    const model = "models/gemini-2.5-flash-native-audio-latest";
    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString(); // 30 minutes
    const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes to connect

    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1, // Single-use token for a single Live session
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    });

    if (!tokenResponse.name) {
      throw new Error("Did not receive token name from authTokens.create");
    }

    return NextResponse.json({
      token: tokenResponse.name,
      model,
      expireTime,
      newSessionExpireTime,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[dev/live-token] Failed to create ephemeral token:", message);

    return NextResponse.json(
      {
        error: "Failed to mint ephemeral Gemini token",
        details: message,
      },
      { status: 500 }
    );
  }
}
