import {
  MeetingSchema,
  CreateMeetingRequestSchema,
  type Meeting,
  type CreateMeetingRequest,
} from "./meeting";
import {
  CreateDocumentFactRequestSchema,
  DocumentMetadataSchema,
  DocumentProcessingStatusSchema,
  MeetingContextResponseSchema,
  type CreateDocumentFactRequest,
  type DocumentMetadata,
  type DocumentProcessingStatus,
} from "./document";
import {
  SkillStageSchema,
  TranscriptEventSchema,
  DecisionEventSchema,
  PreparationSessionSchema,
  LiveTokenResponseSchema,
  type SkillStage,
  type TranscriptEvent,
  type DecisionEvent,
  type PreparationSession,
  type LiveTokenResponse,
} from "./session";
import {
  PreparationProposalSchema,
  GenerateProposalRequestSchema,
  type PreparationProposal,
  type GenerateProposalRequest,
} from "./proposal";
import { ApiErrorSchema, type ApiError } from "./error";

export function validateSampleContracts(): void {
  const createMeetingReq: CreateMeetingRequest =
    CreateMeetingRequestSchema.parse({
      title: "KOVA Low-Sugar RTD Launch Ideation",
      clientName: "KOVA",
      projectName: "KOVA Light — Low-Sugar RTD Coffee Launch",
      scheduledAt: "2026-10-20T03:00:00.000Z",
      meetingObjective:
        "Align on a primary creative direction and 6-week launch plan prior to agency review",
      clientObjective:
        "Drive trial among urban young professionals in Jakarta and Surabaya",
      clientRequirements: [
        "Highlight low-sugar positioning without making clinical health claims",
        "Include creator-led social activation",
      ],
      targetAudience:
        "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
      constraints: [
        "KOVA is a fictional brand",
        "No unsupported health claims",
        "Budget ceiling is Rp250,000,000, not a mandatory spend",
      ],
      budgetCeilingIdr: 250_000_000,
      participantRole: "Creative Campaign Planner",
      leadRole: "Creative Team Lead",
      participants: [
        {
          id: "usr_planner_01",
          name: "Nadia Kusuma",
          role: "Creative Campaign Planner",
        },
      ],
    });

  const meeting: Meeting = MeetingSchema.parse({
    ...createMeetingReq,
    id: "mtg_kova_001",
    status: "ready",
    documentIds: ["doc_kova_brief_01"],
    createdAt: "2026-10-17T15:00:00.000Z",
    updatedAt: "2026-10-17T15:10:00.000Z",
  });

  // Negative check: non-integer IDR amount must fail
  const floatBudgetResult = CreateMeetingRequestSchema.safeParse({
    ...createMeetingReq,
    budgetCeilingIdr: 250000000.5,
  });
  if (floatBudgetResult.success) {
    throw new Error("Expected float budgetCeilingIdr to fail validation");
  }

  const processingStatus: DocumentProcessingStatus =
    DocumentProcessingStatusSchema.parse("ready");

  const documentMeta: DocumentMetadata = DocumentMetadataSchema.parse({
    id: "doc_kova_brief_01",
    meetingId: meeting.id,
    name: "KOVA-Brand-Brief-2026.pdf",
    mimeType: "application/pdf",
    sizeBytes: 418290,
    type: "brief",
    processingStatus,
    storageUri: "gs://wops-documents/mtg_kova_001/doc_kova_brief_01.pdf",
    summary:
      "Client brief for KOVA low-sugar RTD coffee launch with Rp250M budget ceiling.",
    extractedFacts: [
      {
        id: "fact_01",
        statement: "KOVA Light contains 5g cane sugar per 200ml can.",
        pageOrSection: "Page 2",
      },
    ],
    uploadedAt: "2026-10-17T15:05:00.000Z",
    processedAt: "2026-10-17T15:05:04.000Z",
  });

  MeetingContextResponseSchema.parse({
    meeting,
    documents: [documentMeta],
    synthesizedBrief: "KOVA Light launch brief summary.",
    keyFacts: documentMeta.extractedFacts,
    contextVersion: 1,
  });

  const createFactReq: CreateDocumentFactRequest =
    CreateDocumentFactRequestSchema.parse({
      statement: "KOVA campaign budget ceiling is Rp250,000,000 for 6 weeks.",
      category: "budget",
      provenance: "lead_added",
      confirmedByLead: true,
      addedByRole: "Creative Team Lead",
      addedByUserId: "usr_lead_01",
    });

  if (createFactReq.provenance !== "lead_added") {
    throw new Error("Expected fact provenance to be 'lead_added'");
  }

  const stage: SkillStage = SkillStageSchema.parse("UNDERSTAND");

  // Negative check: unknown SkillStage must fail
  if (SkillStageSchema.safeParse("BRAINSTORM").success) {
    throw new Error("Expected invalid SkillStage 'BRAINSTORM' to fail");
  }

  const transcript: TranscriptEvent = TranscriptEventSchema.parse({
    id: "tr_01",
    sessionId: "ses_kova_001",
    stage,
    speaker: "user",
    text: "Let's focus on afternoon commuter slump in Jakarta without health claims.",
    isFinal: true,
    timestamp: "2026-10-17T15:16:10.000Z",
  });

  const decision: DecisionEvent = DecisionEventSchema.parse({
    id: "dec_01",
    sessionId: "ses_kova_001",
    stage: "EVALUATE",
    topic: "Creative Hook",
    decision: "3 PM Tanpa Drama (3 PM Without the Crash)",
    rationale: "Grounded in 5g sugar product fact without clinical claims.",
    sourceType: "user_decision",
    sourceReferenceIds: ["fact_01"],
    timestamp: "2026-10-17T15:20:00.000Z",
  });

  const session: PreparationSession = PreparationSessionSchema.parse({
    id: "ses_kova_001",
    meetingId: meeting.id,
    participantId: "usr_planner_01",
    participantRole: "Creative Campaign Planner",
    currentStage: "ALIGN",
    stageHistory: [
      {
        fromStage: null,
        toStage: "UNDERSTAND",
        transitionedAt: "2026-10-17T15:15:00.000Z",
      },
      {
        fromStage: "UNDERSTAND",
        toStage: "EXPLORE",
        transitionedAt: "2026-10-17T15:17:00.000Z",
      },
      {
        fromStage: "EXPLORE",
        toStage: "EVALUATE",
        transitionedAt: "2026-10-17T15:19:00.000Z",
      },
      {
        fromStage: "EVALUATE",
        toStage: "ALIGN",
        transitionedAt: "2026-10-17T15:21:00.000Z",
      },
    ],
    transcripts: [transcript],
    confirmedDecisions: [decision],
    openQuestions: ["Confirm MRT sampling permit timeline"],
    selectedConceptId: "dir_01",
    status: "completed",
    startedAt: "2026-10-17T15:15:00.000Z",
    updatedAt: "2026-10-17T15:22:00.000Z",
    endedAt: "2026-10-17T15:22:00.000Z",
  });

  const liveToken: LiveTokenResponse = LiveTokenResponseSchema.parse({
    sessionId: session.id,
    ephemeralToken: "eph_tok_short_lived_001",
    expiresAt: "2026-10-17T15:30:00.000Z",
    stage: "UNDERSTAND",
  });

  if ("apiKey" in liveToken) {
    throw new Error("LiveTokenResponse must never expose a permanent API key");
  }

  const genProposalReq: GenerateProposalRequest =
    GenerateProposalRequestSchema.parse({
      selectedConceptId: "dir_01",
      additionalNotes: "Stay under Rp250,000,000 ceiling.",
    });

  const selectedDirection = {
    id: genProposalReq.selectedConceptId ?? "dir_01",
    title: "3 PM Tanpa Drama",
    tagline: "Kopi Beneran, Gula Ringan.",
    summary: "Own the 3 PM commuter slump in Jakarta and Surabaya.",
    rationale: "Connects low-sugar spec to daily commuter habit.",
    isRecommended: true,
  };

  const proposal: PreparationProposal = PreparationProposalSchema.parse({
    id: "prop_kova_planner_001",
    meetingId: meeting.id,
    participantId: session.participantId,
    participantRole: session.participantRole,
    participantName: session.participantName,
    sessionId: session.id,
    title: "Campaign Strategy & Channel Allocation",
    summary: "Strategic preparation for KOVA Light targeting Jakarta & Surabaya commuter corridors.",
    status: "completed",
    keyIdeas: [
      "Target MRT/KRL transit corridors during 3 PM commute slump",
      "Adopt 'Real Taste, Lighter Pace' positioning",
    ],
    directions: [selectedDirection],
    recommendations: [
      {
        id: "rec_01",
        topic: "Channel Mix",
        recommendation: "Rp120M creator seeding + Rp80M commuter transit hubs",
        rationale: "Maximizes sampling volume under Rp250M ceiling",
        isParticipantConfirmed: true,
      },
    ],
    confirmedDecisions: [
      {
        id: "dec_01",
        stage: "UNDERSTAND",
        topic: "Corridor Targeting",
        decision: "Prioritize MRT/KRL corridors in Jakarta and Surabaya",
        rationale: "High concentration of target 20-32 demographic",
        timestamp: "2026-10-18T04:10:00.000Z",
      },
    ],
    sharedFacts: [
      {
        id: "ref_01",
        sourceType: "document_fact",
        claimOrDecision: "5g cane sugar per 200ml can",
        referenceId: "fact_01",
        citationNote: "Page 2 — Product Specs",
      },
    ],
    talkingPoints: [
      "Bring up MRT sampling permit timeline with account lead",
      "Confirm Surabaya on-ground logistics team",
    ],
    openQuestions: [
      "Who manages daily inventory replenishment at sampling stations?",
    ],
    assumptions: [
      "Station sampling permits cleared within 10 business days",
    ],
    risks: [
      {
        risk: "Unauthorized clinical or health claims by creators",
        mitigation: "Strict creative briefing guardrails and pre-approval",
      },
    ],
    constraints: [
      "Strict zero medical claims constraint",
    ],
    missingInfo: [],
    roleSections: [
      {
        title: "Channel & Budget Allocation",
        description: "Preliminary allocation under Rp250M ceiling",
        items: [
          "TikTok Creator Partnerships: Rp120,000,000",
          "Commuter Station Sampling: Rp80,000,000",
          "Paid Amplification: Rp35,000,000",
          "Contingency Buffer: Rp15,000,000",
        ],
      },
    ],
    createdAt: "2026-10-17T15:25:00.000Z",
    updatedAt: "2026-10-17T15:25:00.000Z",
  });

  if (proposal.status !== "completed") {
    throw new Error("Validation failed: Proposal status should be completed.");
  }

  const apiError: ApiError = ApiErrorSchema.parse({
    error: {
      code: "INVALID_STAGE_TRANSITION",
      message: "Cannot jump directly from UNDERSTAND to ALIGN",
      details: [{ field: "targetStage", message: "Expected EXPLORE" }],
      timestamp: "2026-10-17T15:26:00.000Z",
    },
  });

  if (!apiError.error.code) {
    throw new Error("Invalid API error schema");
  }
}

// Self-executing validation check
validateSampleContracts();

