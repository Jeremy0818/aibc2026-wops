import {
  MeetingSchema,
  CreateMeetingRequestSchema,
  type Meeting,
  type CreateMeetingRequest,
} from "./meeting";
import {
  DocumentMetadataSchema,
  DocumentProcessingStatusSchema,
  MeetingContextResponseSchema,
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
  CampaignProposalSchema,
  GenerateProposalRequestSchema,
  type CampaignProposal,
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
  });

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
    conceptSummary: "Own the 3 PM commuter slump in Jakarta and Surabaya.",
    rationale: "Connects low-sugar spec to daily commuter habit.",
    isRecommended: true,
  };

  const proposal: CampaignProposal = CampaignProposalSchema.parse({
    id: "prop_kova_001",
    meetingId: meeting.id,
    sessionId: session.id,
    executiveSummary: "6-week launch campaign for KOVA Light.",
    clientContext:
      "KOVA is a fictional Indonesian RTD coffee brand launching a low-sugar line.",
    campaignObjectives: [
      "Drive commuter trial in Jakarta and Surabaya",
      "Build low-sugar taste credibility without health claims",
    ],
    targetAudience: meeting.targetAudience ?? "Indonesian urban commuters",
    creativeDirections: [selectedDirection],
    selectedDirection,
    keyMessages: ["Real coffee character, lighter sugar"],
    activationIdeas: ["MRT commuter drop sampling"],
    channelStrategy: [
      {
        channel: "TikTok & Instagram Reels",
        role: "Reach & Relatability",
        tactics: ["3 PM POV creator skits"],
      },
    ],
    creatorStrategy: "Partner with 15 lifestyle & commuter creators.",
    sixWeekTimeline: [1, 2, 3, 4, 5, 6].map((weekNumber) => ({
      weekNumber,
      phaseName: `Week ${weekNumber} Execution`,
      milestones: [`Milestone ${weekNumber}`],
      deliverables: [`Deliverable ${weekNumber}`],
    })),
    budgetBreakdown: [
      {
        category: "Creator Partnerships",
        amountIdr: 85_000_000,
      },
      {
        category: "Commuter Sampling",
        amountIdr: 75_000_000,
      },
      {
        category: "Paid Social & Production",
        amountIdr: 75_000_000,
      },
    ],
    totalBudgetIdr: 235_000_000,
    kpis: ["12,000 cans sampled", "2.5M video views"],
    risks: [
      {
        risk: "Unauthorized health claims by creators",
        mitigation: "Mandatory creator script review",
      },
    ],
    sourceReferences: [
      {
        id: "ref_01",
        sourceType: "document_fact",
        claimOrDecision: "5g sugar per 200ml can",
        referenceId: "fact_01",
      },
      {
        id: "ref_02",
        sourceType: "user_decision",
        claimOrDecision: "Selected '3 PM Tanpa Drama' direction",
        referenceId: "dec_01",
      },
      {
        id: "ref_03",
        sourceType: "assumption",
        claimOrDecision: "MRT sampling permit cleared in 10 business days",
      },
    ],
    nextSteps: ["Present proposal in scheduled team review"],
    createdAt: "2026-10-17T15:25:00.000Z",
    updatedAt: "2026-10-17T15:25:00.000Z",
  });

  if (
    meeting.budgetCeilingIdr !== undefined &&
    proposal.totalBudgetIdr > meeting.budgetCeilingIdr
  ) {
    throw new Error("Proposal totalBudgetIdr exceeds meeting budgetCeilingIdr");
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
