import { DocumentMetadata, DocumentMetadataSchema } from "@/contracts/document";
import { Meeting, MeetingSchema } from "@/contracts/meeting";
import {
  CampaignProposal,
  CampaignProposalSchema,
} from "@/contracts/proposal";
import {
  PreparationSession,
  PreparationSessionSchema,
} from "@/contracts/session";

export const SEED_KOVA_MEETING: Meeting = MeetingSchema.parse({
  id: "mtg_kova_001",
  title: "KOVA Low-Sugar RTD Launch Ideation",
  clientName: "KOVA",
  projectName: "KOVA Light — Low-Sugar RTD Coffee Launch",
  scheduledAt: "2026-10-20T03:00:00.000Z",
  meetingObjective:
    "Align on a primary creative direction and 6-week launch plan prior to agency review",
  clientObjective:
    "Drive trial among urban young professionals in Jakarta and Surabaya without sacrificing coffee taste perception",
  clientRequirements: [
    "Highlight low-sugar positioning without making clinical or medical health claims",
    "Include creator-led social activation and convenience store trial mechanics",
  ],
  targetAudience:
    "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
  constraints: [
    "KOVA is a fictional brand for demo purposes",
    "No unsupported health or medical claims",
    "Budget ceiling of Rp250,000,000 (ceiling, not mandatory full spend)",
  ],
  budgetCeilingIdr: 250000000,
  participantRole: "Creative Campaign Planner",
  leadRole: "Creative Team Lead",
  participants: [
    {
      id: "usr_lead_01",
      name: "Raka Pratama",
      role: "Creative Team Lead",
    },
    {
      id: "usr_planner_01",
      name: "Nadia Kusuma",
      role: "Creative Campaign Planner",
    },
  ],
  status: "ready",
  documentIds: ["doc_kova_brief_01"],
  createdAt: "2026-10-17T15:00:00.000Z",
  updatedAt: "2026-10-17T15:10:00.000Z",
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
      "Client brief for KOVA low-sugar RTD coffee launch targeting urban commuters in Jakarta and Surabaya with a Rp250,000,000 budget ceiling.",
    extractedFacts: [
      {
        id: "fact_01",
        statement:
          "KOVA Light contains 5g of cane sugar per 200ml can and uses 100% Indonesian Arabica-Robusta blend.",
        pageOrSection: "Page 2 — Product Specs",
      },
      {
        id: "fact_02",
        statement:
          "Primary launch cities are Jakarta and Surabaya targeting urban commuters aged 20-32.",
        pageOrSection: "Page 3 — Target Market",
      },
      {
        id: "fact_03",
        statement:
          "Total campaign budget must not exceed Rp250,000,000 IDR across a 6-week launch window.",
        pageOrSection: "Page 4 — Budget & Timeline",
      },
      {
        id: "fact_04",
        statement:
          "Brand guidelines strictly prohibit clinical, medical, or weight-loss claims.",
        pageOrSection: "Page 5 — Brand Mandatories",
      },
    ],
    uploadedAt: "2026-10-17T15:05:00.000Z",
    processedAt: "2026-10-17T15:05:04.000Z",
  });

export const SEED_KOVA_SESSION: PreparationSession =
  PreparationSessionSchema.parse({
    id: "ses_kova_001",
    meetingId: "mtg_kova_001",
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

export const SEED_KOVA_PROPOSAL: CampaignProposal =
  CampaignProposalSchema.parse({
    id: "prop_kova_001",
    meetingId: "mtg_kova_001",
    sessionId: "ses_kova_001",
    executiveSummary:
      "A 6-week launch campaign for KOVA Light centered on afternoon urban commuters in Jakarta and Surabaya.",
    clientContext:
      "KOVA (fictional Indonesian RTD coffee brand) is introducing a low-sugar coffee line with a Rp250,000,000 budget ceiling.",
    campaignObjectives: [
      "Generate awareness and product trial among 20-32 urban commuters",
      "Establish KOVA Light as great-tasting low-sugar RTD coffee without clinical health claims",
    ],
    targetAudience:
      "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
    creativeDirections: [
      {
        id: "dir_01",
        title: "3 PM Tanpa Drama (3 PM Without the Crash)",
        tagline: "Kopi Beneran, Gula Ringan.",
        conceptSummary:
          "Own the 3 PM commuter and office slump moment with bold taste and lighter sugar.",
        rationale:
          "Directly connects the 5g sugar product fact to a relatable daily ritual without medical claims.",
        isRecommended: true,
      },
      {
        id: "dir_02",
        title: "Rute Fokus (The Commuter Focus Line)",
        tagline: "Teman Perjalanan, Rasanya Pas.",
        conceptSummary:
          "Turn MRT, KRL, and TransJakarta transit corridors into interactive taste-discovery zones paired with creator commute diaries.",
        rationale:
          "Captures urban Gen Z and young millennial commuters during their daily transit routine with high-visibility sampling.",
        isRecommended: false,
      },
    ],
    selectedDirection: {
      id: "dir_01",
      title: "3 PM Tanpa Drama (3 PM Without the Crash)",
      tagline: "Kopi Beneran, Gula Ringan.",
      conceptSummary:
        "Own the 3 PM commuter and office slump moment with bold taste and lighter sugar.",
      rationale:
        "Directly connects the 5g sugar product fact to a relatable daily ritual without medical claims.",
      isRecommended: true,
    },
    keyMessages: [
      "Real Indonesian coffee character with lighter sugar for your afternoon rhythm",
      "Designed for daily commuters who want full flavor without heavy sweetness",
    ],
    activationIdeas: [
      "3 PM Commuter Drop sampling booths near MRT Dukuh Atas and Blok M",
      "Office Desk Rescue kits paired with micro-creator unboxings",
    ],
    channelStrategy: [
      {
        channel: "TikTok & Instagram Reels",
        role: "Reach & Cultural Relatability",
        tactics: ["3 PM POV creator skits", "Taste-test street interviews"],
      },
    ],
    creatorStrategy:
      "Partner with 15 mid-tier Jakarta/Surabaya lifestyle & commuter creators focusing on authentic taste reactions.",
    sixWeekTimeline: [
      {
        weekNumber: 1,
        phaseName: "Pre-Launch Teaser & Creator Seeding",
        milestones: ["Finalize creator briefs", "Dispatch seeding kits"],
        deliverables: ["15 creator seeding boxes", "Teaser short-form edits"],
      },
      {
        weekNumber: 2,
        phaseName: "Hero Launch & 3 PM Digital Takeover",
        milestones: ["Launch hero reels"],
        deliverables: ["Hero launch video", "Paid social flight 1"],
      },
      {
        weekNumber: 3,
        phaseName: "Commuter Sampling Activation — Jakarta",
        milestones: ["MRT hub activation"],
        deliverables: ["Sampling booth collateral"],
      },
      {
        weekNumber: 4,
        phaseName: "Creator Duets & Surabaya Expansion",
        milestones: ["Surabaya coffee community pop-up"],
        deliverables: ["Wave 2 creator content"],
      },
      {
        weekNumber: 5,
        phaseName: "Retail Trial Push",
        milestones: ["Minimarket bundle promo"],
        deliverables: ["POS callout assets"],
      },
      {
        weekNumber: 6,
        phaseName: "Retargeting & Campaign Wrap Review",
        milestones: ["Performance synthesis"],
        deliverables: ["Post-campaign learnings deck"],
      },
    ],
    budgetBreakdown: [
      {
        category: "Creator Partnerships & Seeding",
        amountIdr: 85000000,
        notes: "15 mid-tier creators + seeding production",
      },
      {
        category: "Commuter Sampling & Pop-Up Activations",
        amountIdr: 75000000,
        notes: "Jakarta & Surabaya commuter hubs",
      },
      {
        category: "Paid Social Amplification",
        amountIdr: 50000000,
        notes: "TikTok & Meta targeted commuter dayparting",
      },
      {
        category: "Content Production & Design",
        amountIdr: 25000000,
        notes: "Short-form video & POS assets",
      },
    ],
    totalBudgetIdr: 235000000,
    kpis: [
      "12,000+ cans sampled across commuter hubs",
      "2.5M+ organic & paid video views across Jakarta and Surabaya target demo",
    ],
    risks: [
      {
        risk: "Creators inadvertently improvising health or weight-loss claims",
        mitigation:
          "Strict creator do/don't script checklist prohibiting medical or clinical claims",
      },
    ],
    sourceReferences: [
      {
        id: "ref_01",
        sourceType: "document_fact",
        claimOrDecision:
          "KOVA Light uses 5g cane sugar per 200ml can and has a Rp250,000,000 budget ceiling.",
        referenceId: "fact_01",
        citationNote: "KOVA-Brand-Brief-2026.pdf, Page 2",
      },
      {
        id: "ref_02",
        sourceType: "user_decision",
        claimOrDecision:
          "Selected '3 PM Tanpa Drama' creative direction with Rp235,000,000 total budget (leaving Rp15,000,000 buffer under ceiling).",
        referenceId: "dir_01",
      },
      {
        id: "ref_03",
        sourceType: "assumption",
        claimOrDecision:
          "MRT commuter hub sampling permits can be cleared within 10 business days prior to Week 3.",
        citationNote: "Flagged for team validation during meeting",
      },
    ],
    nextSteps: [
      "Review proposal with Creative Team Lead in scheduled meeting",
      "Confirm MRT sampling permit lead times with activation vendor",
    ],
    createdAt: "2026-10-17T15:25:00.000Z",
    updatedAt: "2026-10-17T15:25:00.000Z",
  });
