import {
  DocumentFact,
  DocumentMetadata,
  DocumentMetadataSchema,
} from "@/contracts/document";
import { Meeting, MeetingSchema } from "@/contracts/meeting";
import {
  PreparationProposal,
  PreparationProposalSchema,
} from "@/contracts/proposal";
import {
  PreparationSession,
  PreparationSessionSchema,
} from "@/contracts/session";

export const SEED_KOVA_FACTS: DocumentFact[] = [
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

export const SEED_KOVA_MEETING: Meeting = MeetingSchema.parse({
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
  ],
  budgetCeilingIdr: 250000000,
  participantRole: "Creative Campaign Planner",
  contextVersion: 1,
  createdAt: "2026-10-17T15:00:00.000Z",
  updatedAt: "2026-10-17T15:10:00.000Z",
  finalizedAt: "2026-10-17T15:10:00.000Z",
});

export const SEED_KOVA_DOCUMENT: DocumentMetadata =
  DocumentMetadataSchema.parse({
    id: "doc_kova_brief_01",
    meetingId: "mtg_kova_001",
    name: "KOVA-Brand-Brief-2026.pdf",
    mimeType: "application/pdf",
    sizeBytes: 418290,
    type: "brief",
    processingStatus: "ready",
    storageUri: "gs://wops-documents/mtg_kova_001/doc_kova_brief_01.pdf",
    summary:
      "Client brief for KOVA Light low-sugar RTD coffee launch targeting urban commuters in Jakarta and Surabaya (product specs, commuter research, brand guardrails).",
    extractedFacts: SEED_KOVA_FACTS,
    uploadedAt: "2026-10-17T15:05:00.000Z",
    processedAt: "2026-10-17T15:05:04.000Z",
  });

export const SEED_KOVA_SESSION: PreparationSession =
  PreparationSessionSchema.parse({
    id: "ses_kova_001",
    meetingId: "mtg_kova_001",
    participantId: "usr_planner_01",
    participantRole: "Creative Campaign Planner",
    participantName: "Nadia Kusuma",
    currentStage: "UNDERSTAND",
    stageHistory: [
      {
        fromStage: null,
        toStage: "UNDERSTAND",
        transitionedAt: "2026-10-17T15:15:00.000Z",
        reason: "Session initialized",
      },
    ],
    transcripts: [],
    confirmedDecisions: [],
    openQuestions: [],
    selectedConceptId: null,
    status: "ringing",
    startedAt: "2026-10-17T15:15:00.000Z",
    updatedAt: "2026-10-17T15:15:00.000Z",
  });

export const SEED_KOVA_PROPOSAL: PreparationProposal =
  PreparationProposalSchema.parse({
    id: "prop_kova_planner_001",
    meetingId: "mtg_kova_001",
    participantId: "usr_planner_01",
    participantRole: "Creative Campaign Planner",
    participantName: "Nadia Kusuma",
    sessionId: "ses_kova_001",
    title: "KOVA Light — Campaign Strategy & Channel Allocation",
    summary:
      "Strategic pre-meeting preparation exploring commuter transit corridors in Jakarta and Surabaya, taste-first positioning, and a Rp235M channel allocation under the Rp250M ceiling with a Rp15M contingency reserve.",
    status: "completed",
    keyIdeas: [
      "Prioritize high-density urban transit corridors (Jakarta MRT/KRL and Surabaya transit) for 20-32 young commuters.",
      "Adopt 'Real Taste, Lighter Pace' hook: lead with authentic Arabica-Robusta taste first, with low-sugar as the everyday lifestyle benefit.",
      "Deploy a Rp235M channel split across creator seeding and commuter sampling, preserving a Rp15M contingency reserve under the ceiling.",
    ],
    directions: [
      {
        id: "dir_01",
        title: "3 PM Tanpa Drama (Real Taste, Lighter Pace)",
        tagline: "Kopi Beneran, Gula Ringan.",
        summary:
          "Target the 3 PM commuter slump across Jabodetabek and Surabaya transit corridors with taste-first messaging.",
        rationale:
          "Directly tackles the 78% watery-taste perception barrier from client research without resorting to medical or diet claims.",
        isRecommended: true,
      },
    ],
    recommendations: [
      {
        id: "rec_01",
        topic: "Channel Mix",
        recommendation:
          "Allocate Rp120M to TikTok creator seeding, Rp80M to commuter transit sampling, and Rp35M to paid social.",
        rationale:
          "Balances wide viral reach with high-touch physical product trial where commuters gather daily.",
        isParticipantConfirmed: true,
      },
      {
        id: "rec_02",
        topic: "Contingency Safety",
        recommendation:
          "Hold a Rp15M unallocated reserve under the Rp250M budget ceiling.",
        rationale:
          "Covers potential transit permit overtime fees or creator asset revisions without exceeding client brief ceiling.",
        isParticipantConfirmed: true,
      },
    ],
    sharedFacts: [
      {
        id: "ref_01",
        sourceType: "document_fact",
        claimOrDecision:
          "KOVA Light contains 5g cane sugar per 200ml can and uses a 100% Indonesian Arabica-Robusta blend.",
        referenceId: "fact_01",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 2 — Product Specs",
      },
      {
        id: "ref_02",
        sourceType: "document_fact",
        claimOrDecision:
          "Primary launch cities are Jakarta and Surabaya, focusing on MRT/commuter transit corridors.",
        referenceId: "fact_02",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 3 — Market & Distribution",
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
    talkingPoints: [
      "Walk the team through the Rp120M creator / Rp80M sampling split to check alignment with Bima's physical asset requirements.",
      "Clarify transit sampling permit lead times (MRT Jakarta & KRL) with the Team Lead before committing launch week dates.",
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
      "Total spend cannot exceed Rp250,000,000 across all 6 weeks",
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
