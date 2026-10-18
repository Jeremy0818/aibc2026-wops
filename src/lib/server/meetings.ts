import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "./firebase-admin";
import { AuthenticationError, type AuthenticatedUser } from "./auth";
import { assertMeetingLead } from "./authorization";
import { findUserByEmail } from "./user-profile";
import {
  MeetingSchema,
  type CreateMeetingRequest,
  type FinalizeMeetingRequest,
  type Meeting,
  type MeetingParticipant,
  type UpdateMeetingRequest,
} from "@/contracts/meeting";

const MEETINGS_COLLECTION = "meetings";

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === "string") {
    return val;
  }
  return new Date().toISOString();
}

/**
 * Maps raw Firestore document data to a strictly validated Meeting domain object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFirestoreDocToMeeting(id: string, data: any): Meeting {
  const meetingRaw = {
    id,
    title: data.title ?? "",
    clientName: data.clientName ?? "",
    projectName: data.projectName ?? "",
    scheduledAt: toIsoString(data.scheduledAt),
    meetingObjective: data.meetingObjective ?? "",
    leadRole: data.leadRole ?? "",
    participants: Array.isArray(data.participants) ? data.participants : [],
    status: data.status ?? "draft",
    documentIds: Array.isArray(data.documentIds) ? data.documentIds : [],
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),

    // Grounded client context fields
    ...(data.clientObjective ? { clientObjective: data.clientObjective } : {}),
    ...(data.targetAudience ? { targetAudience: data.targetAudience } : {}),
    ...(data.budgetCeilingIdr !== undefined ? { budgetCeilingIdr: Number(data.budgetCeilingIdr) } : {}),
    clientRequirements: Array.isArray(data.clientRequirements) ? data.clientRequirements : [],
    constraints: Array.isArray(data.constraints) ? data.constraints : [],
    ...(data.finalizedAt ? { finalizedAt: toIsoString(data.finalizedAt) } : {}),
    ...(data.participantRole ? { participantRole: data.participantRole } : {}),
    contextVersion: typeof data.contextVersion === "number" ? data.contextVersion : 1,

    // Identity fields
    ...(data.teamLeadUserId ? { teamLeadUserId: data.teamLeadUserId } : {}),
    ...(Array.isArray(data.participantUserIds) ? { participantUserIds: data.participantUserIds } : {}),
  };

  return MeetingSchema.parse(meetingRaw);
}

/**
 * Resolves participant list by checking if participant emails correspond to
 * registered users in `users` collection.
 */
async function resolveParticipants(
  participants: MeetingParticipant[],
  suffix: string
): Promise<{ resolvedParticipants: MeetingParticipant[]; participantUserIds: string[] }> {
  const resolvedParticipants: MeetingParticipant[] = [];
  const participantUserIds: string[] = [];

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    let resolvedId = p.id;

    if (p.email) {
      const userProfile = await findUserByEmail(p.email);
      if (userProfile) {
        resolvedId = userProfile.uid;
      }
    }

    if (!resolvedId) {
      resolvedId = `usr_${suffix}_${i + 1}`;
    }

    resolvedParticipants.push({
      id: resolvedId,
      name: p.name,
      role: p.role,
      ...(p.email ? { email: p.email } : {}),
    });

    if (resolvedId && !resolvedId.startsWith("usr_")) {
      participantUserIds.push(resolvedId);
    } else if (resolvedId) {
      participantUserIds.push(resolvedId);
    }
  }

  return { resolvedParticipants, participantUserIds };
}

/**
 * Create a new meeting in Firestore. Caller is set as the verified teamLeadUserId.
 */
export async function createMeetingDocument(
  req: CreateMeetingRequest,
  creator: AuthenticatedUser
): Promise<Meeting> {
  const db = getAdminFirestore();
  const suffix = Math.random().toString(36).slice(2, 7);
  const clientSlug = req.clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "custom";
  const meetingId = `mtg_${clientSlug}_${suffix}`;

  const { resolvedParticipants, participantUserIds } = await resolveParticipants(
    req.participants,
    suffix
  );

  const nowIso = new Date().toISOString();

  const firestoreData = {
    id: meetingId,
    title: req.title,
    clientName: req.clientName,
    projectName: req.projectName,
    scheduledAt: req.scheduledAt,
    meetingObjective: req.meetingObjective,
    leadRole: req.leadRole,
    participants: resolvedParticipants,
    status: "draft",
    documentIds: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    teamLeadUserId: creator.uid,
    participantUserIds,
    clientRequirements: req.clientRequirements ?? [],
    constraints: req.constraints ?? [],
    contextVersion: 1,
    ...(req.clientObjective ? { clientObjective: req.clientObjective } : {}),
    ...(req.targetAudience ? { targetAudience: req.targetAudience } : {}),
    ...(req.budgetCeilingIdr !== undefined ? { budgetCeilingIdr: req.budgetCeilingIdr } : {}),
    ...(req.participantRole ? { participantRole: req.participantRole } : {}),
  };

  const docRef = db.collection(MEETINGS_COLLECTION).doc(meetingId);
  await docRef.set(firestoreData);

  return MeetingSchema.parse({
    ...req,
    id: meetingId,
    participants: resolvedParticipants,
    status: "draft",
    documentIds: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    teamLeadUserId: creator.uid,
    participantUserIds,
    clientRequirements: req.clientRequirements ?? [],
    constraints: req.constraints ?? [],
    contextVersion: 1,
  });
}

/**
 * List meetings accessible to the caller.
 * Accessible meetings include:
 * 1. Meetings where the user is the Team Lead (`teamLeadUserId == userId`)
 * 2. Meetings where the user is an assigned participant (`participantUserIds array-contains userId`)
 */
export async function listAccessibleMeetings(userId: string): Promise<Meeting[]> {
  const db = getAdminFirestore();
  const meetingsRef = db.collection(MEETINGS_COLLECTION);

  const [leadSnap, participantSnap] = await Promise.all([
    meetingsRef.where("teamLeadUserId", "==", userId).get(),
    meetingsRef.where("participantUserIds", "array-contains", userId).get(),
  ]);

  const uniqueDocs = new Map<string, FirebaseFirestore.DocumentData>();

  for (const doc of leadSnap.docs) {
    uniqueDocs.set(doc.id, doc.data());
  }

  for (const doc of participantSnap.docs) {
    if (!uniqueDocs.has(doc.id)) {
      uniqueDocs.set(doc.id, doc.data());
    }
  }

  const meetings: Meeting[] = [];
  for (const [id, data] of uniqueDocs.entries()) {
    try {
      meetings.push(mapFirestoreDocToMeeting(id, data));
    } catch (e) {
      console.warn(`[listAccessibleMeetings] Skipped malformed meeting ${id}:`, e);
    }
  }

  // Sort by scheduledAt descending
  meetings.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return meetings;
}

/**
 * Fetch meeting by ID with strict membership authorization enforcement.
 * Non-members receive an AuthenticationError(403 FORBIDDEN).
 */
export async function getMeetingById(
  meetingId: string,
  userId: string
): Promise<{ meeting: Meeting; isLead: boolean } | null> {
  const db = getAdminFirestore();
  const docSnap = await db.collection(MEETINGS_COLLECTION).doc(meetingId).get();

  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data();
  if (!data) return null;

  const teamLeadUserId = data.teamLeadUserId as string | undefined;
  const participantUserIds = Array.isArray(data.participantUserIds)
    ? (data.participantUserIds as string[])
    : [];

  const isLead = teamLeadUserId === userId;
  const isParticipant = participantUserIds.includes(userId);

  if (!isLead && !isParticipant) {
    throw new AuthenticationError(
      "Forbidden: You are not an assigned participant or lead for this meeting.",
      403,
      "FORBIDDEN"
    );
  }

  const meeting = mapFirestoreDocToMeeting(docSnap.id, data);
  return { meeting, isLead };
}

/**
 * Update meeting details (metadata, scheduled time, participants).
 * Strictly restricted to the Team Lead.
 */
export async function updateMeetingDocument(
  meetingId: string,
  updates: UpdateMeetingRequest,
  userId: string
): Promise<Meeting | null> {
  const db = getAdminFirestore();
  const docRef = db.collection(MEETINGS_COLLECTION).doc(meetingId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data();
  if (!data) return null;

  assertMeetingLead(
    {
      id: meetingId,
      teamLeadUserId: data.teamLeadUserId,
    },
    userId
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firestoreUpdates: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updates.title !== undefined) firestoreUpdates.title = updates.title;
  if (updates.clientName !== undefined) firestoreUpdates.clientName = updates.clientName;
  if (updates.projectName !== undefined) firestoreUpdates.projectName = updates.projectName;
  if (updates.scheduledAt !== undefined) firestoreUpdates.scheduledAt = updates.scheduledAt;
  if (updates.meetingObjective !== undefined) firestoreUpdates.meetingObjective = updates.meetingObjective;
  if (updates.leadRole !== undefined) firestoreUpdates.leadRole = updates.leadRole;
  if (updates.status !== undefined) firestoreUpdates.status = updates.status;
  if (updates.clientObjective !== undefined) firestoreUpdates.clientObjective = updates.clientObjective;
  if (updates.targetAudience !== undefined) firestoreUpdates.targetAudience = updates.targetAudience;
  if (updates.budgetCeilingIdr !== undefined) firestoreUpdates.budgetCeilingIdr = updates.budgetCeilingIdr;
  if (updates.clientRequirements !== undefined) firestoreUpdates.clientRequirements = updates.clientRequirements;
  if (updates.constraints !== undefined) firestoreUpdates.constraints = updates.constraints;

  if (updates.participants !== undefined) {
    const suffix = meetingId.split("_").pop() || "edit";
    const { resolvedParticipants, participantUserIds } = await resolveParticipants(
      updates.participants,
      suffix
    );
    firestoreUpdates.participants = resolvedParticipants;
    firestoreUpdates.participantUserIds = participantUserIds;
  }

  await docRef.update(firestoreUpdates);

  const updatedSnap = await docRef.get();
  return mapFirestoreDocToMeeting(updatedSnap.id, updatedSnap.data());
}

/**
 * Finalize meeting setup and lock shared context.
 * Restricted to Team Lead.
 */
export async function finalizeMeetingDocument(
  meetingId: string,
  req: FinalizeMeetingRequest,
  userId: string
): Promise<Meeting | null> {
  const db = getAdminFirestore();
  const docRef = db.collection(MEETINGS_COLLECTION).doc(meetingId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data();
  if (!data) return null;

  assertMeetingLead(
    {
      id: meetingId,
      teamLeadUserId: data.teamLeadUserId,
    },
    userId
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firestoreUpdates: Record<string, any> = {
    status: "ready",
    finalizedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (req.clientObjective !== undefined) firestoreUpdates.clientObjective = req.clientObjective;
  if (req.targetAudience !== undefined) firestoreUpdates.targetAudience = req.targetAudience;
  if (req.budgetCeilingIdr !== undefined) firestoreUpdates.budgetCeilingIdr = req.budgetCeilingIdr;
  if (req.clientRequirements !== undefined) firestoreUpdates.clientRequirements = req.clientRequirements;
  if (req.constraints !== undefined) firestoreUpdates.constraints = req.constraints;

  await docRef.update(firestoreUpdates);

  const updatedSnap = await docRef.get();
  return mapFirestoreDocToMeeting(updatedSnap.id, updatedSnap.data());
}
