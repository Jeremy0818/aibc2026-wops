import {
  DocumentMetadata,
  DocumentMetadataSchema,
} from "@/contracts/document";
import {
  CreateMeetingRequest,
  Meeting,
  MeetingSchema,
} from "@/contracts/meeting";
import {
  CampaignProposal,
  CampaignProposalSchema,
} from "@/contracts/proposal";
import {
  PreparationSession,
  PreparationSessionSchema,
} from "@/contracts/session";
import { WopsApiError } from "./api-error";
import {
  getCloudStorage,
  getDb,
  getStorageBucketName,
} from "./firebase-admin";
import {
  SEED_KOVA_DOCUMENT,
  SEED_KOVA_MEETING,
  SEED_KOVA_PROPOSAL,
  SEED_KOVA_SESSION,
} from "./seed-data";

interface InMemoryStore {
  meetings: Map<string, Meeting>;
  documents: Map<string, DocumentMetadata>;
  sessions: Map<string, PreparationSession>;
  proposals: Map<string, CampaignProposal>;
}

const globalForWopsStore = globalThis as unknown as {
  __wopsStore?: InMemoryStore;
};

function getMemoryStore(): InMemoryStore {
  if (!globalForWopsStore.__wopsStore) {
    const meetings = new Map<string, Meeting>([
      [SEED_KOVA_MEETING.id, structuredClone(SEED_KOVA_MEETING)],
    ]);
    const documents = new Map<string, DocumentMetadata>([
      [SEED_KOVA_DOCUMENT.id, structuredClone(SEED_KOVA_DOCUMENT)],
    ]);
    const sessions = new Map<string, PreparationSession>([
      [SEED_KOVA_SESSION.id, structuredClone(SEED_KOVA_SESSION)],
    ]);
    const proposals = new Map<string, CampaignProposal>([
      [SEED_KOVA_PROPOSAL.id, structuredClone(SEED_KOVA_PROPOSAL)],
    ]);
    globalForWopsStore.__wopsStore = {
      meetings,
      documents,
      sessions,
      proposals,
    };
  }
  return globalForWopsStore.__wopsStore;
}

const COLLECTIONS = {
  meetings: "meetings",
  documents: "documents",
  sessions: "sessions",
  proposals: "proposals",
} as const;

export async function listMeetings(): Promise<Meeting[]> {
  const db = getDb();
  if (db) {
    try {
      const snap = await db
        .collection(COLLECTIONS.meetings)
        .orderBy("scheduledAt", "asc")
        .get();

      if (snap.empty) {
        // Seed initial KOVA demo meeting into Firestore on first access
        await db
          .collection(COLLECTIONS.meetings)
          .doc(SEED_KOVA_MEETING.id)
          .set(SEED_KOVA_MEETING);
        await db
          .collection(COLLECTIONS.documents)
          .doc(SEED_KOVA_DOCUMENT.id)
          .set(SEED_KOVA_DOCUMENT);
        return [SEED_KOVA_MEETING];
      }

      return snap.docs.map((doc) => MeetingSchema.parse(doc.data()));
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to list meetings: ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  return Array.from(store.meetings.values()).sort((a, b) =>
    a.scheduledAt.localeCompare(b.scheduledAt),
  );
}

export async function getMeetingById(
  meetingId: string,
): Promise<Meeting | null> {
  const db = getDb();
  if (db) {
    try {
      const doc = await db
        .collection(COLLECTIONS.meetings)
        .doc(meetingId)
        .get();
      if (!doc.exists) {
        if (meetingId === SEED_KOVA_MEETING.id) {
          await db
            .collection(COLLECTIONS.meetings)
            .doc(SEED_KOVA_MEETING.id)
            .set(SEED_KOVA_MEETING);
          await db
            .collection(COLLECTIONS.documents)
            .doc(SEED_KOVA_DOCUMENT.id)
            .set(SEED_KOVA_DOCUMENT);
          return SEED_KOVA_MEETING;
        }
        return null;
      }
      return MeetingSchema.parse(doc.data());
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to get meeting '${meetingId}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  const meeting = store.meetings.get(meetingId);
  return meeting ? structuredClone(meeting) : null;
}

export async function createMeeting(
  input: CreateMeetingRequest,
): Promise<Meeting> {
  const now = new Date().toISOString();
  const id = `mtg_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

  const participants = input.participants.map((p, idx) => ({
    ...p,
    id: p.id ?? `usr_${idx + 1}_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`,
  }));

  const meeting: Meeting = MeetingSchema.parse({
    ...input,
    id,
    participants,
    status: "ready",
    documentIds: [],
    createdAt: now,
    updatedAt: now,
  });

  const db = getDb();
  if (db) {
    try {
      await db.collection(COLLECTIONS.meetings).doc(meeting.id).set(meeting);
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to create meeting: ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  store.meetings.set(meeting.id, structuredClone(meeting));
  return meeting;
}

export async function updateMeeting(meeting: Meeting): Promise<Meeting> {
  const validated = MeetingSchema.parse({
    ...meeting,
    updatedAt: new Date().toISOString(),
  });

  const db = getDb();
  if (db) {
    try {
      await db
        .collection(COLLECTIONS.meetings)
        .doc(validated.id)
        .set(validated);
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to update meeting '${validated.id}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  store.meetings.set(validated.id, structuredClone(validated));
  return validated;
}

export async function uploadFileToFirebaseStorage(params: {
  meetingId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<string> {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${params.meetingId}/${params.documentId}_${safeName}`;
  const bucketName = getStorageBucketName();
  const storageUri = `gs://${bucketName}/${objectPath}`;

  const storage = getCloudStorage();
  if (storage) {
    try {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(objectPath);
      await file.save(params.buffer, {
        contentType: params.mimeType,
        resumable: false,
        metadata: {
          metadata: {
            meetingId: params.meetingId,
            documentId: params.documentId,
          },
        },
      });
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firebase Storage upload failed: ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  return storageUri;
}

export async function saveDocumentMetadata(
  docMeta: DocumentMetadata,
): Promise<DocumentMetadata> {
  const validated = DocumentMetadataSchema.parse(docMeta);

  const db = getDb();
  if (db) {
    try {
      await db
        .collection(COLLECTIONS.documents)
        .doc(validated.id)
        .set(validated);
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to save document '${validated.id}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  store.documents.set(validated.id, structuredClone(validated));
  return validated;
}

export async function listDocumentsByMeetingId(
  meetingId: string,
): Promise<DocumentMetadata[]> {
  const db = getDb();
  if (db) {
    try {
      const snap = await db
        .collection(COLLECTIONS.documents)
        .where("meetingId", "==", meetingId)
        .get();
      if (snap.empty && meetingId === SEED_KOVA_MEETING.id) {
        await db
          .collection(COLLECTIONS.documents)
          .doc(SEED_KOVA_DOCUMENT.id)
          .set(SEED_KOVA_DOCUMENT);
        return [SEED_KOVA_DOCUMENT];
      }
      return snap.docs.map((doc) => DocumentMetadataSchema.parse(doc.data()));
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to list documents for meeting '${meetingId}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  return Array.from(store.documents.values())
    .filter((doc) => doc.meetingId === meetingId)
    .map((doc) => structuredClone(doc));
}

export async function createPreparationSession(
  session: PreparationSession,
): Promise<PreparationSession> {
  const validated = PreparationSessionSchema.parse(session);

  const db = getDb();
  if (db) {
    try {
      await db
        .collection(COLLECTIONS.sessions)
        .doc(validated.id)
        .set(validated);
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to create session '${validated.id}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  store.sessions.set(validated.id, structuredClone(validated));
  return validated;
}

export async function getSessionById(
  sessionId: string,
): Promise<PreparationSession | null> {
  const db = getDb();
  if (db) {
    try {
      const doc = await db
        .collection(COLLECTIONS.sessions)
        .doc(sessionId)
        .get();
      if (!doc.exists) {
        if (sessionId === SEED_KOVA_SESSION.id) {
          await db
            .collection(COLLECTIONS.sessions)
            .doc(SEED_KOVA_SESSION.id)
            .set(SEED_KOVA_SESSION);
          return SEED_KOVA_SESSION;
        }
        return null;
      }
      return PreparationSessionSchema.parse(doc.data());
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to get session '${sessionId}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  const session = store.sessions.get(sessionId);
  return session ? structuredClone(session) : null;
}

export async function saveSession(
  session: PreparationSession,
): Promise<PreparationSession> {
  const validated = PreparationSessionSchema.parse({
    ...session,
    updatedAt: new Date().toISOString(),
  });

  const db = getDb();
  if (db) {
    try {
      await db
        .collection(COLLECTIONS.sessions)
        .doc(validated.id)
        .set(validated);
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to update session '${validated.id}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  store.sessions.set(validated.id, structuredClone(validated));
  return validated;
}

export async function saveProposal(
  proposal: CampaignProposal,
): Promise<CampaignProposal> {
  const validated = CampaignProposalSchema.parse(proposal);

  const db = getDb();
  if (db) {
    try {
      await db
        .collection(COLLECTIONS.proposals)
        .doc(validated.id)
        .set(validated);
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to save proposal '${validated.id}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  store.proposals.set(validated.id, structuredClone(validated));
  return validated;
}

export async function getProposalById(
  proposalId: string,
): Promise<CampaignProposal | null> {
  const db = getDb();
  if (db) {
    try {
      const doc = await db
        .collection(COLLECTIONS.proposals)
        .doc(proposalId)
        .get();
      if (!doc.exists) {
        if (proposalId === SEED_KOVA_PROPOSAL.id) {
          await db
            .collection(COLLECTIONS.proposals)
            .doc(SEED_KOVA_PROPOSAL.id)
            .set(SEED_KOVA_PROPOSAL);
          return SEED_KOVA_PROPOSAL;
        }
        return null;
      }
      return CampaignProposalSchema.parse(doc.data());
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to get proposal '${proposalId}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  const proposal = store.proposals.get(proposalId);
  return proposal ? structuredClone(proposal) : null;
}
