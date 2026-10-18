import "server-only";

import { AuthenticationError } from "./auth";

/**
 * WOPS! Authorization Foundation (Server-only)
 *
 * Implements meeting-scoped authorization principles defined in API_CONTRACT.md:
 *
 * Core Principles:
 * 1. Meeting Lead: Sole authorized custodian of Shared Meeting Context (documents, facts, finalization).
 * 2. Assigned Participant: Authorized to view shared context and conduct their own preparation session.
 * 3. Session & Proposal Privacy: Each employee has their OWN personal preparation session and proposal.
 *    Team Lead status alone does NOT grant access to private participant sessions or proposals.
 * 4. Meeting-Specific Scoping: A user may lead one meeting and be an assigned participant in another.
 * 5. No Hardcoded Privileges: Never use hardcoded email addresses or demo persona IDs for access control.
 *
 * Note: Full persistence of meeting memberships arrives in Sprint B2. These helpers establish
 * the strict structural boundaries today.
 */

export interface MeetingAuthContext {
  id: string;
  teamLeadUserId?: string;
  assignedParticipantUserIds?: string[];
}

export interface SessionAuthContext {
  id: string;
  meetingId: string;
  participantUserId: string;
}

export interface ProposalAuthContext {
  id: string;
  meetingId: string;
  participantUserId: string;
}

/**
 * Validates that caller is the designated Team Lead for the meeting.
 */
export function isMeetingLead(meeting: MeetingAuthContext, userId: string): boolean {
  if (!meeting.teamLeadUserId || !userId) return false;
  return meeting.teamLeadUserId === userId;
}

/**
 * Validates that caller is either Team Lead or an assigned participant in the meeting.
 */
export function isMeetingMember(meeting: MeetingAuthContext, userId: string): boolean {
  if (!userId) return false;
  if (meeting.teamLeadUserId === userId) return true;
  return meeting.assignedParticipantUserIds?.includes(userId) ?? false;
}

/**
 * Validates that caller is the individual owner of the session.
 * Team Lead status does NOT grant access to someone else's preparation session.
 */
export function isSessionOwner(session: SessionAuthContext, userId: string): boolean {
  if (!session.participantUserId || !userId) return false;
  return session.participantUserId === userId;
}

/**
 * Validates that caller is the individual owner of the proposal.
 * Team Lead status does NOT grant access to someone else's personal proposal.
 */
export function isProposalOwner(proposal: ProposalAuthContext, userId: string): boolean {
  if (!proposal.participantUserId || !userId) return false;
  return proposal.participantUserId === userId;
}

/**
 * Assertion helpers that throw 403 Forbidden when authorization checks fail.
 */
export function assertMeetingLead(meeting: MeetingAuthContext, userId: string): void {
  if (!isMeetingLead(meeting, userId)) {
    throw new AuthenticationError(
      "Forbidden: Only the authorized Team Lead can mutate shared meeting context or documents.",
      403,
      "FORBIDDEN"
    );
  }
}

export function assertMeetingMember(meeting: MeetingAuthContext, userId: string): void {
  if (!isMeetingMember(meeting, userId)) {
    throw new AuthenticationError(
      "Forbidden: You are not an assigned participant or lead for this meeting.",
      403,
      "FORBIDDEN"
    );
  }
}

export function assertSessionOwner(session: SessionAuthContext, userId: string): void {
  if (!isSessionOwner(session, userId)) {
    throw new AuthenticationError(
      "Forbidden: Personal preparation sessions are strictly private to the assigned employee.",
      403,
      "FORBIDDEN"
    );
  }
}

export function assertProposalOwner(proposal: ProposalAuthContext, userId: string): void {
  if (!isProposalOwner(proposal, userId)) {
    throw new AuthenticationError(
      "Forbidden: Personal preparation proposals are strictly private to their owner.",
      403,
      "FORBIDDEN"
    );
  }
}
