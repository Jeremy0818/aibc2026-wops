import {
  CreateDocumentFactRequest,
  DocumentFact,
  DocumentFactSchema,
  DocumentMetadata,
  DocumentMetadataSchema,
  UpdateDocumentFactRequest,
} from "@/contracts/document";
import {
  CreateMeetingRequest,
  Meeting,
  MeetingSchema,
} from "@/contracts/meeting";
import {
  PreparationProposal,
  PreparationProposalSchema,
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
  proposals: Map<string, PreparationProposal>;
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
    const proposals = new Map<string, PreparationProposal>([
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
    id:
      p.id ??
      `usr_${idx + 1}_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`,
  }));

  const meeting: Meeting = MeetingSchema.parse({
    ...input,
    id,
    participants,
    status: "draft",
    documentIds: [],
    clientRequirements: input.clientRequirements ?? [],
    constraints: input.constraints ?? [],
    participantRole:
      input.participantRole ?? participants[0]?.role ?? "Participant",
    contextVersion: 1,
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

export async function createLeadDocumentFact(
  meeting: Meeting,
  input: CreateDocumentFactRequest,
): Promise<DocumentFact> {
  const now = new Date().toISOString();
  const factId = `fact_lead_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

  const createdFact: DocumentFact = DocumentFactSchema.parse({
    id: factId,
    statement: input.statement,
    category: input.category,
    provenance: "lead_added",
    confirmedByLead: true,
    addedByUserId: input.addedByUserId ?? "usr_lead_01",
    addedByRole: input.addedByRole ?? meeting.leadRole,
    createdAt: now,
  });

  const docs = await listDocumentsByMeetingId(meeting.id);
  let targetDoc = docs.find((d) => d.processingStatus === "ready");

  if (!targetDoc) {
    targetDoc = DocumentMetadataSchema.parse({
      id: `doc_${meeting.id}_lead_additions`,
      meetingId: meeting.id,
      name: "Team Lead Meeting Brief Additions",
      mimeType: "application/json",
      type: "notes",
      processingStatus: "ready",
      summary: "Team Lead manual brief additions and verified requirements.",
      extractedFacts: [createdFact],
      uploadedAt: now,
      processedAt: now,
    });
  } else {
    targetDoc = {
      ...targetDoc,
      extractedFacts: [...targetDoc.extractedFacts, createdFact],
    };
  }

  await saveDocumentMetadata(targetDoc);

  let updatedBudget = meeting.budgetCeilingIdr;
  let updatedObjective = meeting.clientObjective;
  let updatedAudience = meeting.targetAudience;
  const updatedRequirements = [...meeting.clientRequirements];
  const updatedConstraints = [...meeting.constraints];

  if (input.category === "budget") {
    const digitsOnly = input.statement.replace(/[^\d]/g, "");
    if (digitsOnly) {
      const parsedAmount = Number.parseInt(digitsOnly, 10);
      if (!Number.isNaN(parsedAmount) && parsedAmount > 0) {
        updatedBudget = parsedAmount;
      }
    }
  } else if (input.category === "client_objective") {
    updatedObjective = input.statement;
  } else if (input.category === "target_audience") {
    updatedAudience = input.statement;
  } else if (
    input.category === "requirement" &&
    !updatedRequirements.includes(input.statement)
  ) {
    updatedRequirements.push(input.statement);
  } else if (
    input.category === "constraint" &&
    !updatedConstraints.includes(input.statement)
  ) {
    updatedConstraints.push(input.statement);
  }

  const nextDocIds = meeting.documentIds.includes(targetDoc.id)
    ? meeting.documentIds
    : [...meeting.documentIds, targetDoc.id];

  await updateMeeting({
    ...meeting,
    documentIds: nextDocIds,
    budgetCeilingIdr: updatedBudget,
    clientObjective: updatedObjective,
    targetAudience: updatedAudience,
    clientRequirements: updatedRequirements,
    constraints: updatedConstraints,
    contextVersion: (meeting.contextVersion ?? 1) + 1,
  });

  return createdFact;
}

export async function updateMeetingDocumentFact(
  meeting: Meeting,
  factId: string,
  input: UpdateDocumentFactRequest,
): Promise<DocumentFact | null> {
  const docs = await listDocumentsByMeetingId(meeting.id);

  for (const doc of docs) {
    const factIdx = doc.extractedFacts.findIndex((f) => f.id === factId);
    if (factIdx !== -1) {
      const existingFact = doc.extractedFacts[factIdx];
      const updatedFact = DocumentFactSchema.parse({
        ...existingFact,
        ...(input.statement !== undefined
          ? { statement: input.statement }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.provenance !== undefined
          ? { provenance: input.provenance }
          : {}),
        ...(input.confirmedByLead !== undefined
          ? { confirmedByLead: input.confirmedByLead }
          : {}),
      });

      const nextFacts = [...doc.extractedFacts];
      nextFacts[factIdx] = updatedFact;

      await saveDocumentMetadata({
        ...doc,
        extractedFacts: nextFacts,
      });

      await updateMeeting({
        ...meeting,
        contextVersion: (meeting.contextVersion ?? 1) + 1,
      });

      return updatedFact;
    }
  }

  return null;
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
  proposal: PreparationProposal,
): Promise<PreparationProposal> {
  const validated = PreparationProposalSchema.parse(proposal);

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
): Promise<PreparationProposal | null> {
  const resolvedId =
    proposalId === "prop_kova_001" ? SEED_KOVA_PROPOSAL.id : proposalId;

  const db = getDb();
  if (db) {
    try {
      const doc = await db
        .collection(COLLECTIONS.proposals)
        .doc(resolvedId)
        .get();
      if (!doc.exists) {
        if (resolvedId === SEED_KOVA_PROPOSAL.id) {
          await db
            .collection(COLLECTIONS.proposals)
            .doc(SEED_KOVA_PROPOSAL.id)
            .set(SEED_KOVA_PROPOSAL);
          return SEED_KOVA_PROPOSAL;
        }
        return null;
      }
      return PreparationProposalSchema.parse(doc.data());
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to get proposal '${proposalId}': ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  const proposal = store.proposals.get(resolvedId);
  return proposal ? structuredClone(proposal) : null;
}

export async function listProposals(filters?: {
  participantId?: string;
  meetingId?: string;
}): Promise<PreparationProposal[]> {
  const db = getDb();
  if (db) {
    try {
      const snap = await db.collection(COLLECTIONS.proposals).get();
      if (snap.empty) {
        await db
          .collection(COLLECTIONS.proposals)
          .doc(SEED_KOVA_PROPOSAL.id)
          .set(SEED_KOVA_PROPOSAL);
      }
      const all = snap.empty
        ? [SEED_KOVA_PROPOSAL]
        : snap.docs.map((doc) => PreparationProposalSchema.parse(doc.data()));

      return all.filter((p) => {
        if (filters?.participantId && p.participantId !== filters.participantId) {
          return false;
        }
        if (filters?.meetingId && p.meetingId !== filters.meetingId) {
          return false;
        }
        return true;
      });
    } catch (err) {
      throw new WopsApiError(
        "UPSTREAM_ERROR",
        `Firestore failed to list proposals: ${err instanceof Error ? err.message : String(err)}`,
        502,
      );
    }
  }

  const store = getMemoryStore();
  return Array.from(store.proposals.values())
    .filter((p) => {
      if (filters?.participantId && p.participantId !== filters.participantId) {
        return false;
      }
      if (filters?.meetingId && p.meetingId !== filters.meetingId) {
        return false;
      }
      return true;
    })
    .map((p) => structuredClone(p));
}
