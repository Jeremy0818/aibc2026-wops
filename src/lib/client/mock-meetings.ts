import {
  CreateDocumentFactRequestSchema,
  DocumentMetadataSchema,
  DocumentFactSchema,
  MeetingContextResponseSchema,
  type CreateDocumentFactRequest,
  type DocumentFact,
  type DocumentMetadata,
  type DocumentType,
  type FactCategory,
  type MeetingContextResponse,
  type UpdateDocumentFactRequest,
} from "@/contracts/document";
import {
  recordOriginalFactEvidence,
  recordOriginalFactsEvidence,
} from "./fact-evidence";
import {
  CreateMeetingRequestSchema,
  MeetingSchema,
  UpdateMeetingRequestSchema,
  type CreateMeetingRequest,
  type FinalizeMeetingRequest,
  type Meeting,
  type UpdateMeetingRequest,
} from "@/contracts/meeting";

const MOCK_MODE_STORAGE_KEY = "wops:use_mock_api";
const MOCK_MEETINGS_STORAGE_KEY = "wops:mock_meetings_v3";
const MOCK_DOCUMENTS_STORAGE_KEY = "wops:mock_documents_v3";

/**
 * Seeded KOVA Demo Facts matching Contract V2 with typed categories and provenance.
 * Intentionally omits budget and campaign objective to test Team Lead additions.
 */
export const KOVA_SEED_FACTS: DocumentFact[] = [
  {
    id: "fact_01",
    statement:
      "KOVA Light contains 5g of cane sugar per 200ml can and uses a 100% Indonesian Arabica-Robusta blend.",
    category: "requirement",
    provenance: "extracted",
    pageOrSection: "Page 2 — Product Specs",
    sourceDocumentId: "doc_kova_brief_01",
    sourceDocumentName: "KOVA-Brand-Brief-2026.pdf",
    confirmedByLead: true,
  },
  {
    id: "fact_02",
    statement:
      "Primary launch cities are Jakarta and Surabaya, focusing on MRT/commuter transit corridors and office districts.",
    category: "target_audience",
    provenance: "extracted",
    pageOrSection: "Page 3 — Market & Distribution",
    sourceDocumentId: "doc_kova_brief_01",
    sourceDocumentName: "KOVA-Brand-Brief-2026.pdf",
    confirmedByLead: true,
  },
  {
    id: "fact_03",
    statement:
      "Consumer taste panels showed 78% of 20–32 commuters avoid 'diet' coffee labels because they expect a watery aftertaste.",
    category: "constraint",
    provenance: "extracted",
    pageOrSection: "Page 4 — Audience Research",
    sourceDocumentId: "doc_kova_brief_01",
    sourceDocumentName: "KOVA-Brand-Brief-2026.pdf",
    confirmedByLead: true,
  },
  {
    id: "fact_04",
    statement:
      "All campaign copy, creator briefs, and visual callouts must strictly avoid medical, clinical, or weight-loss claims.",
    category: "constraint",
    provenance: "extracted",
    pageOrSection: "Page 5 — Brand Guardrails",
    sourceDocumentId: "doc_kova_brief_01",
    sourceDocumentName: "KOVA-Brand-Brief-2026.pdf",
    confirmedByLead: true,
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
      "Client brief for KOVA Light low-sugar RTD coffee launch targeting urban commuters in Jakarta and Surabaya (product specs, commuter research, brand guardrails). Commercial budget ceiling and campaign objectives omitted from document.",
    extractedFacts: KOVA_SEED_FACTS,
    uploadedAt: "2026-10-17T15:05:00.000Z",
    processedAt: "2026-10-17T15:05:04.000Z",
  }
);

/**
 * Seeded KOVA Demo Meeting in finalized 'ready' status.
 * Starts with missing budget ceiling and client objective to test Team Lead additions.
 */
export const KOVA_SEED_MEETING: Meeting = MeetingSchema.parse({
  id: "mtg_kova_001",
  title: "KOVA Low-Sugar RTD Launch Ideation",
  clientName: "KOVA",
  projectName: "KOVA Light — Low-Sugar RTD Coffee Launch",
  scheduledAt: "2026-10-20T03:00:00.000Z",
  meetingObjective:
    "Align on a primary creative direction, visual territory, and 6-week launch plan prior to agency review",
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
  clientObjective: undefined,
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
  ],
  budgetCeilingIdr: undefined,
  participantRole: "Creative Campaign Planner",
  contextVersion: 1,
  createdAt: "2026-10-17T15:00:00.000Z",
  updatedAt: "2026-10-17T15:10:00.000Z",
  finalizedAt: "2026-10-17T15:10:00.000Z",
});

/**
 * Minimal Team Lead KOVA Demo Draft (Contract V2)
 */
export const KOVA_DEMO_MEETING_DRAFT: CreateMeetingRequest =
  CreateMeetingRequestSchema.parse({
    title: "KOVA Low-Sugar RTD Launch Ideation",
    clientName: "KOVA",
    projectName: "KOVA Light — Low-Sugar RTD Coffee Launch",
    scheduledAt: "2026-10-20T03:00:00.000Z",
    meetingObjective:
      "Align on a primary creative direction, visual territory, and 6-week launch plan prior to agency review",
    leadRole: "Creative Team Lead",
    participants: [
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
  if (typeof window === "undefined") {
    return isEnvMockModeEnabled();
  }
  const localOverride = window.localStorage.getItem(MOCK_MODE_STORAGE_KEY);
  if (localOverride !== null) {
    return localOverride === "true";
  }
  return isEnvMockModeEnabled();
}

export function setLocalMockModeOverride(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_MODE_STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(
    new CustomEvent("wops:mock-mode-change", { detail: { enabled } })
  );
}

function readStoredMockMeetings(): Meeting[] {
  if (typeof window === "undefined") {
    return [KOVA_SEED_MEETING];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_MEETINGS_STORAGE_KEY);
    if (!raw) {
      writeStoredMockMeetings([KOVA_SEED_MEETING]);
      return [KOVA_SEED_MEETING];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      writeStoredMockMeetings([KOVA_SEED_MEETING]);
      return [KOVA_SEED_MEETING];
    }
    const validMeetings: Meeting[] = [];
    for (const item of parsed) {
      const check = MeetingSchema.safeParse(item);
      if (check.success) {
        validMeetings.push(check.data);
      }
    }
    if (validMeetings.length === 0) {
      writeStoredMockMeetings([KOVA_SEED_MEETING]);
      return [KOVA_SEED_MEETING];
    }
    return validMeetings;
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
    // Ignore localStorage write errors
  }
}

function readStoredMockDocuments(): DocumentMetadata[] {
  if (typeof window === "undefined") {
    return [KOVA_SEED_DOCUMENT];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_DOCUMENTS_STORAGE_KEY);
    if (!raw) {
      writeStoredMockDocuments([KOVA_SEED_DOCUMENT]);
      return [KOVA_SEED_DOCUMENT];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      writeStoredMockDocuments([KOVA_SEED_DOCUMENT]);
      return [KOVA_SEED_DOCUMENT];
    }
    const validDocs: DocumentMetadata[] = [];
    for (const item of parsed) {
      const check = DocumentMetadataSchema.safeParse(item);
      if (check.success) {
        validDocs.push(check.data);
      }
    }
    if (validDocs.length === 0) {
      writeStoredMockDocuments([KOVA_SEED_DOCUMENT]);
      return [KOVA_SEED_DOCUMENT];
    }
    return validDocs;
  } catch {
    return [KOVA_SEED_DOCUMENT];
  }
}

function writeStoredMockDocuments(docs: DocumentMetadata[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MOCK_DOCUMENTS_STORAGE_KEY,
      JSON.stringify(docs)
    );
  } catch {
    // Ignore localStorage write errors
  }
}

function upsertStoredMockDocument(doc: DocumentMetadata): void {
  const existing = readStoredMockDocuments();
  const index = existing.findIndex((d) => d.id === doc.id);
  if (index === -1) {
    writeStoredMockDocuments([doc, ...existing]);
  } else {
    existing[index] = doc;
    writeStoredMockDocuments(existing);
  }
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
    clientRequirements: validatedInput.clientRequirements ?? [],
    constraints: validatedInput.constraints ?? [],
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const existing = readStoredMockMeetings();
  writeStoredMockMeetings([createdMeeting, ...existing]);
  return createdMeeting;
}

export async function mockUpdateMeeting(
  meetingId: string,
  input: UpdateMeetingRequest
): Promise<Meeting> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const validated = UpdateMeetingRequestSchema.parse(input);
  const meetings = readStoredMockMeetings();
  const idx = meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    throw new Error(`Meeting "${meetingId}" not found in mock storage.`);
  }

  const existing = meetings[idx];
  const nowIso = new Date().toISOString();

  const updated: Meeting = MeetingSchema.parse({
    ...existing,
    ...validated,
    updatedAt: nowIso,
  });

  meetings[idx] = updated;
  writeStoredMockMeetings(meetings);
  return updated;
}

export async function mockMarkMeetingSetupReady(
  meetingId: string
): Promise<Meeting | null> {
  return mockFinalizeMeeting(meetingId, {});
}

export async function mockFinalizeMeeting(
  meetingId: string,
  input: FinalizeMeetingRequest
): Promise<Meeting> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const meetings = readStoredMockMeetings();
  const idx = meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    throw new Error(`Meeting "${meetingId}" not found in mock storage.`);
  }

  const existing = meetings[idx];
  const nowIso = new Date().toISOString();

  // If client fields not set, derive fallback defaults from grounded facts or presets
  const finalizedClientObjective =
    input.clientObjective ??
    existing.clientObjective ??
    `Drive high-impact launch trial for ${existing.clientName} (${existing.projectName}) with clear, grounded messaging.`;

  const finalizedAudience =
    input.targetAudience ??
    existing.targetAudience ??
    "Urban Indonesian young adults and daily commuters (ages 20-32)";

  const finalizedBudget =
    input.budgetCeilingIdr ?? existing.budgetCeilingIdr ?? 250000000;

  const finalizedRequirements =
    input.clientRequirements ??
    (existing.clientRequirements.length > 0
      ? existing.clientRequirements
      : [
          "Highlight low-sugar positioning without medical claims",
          "Include creator-led social activation and commuter trial mechanics",
        ]);

  const finalizedConstraints =
    input.constraints ??
    (existing.constraints.length > 0
      ? existing.constraints
      : [
          `${existing.clientName} is for demo preparation purposes`,
          "No unsupported health or clinical claims",
        ]);

  const updated: Meeting = MeetingSchema.parse({
    ...existing,
    clientObjective: finalizedClientObjective,
    targetAudience: finalizedAudience,
    budgetCeilingIdr: finalizedBudget,
    clientRequirements: finalizedRequirements,
    constraints: finalizedConstraints,
    status: "ready",
    finalizedAt: nowIso,
    updatedAt: nowIso,
  });

  meetings[idx] = updated;
  writeStoredMockMeetings(meetings);
  return updated;
}

export async function mockUpdateDocumentFact(
  meetingId: string,
  factId: string,
  input: UpdateDocumentFactRequest
): Promise<DocumentFact> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const allDocs = readStoredMockDocuments();
  for (const doc of allDocs) {
    if (doc.meetingId === meetingId) {
      const factIdx = doc.extractedFacts.findIndex((f) => f.id === factId);
      if (factIdx !== -1) {
        const existingFact = doc.extractedFacts[factIdx];
        recordOriginalFactEvidence(existingFact);
        const updatedFact = DocumentFactSchema.parse({
          ...existingFact,
          ...(input.statement !== undefined ? { statement: input.statement } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.provenance !== undefined ? { provenance: input.provenance } : {}),
          ...(input.confirmedByLead !== undefined
            ? { confirmedByLead: input.confirmedByLead }
            : {}),
        });
        doc.extractedFacts[factIdx] = updatedFact;
        upsertStoredMockDocument(doc);
        return updatedFact;
      }
    }
  }

  throw new Error(`Fact "${factId}" not found in mock documents for meeting "${meetingId}".`);
}

export async function mockCreateDocumentFact(
  meetingId: string,
  input: CreateDocumentFactRequest
): Promise<DocumentFact> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  const validated = CreateDocumentFactRequestSchema.parse(input);
  const meetings = readStoredMockMeetings();
  const meetingIdx = meetings.findIndex((m) => m.id === meetingId);
  if (meetingIdx === -1) {
    throw new Error(`Meeting "${meetingId}" not found in mock storage.`);
  }

  const meeting = meetings[meetingIdx];
  const nowIso = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 7);
  const factId = `fact_lead_${suffix}`;

  const createdFact: DocumentFact = DocumentFactSchema.parse({
    id: factId,
    statement: validated.statement,
    category: validated.category,
    provenance: "lead_added",
    confirmedByLead: true,
    addedByUserId: validated.addedByUserId ?? "usr_lead_01",
    addedByRole: validated.addedByRole ?? meeting.leadRole,
    createdAt: nowIso,
  });

  // Attach fact to the first ready document for this meeting, or create a virtual meeting facts doc
  const allDocs = readStoredMockDocuments();
  let targetDoc = allDocs.find(
    (d) => d.meetingId === meetingId && d.processingStatus === "ready"
  );
  if (!targetDoc) {
    targetDoc = DocumentMetadataSchema.parse({
      id: `doc_${meetingId}_lead_additions`,
      meetingId,
      name: "Team Lead Meeting Brief Additions",
      mimeType: "application/json",
      type: "notes",
      processingStatus: "ready",
      summary: "Team Lead manual brief additions and verified requirements.",
      extractedFacts: [createdFact],
      uploadedAt: nowIso,
      processedAt: nowIso,
    });
    allDocs.push(targetDoc);
  } else {
    targetDoc.extractedFacts = [...targetDoc.extractedFacts, createdFact];
    const docIdx = allDocs.findIndex((d) => d.id === targetDoc!.id);
    if (docIdx !== -1) {
      allDocs[docIdx] = targetDoc;
    }
  }
  writeStoredMockDocuments(allDocs);

  // Sync with meeting top-level properties if applicable
  let updatedBudget = meeting.budgetCeilingIdr;
  let updatedObjective = meeting.clientObjective;
  let updatedAudience = meeting.targetAudience;
  const updatedRequirements = [...meeting.clientRequirements];
  const updatedConstraints = [...meeting.constraints];

  if (validated.category === "budget") {
    const digitsOnly = validated.statement.replace(/[^\d]/g, "");
    if (digitsOnly) {
      const parsedAmount = parseInt(digitsOnly, 10);
      if (!Number.isNaN(parsedAmount) && parsedAmount > 0) {
        updatedBudget = parsedAmount;
      }
    }
  } else if (validated.category === "client_objective") {
    updatedObjective = validated.statement;
  } else if (validated.category === "target_audience") {
    updatedAudience = validated.statement;
  } else if (validated.category === "requirement") {
    if (!updatedRequirements.includes(validated.statement)) {
      updatedRequirements.push(validated.statement);
    }
  } else if (validated.category === "constraint") {
    if (!updatedConstraints.includes(validated.statement)) {
      updatedConstraints.push(validated.statement);
    }
  }

  const updatedMeeting: Meeting = MeetingSchema.parse({
    ...meeting,
    budgetCeilingIdr: updatedBudget,
    clientObjective: updatedObjective,
    targetAudience: updatedAudience,
    clientRequirements: updatedRequirements,
    constraints: updatedConstraints,
    contextVersion: (meeting.contextVersion ?? 1) + 1,
    updatedAt: nowIso,
  });

  meetings[meetingIdx] = updatedMeeting;
  writeStoredMockMeetings(meetings);

  return createdFact;
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

  recordOriginalFactsEvidence(keyFacts);

  const synthesizedBrief =
    readyDocs.length > 0
      ? readyDocs
          .map((doc) => doc.summary)
          .filter((s): s is string => Boolean(s && s.trim()))
          .join(" ") ||
        `${meeting.clientName} (${meeting.projectName}) brief grounded with ${keyFacts.length} extracted fact(s).`
      : undefined;

  const standardCategories: FactCategory[] = [
    "client_objective",
    "requirement",
    "target_audience",
    "budget",
    "constraint",
    "deliverable",
    "timeline",
  ];
  const presentCategories = new Set(keyFacts.map((f) => f.category));
  const missingCategories = standardCategories.filter(
    (cat) => !presentCategories.has(cat)
  );

  return MeetingContextResponseSchema.parse({
    meeting,
    documents: meetingDocs,
    ...(synthesizedBrief ? { synthesizedBrief } : {}),
    keyFacts,
    missingCategories,
    contextVersion: meeting.contextVersion ?? 1,
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
      : [
          {
            id: `${docId}_fact_01`,
            statement: `${targetMeeting.clientName} brief: 5g cane sugar per 200ml can with 100% Indonesian Arabica-Robusta blend.`,
            category: "requirement",
            provenance: "extracted",
            pageOrSection: "Page 2 — Product Specs",
            sourceDocumentId: docId,
            sourceDocumentName: file.name,
            confirmedByLead: false,
          },
          {
            id: `${docId}_fact_02`,
            statement: "Target audience focuses on urban young professional commuters (ages 20-32) in Jakarta and Surabaya.",
            category: "target_audience",
            provenance: "extracted",
            pageOrSection: "Page 3 — Distribution",
            sourceDocumentId: docId,
            sourceDocumentName: file.name,
            confirmedByLead: false,
          },
          {
            id: `${docId}_fact_03`,
            statement: "Rp250,000,000 budget ceiling covering social creator seeding, sampling hubs, and digital flight.",
            category: "budget",
            provenance: "extracted",
            pageOrSection: "Page 4 — Budget",
            sourceDocumentId: docId,
            sourceDocumentName: file.name,
            confirmedByLead: false,
          },
          {
            id: `${docId}_fact_04`,
            statement: "Strict guardrail: avoid clinical, medical, or weight-loss claims across all communications.",
            category: "constraint",
            provenance: "extracted",
            pageOrSection: "Page 5 — Compliance",
            sourceDocumentId: docId,
            sourceDocumentName: file.name,
            confirmedByLead: false,
          },
        ];

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

  // Link documentId to the meeting.
  // Note: Status stays 'draft' until explicit Team Lead finalization.
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
