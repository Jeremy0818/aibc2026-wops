/**
 * Development-Only Context Bridge for Real Gemini Live Voice Testing.
 * 
 * Purpose:
 * Allows developers to test REAL Gemini Live audio on the WOPS! Prepare screen
 * using explicitly labeled KOVA demo context while production meeting/context
 * endpoints are pending implementation by Developer B.
 * 
 * Strict Boundaries:
 * 1. ONLY active when process.env.NODE_ENV === "development".
 *    In production builds, NODE_ENV is strictly inlined as "production", making
 *    this code dead-code eliminable and impossible to activate in production.
 * 2. ONLY active when NEXT_PUBLIC_ENABLE_DEV_LIVE_CONTEXT === "true".
 * 3. ONLY activates for whitelisted demo meeting fixtures ("mtg_kova_001").
 * 4. Never activates in Demo Mode (where standard mock repository handles data).
 * 5. Does not fabricate backend endpoints or mock production APIs.
 */

import type { Meeting } from "@/contracts/meeting";
import type { MeetingContextResponse } from "@/contracts/document";
import {
  KOVA_SEED_DOCUMENT,
  KOVA_SEED_MEETING,
} from "@/lib/client/mock-meetings";

/** Whitelist of supported development-only demo fixtures */
const ALLOWED_DEV_FIXTURE_IDS = new Set<string>(["mtg_kova_001"]);

/**
 * Checks whether the development-only context bridge is active for the given meeting ID.
 */
export function isDevLiveContextBridgeActive(meetingId?: string): boolean {
  // Hard environment check — never active in production builds or runtimes
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  // Explicit opt-in flag check
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_LIVE_CONTEXT !== "true") {
    return false;
  }

  // If in Demo Mode, standard mock storage takes precedence
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") {
    return false;
  }

  // If a meeting ID is provided, it MUST be in the allowed fixture whitelist
  if (meetingId && !isAllowedDevLiveFixture(meetingId)) {
    return false;
  }

  return true;
}

/**
 * Validates whether a meeting ID belongs to the allowed development fixture whitelist.
 */
export function isAllowedDevLiveFixture(meetingId: string): boolean {
  return ALLOWED_DEV_FIXTURE_IDS.has(meetingId.trim());
}

/**
 * Returns the development fixture Meeting for the whitelisted ID.
 */
export async function getDevLiveMeetingFixture(
  meetingId: string
): Promise<Meeting> {
  const trimmed = meetingId.trim();
  if (!isAllowedDevLiveFixture(trimmed)) {
    throw new Error(
      `[DevContextBridge] Unknown meeting fixture "${trimmed}". Only whitelisted fixtures are supported.`
    );
  }

  return KOVA_SEED_MEETING;
}

/**
 * Returns the development fixture MeetingContextResponse for the whitelisted ID.
 */
export async function getDevLiveContextFixture(
  meetingId: string
): Promise<MeetingContextResponse> {
  const trimmed = meetingId.trim();
  if (!isAllowedDevLiveFixture(trimmed)) {
    throw new Error(
      `[DevContextBridge] Unknown meeting context fixture "${trimmed}". Only whitelisted fixtures are supported.`
    );
  }

  return {
    meeting: KOVA_SEED_MEETING,
    documents: [KOVA_SEED_DOCUMENT],
    synthesizedBrief: KOVA_SEED_DOCUMENT.summary,
    keyFacts: KOVA_SEED_DOCUMENT.extractedFacts,
    missingCategories: ["budget", "client_objective"],
    contextVersion: KOVA_SEED_MEETING.contextVersion ?? 1,
  };
}
