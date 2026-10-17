import {
  DocumentMetadataSchema,
  MeetingContextResponseSchema,
  type DocumentFact,
  type DocumentMetadata,
  type DocumentType,
  type MeetingContextResponse,
} from "@/contracts/document";
import {
  CreateMeetingRequestSchema,
  MeetingSchema,
  type CreateMeetingRequest,
  type Meeting,
} from "@/contracts/meeting";

const MOCK_MODE_STORAGE_KEY = "wops:use_mock_api";
const MOCK_MEETINGS_STORAGE_KEY = "wops:mock_meetings_v2";
const MOCK_DOCUMENTS_STORAGE_KEY = "wops:mock_documents_v1";

/**
 * Seeded KOVA Demo Meeting matching MeetingSchema and API_CONTRACT.md.
 * Includes Creative Team Lead plus two distinct employee participants
 * (Creative Campaign Planner and Senior Brand Designer) sharing the same meeting brief.
 */
export const KOVA_SEED_MEETING: Meeting = MeetingSchema.parse({
  id: "mtg_kova_001",
  title: "KOVA Low-Sugar RTD Launch Ideation",
  clientName: "KOVA",
  projectName: "KOVA Light — Low-Sugar RTD Coffee Launch",
  scheduledAt: "2026-10-20T03:00:00.000Z",
  meetingObjective:
    "Align on a primary creative direction, visual territory, and 6-week launch plan prior to agency review",
  clientObjective:
    "Drive trial among urban young professionals in Jakarta and Surabaya without sacrificing coffee taste perception",
  clientRequirements: [
    "Highlight low-sugar positioning (5g cane sugar per 200ml can) without making clinical or medical health claims",
    "Include creator-led social activation and commuter hub trial mechanics",
    "Deliver a 6-week phased rollout schedule and cohesive visual asset system with clear KPIs",
  ],
  targetAudience:
    "Indonesian urban Gen Z and young millennial commuters in Jakarta and Surabaya (ages 20-32)",
  constraints: [
    "KOVA is a fictional Indonesian ready-to-drink coffee brand for demo purposes",
    "No unsupported medical, weight-loss, or clinical health claims",
    "Budget ceiling is Rp250,000,000 (ceiling, not a mandatory full spend)",
  ],
  budgetCeilingIdr: 250000000,
  participantRole: "Creative Campaign Planner",
  leadRole: "Creative Team Lead",
  participants: [
    {
      id: "usr_lead_01",
      name: "Raka Pratama",
      role: "Creative Team Lead",
      email: "raka.pratama@agency-demo.id",
    },
    {
      id: "usr_planner_01",
      name: "Nadia Kusuma",
      role: "Creative Campaign Planner",
      email: "nadia.kusuma@agency-demo.id",
    },
    {
      id: "usr_designer_01",
      name: "Bima Wijaya",
      role: "Senior Brand Designer",
      email: "bima.wijaya@agency-demo.id",
    },
  ],
  status: "ready",
  documentIds: ["doc_kova_brief_01"],
  createdAt: "2026-10-17T15:00:00.000Z",
  updatedAt: "2026-10-17T15:10:00.000Z",
});

export const KOVA_SEED_FACTS: DocumentFact[] = [
  {
    id: "fact_01",
    statement:
      "KOVA Light contains 5g of cane sugar per 200ml can and uses a 100% Indonesian Arabica-Robusta blend.",
    pageOrSection: "Page 2 — Product Specs",
  },
  {
    id: "fact_02",
    statement:
      "Primary launch cities are Jakarta and Surabaya, focusing on MRT/commuter transit corridors and office districts.",
    pageOrSection: "Page 3 — Market & Distribution",
  },
  {
    id: "fact_03",
    statement:
      "Consumer taste panels showed 78% of 20–32 commuters avoid 'diet' coffee labels because they expect a watery aftertaste.",
    pageOrSection: "Page 4 — Audience Research",
  },
  {
    id: "fact_04",
    statement:
      "Total campaign budget ceiling is Rp250,000,000 across a 6-week launch window; all copy and visual callouts must avoid medical or weight-loss claims.",
    pageOrSection: "Page 5 — Budget & Brand Guardrails",
  },
];

export const KOVA_SEED_DOCUMENT: DocumentMetadata = DocumentMetadataSchema.parse(
  {
    id: "doc_kova_brief_01",
    meetingId: "mtg_kova_001",
    name: "KOVA-Brand-Brief-2026.pdf",
    mimeType: "application/pdf",
    sizeBytes: 418290,
    type: "brief",
    processingStatus: "ready",
    storageUri: "gs://wops-documents/mtg_kova_001/doc_kova_brief_01.pdf",
    summary:
      "Client brief for KOVA Light low-sugar RTD coffee launch targeting urban commuters in Jakarta and Surabaya with a Rp250,000,000 budget ceiling.",
    extractedFacts: KOVA_SEED_FACTS,
    uploadedAt: "2026-10-17T15:05:00.000Z",
    processedAt: "2026-10-17T15:05:04.000Z",
  }
);

export const KOVA_DEMO_MEETING_DRAFT: CreateMeetingRequest =
  CreateMeetingRequestSchema.parse({
    title: "KOVA Low-Sugar RTD Launch Ideation",
    clientName: "KOVA",
    projectName: "KOVA Light — Low-Sugar RTD Coffee Launch",
    scheduledAt: "2026-10-20T03:00:00.000Z",
    meetingObjective:
      "Align on a primary creative direction, visual territory, and 6-week launch plan prior to agency review",
    clientObjective:
      "Drive trial among urban young professionals in Jakarta and Surabaya without sacrificing coffee taste perception",
    clientRequirements: [
      "Highlight low-sugar positioning without making clinical or medical health claims",
      "Include creator-led social activation and convenience store trial mechanics",
      "Deliver a cohesive visual campaign system for social, POS, and commuter sampling booths",
    ],
    targetAudience:
      "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
    constraints: [
      "KOVA is a fictional brand",
      "No unsupported health claims",
      "Budget ceiling is Rp250,000,000 for the demo, not a mandatory spend",
    ],
    budgetCeilingIdr: 250000000,
    participantRole: "Creative Campaign Planner",
    leadRole: "Creative Team Lead",
    participants: [
      {
        name: "Raka Pratama",
        role: "Creative Team Lead",
        email: "raka.pratama@agency-demo.id",
      },
      {
        name: "Nadia Kusuma",
        role: "Creative Campaign Planner",
        email: "nadia.kusuma@agency-demo.id",
      },
      {
        name: "Bima Wijaya",
        role: "Senior Brand Designer",
        email: "bima.wijaya@agency-demo.id",
      },
    ],
  });

export function isEnvMockModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
}

export function isMockModeEnabled(): boolean {
  if (typeof window !== "undefined") {
    const storedOverride = window.localStorage.getItem(MOCK_MODE_STORAGE_KEY);
    if (storedOverride === "true") return true;
    if (storedOverride === "false") return false;
  }
  return isEnvMockModeEnabled();
}

export function setLocalMockModeOverride(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_MODE_STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent("wops:mock-mode-changed"));
}

function readStoredMockMeetings(): Meeting[] {
  if (typeof window === "undefined") {
    return [KOVA_SEED_MEETING];
  }

  try {
    const raw = window.localStorage.getItem(MOCK_MEETINGS_STORAGE_KEY);
    if (!raw) {
      const initial = [KOVA_SEED_MEETING];
      window.localStorage.setItem(
        MOCK_MEETINGS_STORAGE_KEY,
        JSON.stringify(initial)
      );
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [KOVA_SEED_MEETING];
    }

    const validMeetings = parsed
      .map((item) => MeetingSchema.safeParse(item))
      .filter((res) => res.success)
      .map((res) => res.data);

    return validMeetings.length > 0 ? validMeetings : [KOVA_SEED_MEETING];
  } catch {
    return [KOVA_SEED_MEETING];
  }
}

function writeStoredMockMeetings(meetings: Meeting[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MOCK_MEETINGS_STORAGE_KEY,
      JSON.stringify(meetings)
    );
  } catch {
    // Ignore storage quota errors in mock adapter
  }
}

function readStoredMockDocuments(): DocumentMetadata[] {
  if (typeof window === "undefined") {
    return [KOVA_SEED_DOCUMENT];
  }

  try {
    const raw = window.localStorage.getItem(MOCK_DOCUMENTS_STORAGE_KEY);
    if (!raw) {
      const initial = [KOVA_SEED_DOCUMENT];
      window.localStorage.setItem(
        MOCK_DOCUMENTS_STORAGE_KEY,
        JSON.stringify(initial)
      );
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [KOVA_SEED_DOCUMENT];
    }

    const validDocs = parsed
      .map((item) => DocumentMetadataSchema.safeParse(item))
      .filter((res) => res.success)
      .map((res) => res.data);

    return validDocs.length > 0 ? validDocs : [KOVA_SEED_DOCUMENT];
  } catch {
    return [KOVA_SEED_DOCUMENT];
  }
}

function writeStoredMockDocuments(documents: DocumentMetadata[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MOCK_DOCUMENTS_STORAGE_KEY,
      JSON.stringify(documents)
    );
  } catch {
    // Ignore storage quota errors in mock adapter
  }
}

function upsertStoredMockDocument(doc: DocumentMetadata): void {
  const existing = readStoredMockDocuments();
  const filtered = existing.filter((d) => d.id !== doc.id);
  writeStoredMockDocuments([doc, ...filtered]);
}

export function resetMockMeetingsToKovaDefault(): Meeting[] {
  const initialMeetings = [KOVA_SEED_MEETING];
  writeStoredMockMeetings(initialMeetings);
  writeStoredMockDocuments([KOVA_SEED_DOCUMENT]);
  return initialMeetings;
}

export async function mockListMeetings(): Promise<Meeting[]> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  return readStoredMockMeetings();
}

export async function mockGetMeetingById(
  meetingId: string
): Promise<Meeting | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const meetings = readStoredMockMeetings();
  return meetings.find((m) => m.id === meetingId) ?? null;
}

export async function mockCreateMeeting(
  input: CreateMeetingRequest
): Promise<Meeting> {
  await new Promise((resolve) => setTimeout(resolve, 260));
  const validatedInput = CreateMeetingRequestSchema.parse(input);
  const nowIso = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 7);

  const createdMeeting: Meeting = MeetingSchema.parse({
    ...validatedInput,
    id: `mtg_${
      validatedInput.clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || "custom"
    }_${suffix}`,
    participants: validatedInput.participants.map((p, index) => ({
      ...p,
      id: p.id ?? `usr_${suffix}_${index + 1}`,
    })),
    status: "draft",
    documentIds: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const existing = readStoredMockMeetings();
  writeStoredMockMeetings([createdMeeting, ...existing]);
  return createdMeeting;
}

export async function mockMarkMeetingSetupReady(
  meetingId: string
): Promise<Meeting | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const meetings = readStoredMockMeetings();
  const idx = meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) return null;

  const updated: Meeting = MeetingSchema.parse({
    ...meetings[idx],
    status: "ready",
    updatedAt: new Date().toISOString(),
  });
  meetings[idx] = updated;
  writeStoredMockMeetings(meetings);
  return updated;
}

export async function mockGetMeetingContext(
  meetingId: string
): Promise<MeetingContextResponse | null> {
  await new Promise((resolve) => setTimeout(resolve, 160));
  const meetings = readStoredMockMeetings();
  const meeting = meetings.find((m) => m.id === meetingId);
  if (!meeting) {
    return null;
  }

  const allDocs = readStoredMockDocuments();
  const meetingDocs = allDocs.filter((doc) => doc.meetingId === meetingId);
  const readyDocs = meetingDocs.filter(
    (doc) => doc.processingStatus === "ready"
  );

  const keyFacts: DocumentFact[] = [];
  const seenFactIds = new Set<string>();
  for (const doc of readyDocs) {
    for (const fact of doc.extractedFacts) {
      if (!seenFactIds.has(fact.id)) {
        seenFactIds.add(fact.id);
        keyFacts.push(fact);
      }
    }
  }

  const synthesizedBrief =
    readyDocs.length > 0
      ? readyDocs
          .map((doc) => doc.summary)
          .filter((s): s is string => Boolean(s && s.trim()))
          .join(" ") ||
        `${meeting.clientName} (${meeting.projectName}) brief grounded with ${keyFacts.length} extracted fact(s).`
      : undefined;

  return MeetingContextResponseSchema.parse({
    meeting,
    documents: meetingDocs,
    ...(synthesizedBrief ? { synthesizedBrief } : {}),
    keyFacts,
  });
}

export async function mockUploadMeetingDocument(
  meetingId: string,
  file: { name: string; size: number; type: string },
  options?: {
    documentType?: DocumentType;
    simulateOutcome?: "ready" | "failed" | "empty_facts";
    onStatusUpdate?: (doc: DocumentMetadata) => void;
  }
): Promise<DocumentMetadata> {
  const meetings = readStoredMockMeetings();
  const meetingIndex = meetings.findIndex((m) => m.id === meetingId);
  if (meetingIndex === -1) {
    throw new Error(`Meeting "${meetingId}" not found in mock storage.`);
  }

  const targetMeeting = meetings[meetingIndex];
  const suffix = Math.random().toString(36).slice(2, 7);
  const docId = `doc_${
    targetMeeting.clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "brief"
  }_${suffix}`;
  const uploadedAt = new Date().toISOString();
  const docType: DocumentType = options?.documentType ?? "brief";

  // Stage 1: Pending (upload received)
  const pendingDoc: DocumentMetadata = DocumentMetadataSchema.parse({
    id: docId,
    meetingId,
    name: file.name,
    mimeType: file.type || "application/pdf",
    sizeBytes: Math.max(0, Math.trunc(file.size)),
    type: docType,
    processingStatus: "pending",
    storageUri: `gs://wops-documents/${meetingId}/${docId}.pdf`,
    extractedFacts: [],
    uploadedAt,
  });
  upsertStoredMockDocument(pendingDoc);
  options?.onStatusUpdate?.(pendingDoc);

  await new Promise((resolve) => setTimeout(resolve, 260));

  // Stage 2: Processing (extracting facts)
  const processingDoc: DocumentMetadata = DocumentMetadataSchema.parse({
    ...pendingDoc,
    processingStatus: "processing",
  });
  upsertStoredMockDocument(processingDoc);
  options?.onStatusUpdate?.(processingDoc);

  await new Promise((resolve) => setTimeout(resolve, 520));

  const lowerName = file.name.toLowerCase();
  const outcome =
    options?.simulateOutcome ??
    (lowerName.includes("fail") || lowerName.includes("corrupt")
      ? "failed"
      : lowerName.includes("empty") || lowerName.includes("blank")
      ? "empty_facts"
      : "ready");

  const processedAt = new Date().toISOString();

  if (outcome === "failed") {
    const failedDoc: DocumentMetadata = DocumentMetadataSchema.parse({
      ...processingDoc,
      processingStatus: "failed",
      errorMessage:
        "We couldn't extract readable text from this PDF. Please check that the file isn't password-protected or corrupted and try again.",
      processedAt,
    });
    upsertStoredMockDocument(failedDoc);
    options?.onStatusUpdate?.(failedDoc);
    return failedDoc;
  }

  const extractedFacts: DocumentFact[] =
    outcome === "empty_facts"
      ? []
      : KOVA_SEED_FACTS.map((fact, idx) => ({
          id: `${docId}_fact_${idx + 1}`,
          statement: fact.statement,
          pageOrSection: fact.pageOrSection,
        }));

  const summary =
    outcome === "empty_facts"
      ? `Uploaded ${file.name}, but no structured campaign facts were detected in the PDF text layer.`
      : `Extracted from ${file.name}: ${targetMeeting.clientName} (${targetMeeting.projectName}) launch brief covering product specs, Jakarta & Surabaya commuter insights, and the Rp250,000,000 budget ceiling.`;

  const readyDoc: DocumentMetadata = DocumentMetadataSchema.parse({
    ...processingDoc,
    processingStatus: "ready",
    summary,
    extractedFacts,
    processedAt,
  });

  upsertStoredMockDocument(readyDoc);

  // Link documentId to the meeting. Meeting readiness is NOT inferred from a
  // single successful upload — it requires an explicit Team Lead confirmation.
  const latestMeetings = readStoredMockMeetings();
  const idx = latestMeetings.findIndex((m) => m.id === meetingId);
  if (idx !== -1) {
    const current = latestMeetings[idx];
    const nextDocIds = current.documentIds.includes(docId)
      ? current.documentIds
      : [...current.documentIds, docId];
    const updatedMeeting: Meeting = MeetingSchema.parse({
      ...current,
      documentIds: nextDocIds,
      updatedAt: processedAt,
    });
    latestMeetings[idx] = updatedMeeting;
    writeStoredMockMeetings(latestMeetings);
  }

  options?.onStatusUpdate?.(readyDoc);
  return readyDoc;
}
