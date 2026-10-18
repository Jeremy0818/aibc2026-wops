import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Isolated development-only endpoint to mint short-lived ephemeral tokens
 * for Gemini Live client-to-server WebSocket connections.
 * 
 * Never exposed to production users or reused by production session contracts.
 */
export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "GEMINI_API_KEY environment variable is missing on server",
        tip: "Please configure GEMINI_API_KEY in .env.local",
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
    const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes to initiate connection

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
