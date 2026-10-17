import { DocumentFact, DocumentMetadata } from "@/contracts/document";
import { Meeting } from "@/contracts/meeting";
import {
  CampaignProposal,
  CampaignProposalSchema,
  CreativeDirection,
} from "@/contracts/proposal";
import { PreparationSession } from "@/contracts/session";
import { STAGE_DEFINITIONS } from "./stage-machine";

export function buildLiveSystemInstruction(params: {
  meeting: Meeting;
  documents: DocumentMetadata[];
  keyFacts: DocumentFact[];
  session: PreparationSession;
}): string {
  const { meeting, keyFacts, session } = params;
  const stageDef = STAGE_DEFINITIONS[session.currentStage];

  const factsBlock =
    keyFacts.length > 0
      ? keyFacts
          .map(
            (f) =>
              `- [${f.id}] ${f.statement}${
                f.pageOrSection ? ` (${f.pageOrSection})` : ""
              }`,
          )
          .join("\n")
      : "- No uploaded document facts yet; rely on the meeting brief and flag unverified points as assumptions.";

  const decisionsBlock =
    session.confirmedDecisions.length > 0
      ? session.confirmedDecisions
          .map((d) => `- [${d.stage}] ${d.topic}: ${d.decision}`)
          .join("\n")
      : "- None recorded yet.";

  return [
    "You are WOPS! (Work Out Problems Swiftly) — 'Less Chit. More Chat.'",
    "You are a proactive, voice-first AI thinking partner helping a team member prepare BEFORE a meeting.",
    "Keep spoken responses concise, natural, warm, and focused on structured ideation.",
    "",
    "=== MEETING CONTEXT ===",
    `Title: ${meeting.title}`,
    `Client: ${meeting.clientName} (Note: KOVA is a fictional Indonesian RTD coffee brand for demonstration)`,
    `Project: ${meeting.projectName}`,
    `Meeting Objective: ${meeting.meetingObjective}`,
    `Client Objective: ${meeting.clientObjective}`,
    `Target Audience: ${meeting.targetAudience}`,
    `Budget Ceiling: Rp${meeting.budgetCeilingIdr.toLocaleString("en-US")} IDR (strict ceiling, not mandatory full spend)`,
    `Requirements: ${meeting.clientRequirements.join("; ") || "None specified"}`,
    `Constraints: ${meeting.constraints.join("; ") || "None specified"}`,
    "",
    "=== DOCUMENTED FACTS (GROUNDING SOURCE) ===",
    factsBlock,
    "",
    `=== CURRENT STAGE: ${stageDef.stage} ===`,
    `Core Question: ${stageDef.coreQuestion}`,
    `Expected Outcome: ${stageDef.expectedOutcome}`,
    "Facilitation Focus:",
    ...stageDef.facilitationFocus.map((item) => `- ${item}`),
    "",
    "=== CONFIRMED DECISIONS SO FAR ===",
    decisionsBlock,
    "",
    "=== NON-NEGOTIABLE GUARDRAILS ===",
    "1. Never fabricate medical, clinical, or weight-loss health claims for KOVA.",
    "2. Distinguish clearly between documented facts (`document_fact`), human choices (`user_decision`), and working assumptions (`assumption`).",
    "3. Keep total proposed spend at or below the budget ceiling.",
    "4. Guide the human planner through options rather than taking over decision ownership.",
  ].join("\n");
}

export function buildDocumentExtractionPrompt(
  meeting: Meeting,
  fileName: string,
): string {
  return [
    `Analyze the attached client document (${fileName}) for meeting "${meeting.title}" (${meeting.clientName} — ${meeting.projectName}).`,
    "Extract:",
    "1. A concise 1-3 sentence executive summary of the document.",
    "2. Up to 8 concrete, verifiable facts (`extractedFacts`) with `id` (e.g., `fact_01`, `fact_02`), `statement`, and `pageOrSection`.",
    "Do NOT invent claims that are not present in the document.",
    "Return strict JSON matching: { \"summary\": string, \"extractedFacts\": Array<{ \"id\": string, \"statement\": string, \"pageOrSection\"?: string }> }",
  ].join("\n");
}

export function buildProposalGenerationPrompt(params: {
  meeting: Meeting;
  documents: DocumentMetadata[];
  keyFacts: DocumentFact[];
  session: PreparationSession;
  selectedConceptId?: string;
  additionalNotes?: string;
}): string {
  const {
    meeting,
    keyFacts,
    session,
    selectedConceptId,
    additionalNotes,
  } = params;

  return [
    "Synthesize a complete, grounded Creative Campaign Proposal JSON object for the following meeting and preparation session.",
    "",
    `Meeting JSON: ${JSON.stringify(meeting)}`,
    `Extracted Document Facts: ${JSON.stringify(keyFacts)}`,
    `Confirmed Session Decisions: ${JSON.stringify(session.confirmedDecisions)}`,
    `Session Transcripts: ${JSON.stringify(session.transcripts)}`,
    `Open Questions: ${JSON.stringify(session.openQuestions)}`,
    `Preferred Concept ID: ${selectedConceptId ?? session.selectedConceptId ?? "dir_01"}`,
    `Additional Notes: ${additionalNotes ?? "None"}`,
    "",
    "STRICT REQUIREMENTS:",
    `1. totalBudgetIdr MUST be an integer <= ${meeting.budgetCeilingIdr} and MUST equal the sum of budgetBreakdown[].amountIdr.`,
    "2. sixWeekTimeline MUST contain exactly 6 items (weekNumber 1 through 6).",
    "3. KOVA is a fictional Indonesian ready-to-drink coffee brand. Do NOT include any unsupported medical or clinical health claims.",
    "4. Every item in sourceReferences[] must specify sourceType as 'document_fact', 'user_decision', or 'assumption'.",
    "5. Output valid JSON matching the CampaignProposal schema (excluding id, meetingId, sessionId, createdAt, updatedAt which the server will attach).",
  ].join("\n");
}

export function buildFallbackCampaignProposal(params: {
  proposalId: string;
  meeting: Meeting;
  keyFacts: DocumentFact[];
  session: PreparationSession;
  selectedConceptId?: string;
  additionalNotes?: string;
}): CampaignProposal {
  const {
    proposalId,
    meeting,
    keyFacts,
    session,
    selectedConceptId,
    additionalNotes,
  } = params;

  const chosenId =
    selectedConceptId ?? session.selectedConceptId ?? "dir_01";

  const defaultDirections: CreativeDirection[] = [
    {
      id: "dir_01",
      title: "3 PM Tanpa Drama (3 PM Without the Crash)",
      tagline: "Kopi Beneran, Gula Ringan.",
      conceptSummary:
        "Own the 3 PM commuter and office slump moment in Jakarta and Surabaya with bold Indonesian coffee flavor and lighter sugar.",
      rationale:
        "Directly connects the 5g cane sugar product specification to a high-frequency daily commuter ritual without making clinical or medical health claims.",
      isRecommended: chosenId === "dir_01",
    },
    {
      id: "dir_02",
      title: "Rute Fokus (The Commuter Focus Line)",
      tagline: "Teman Perjalanan, Rasanya Pas.",
      conceptSummary:
        "Turn MRT, KRL, and TransJakarta transit corridors into interactive taste-discovery zones paired with creator commute diaries.",
      rationale:
        "Captures urban Gen Z and young millennial commuters during their daily transit routine with high-visibility sampling.",
      isRecommended: chosenId === "dir_02",
    },
    {
      id: "dir_03",
      title: "Meja Kerja Segar (Afternoon Desk Reset)",
      tagline: "Lanjut Kerja, Tetap Nikmat.",
      conceptSummary:
        "Co-working and office district seeding drops where teams unlock group tasting kits for their afternoon brainstorms.",
      rationale:
        "Drives peer-to-peer trial among young professionals in CBD offices while staying well within the Rp250,000,000 ceiling.",
      isRecommended: chosenId === "dir_03",
    },
  ];

  let selectedDirection =
    defaultDirections.find((d) => d.id === chosenId) ?? defaultDirections[0];

  // Ensure the selected direction exists in creativeDirections and is marked recommended
  const creativeDirections = defaultDirections.map((d) => ({
    ...d,
    isRecommended: d.id === selectedDirection.id,
  }));
  selectedDirection = { ...selectedDirection, isRecommended: true };

  // Scale budget strictly below or equal to meeting.budgetCeilingIdr
  const ceiling = meeting.budgetCeilingIdr > 0 ? meeting.budgetCeilingIdr : 250000000;
  const targetTotal =
    ceiling >= 250000000 ? 235000000 : Math.floor(ceiling * 0.94);

  const c1 = Math.floor(targetTotal * 0.36);
  const c2 = Math.floor(targetTotal * 0.32);
  const c3 = Math.floor(targetTotal * 0.21);
  const c4 = targetTotal - (c1 + c2 + c3);

  const budgetBreakdown = [
    {
      category: "Creator Partnerships & Seeding",
      amountIdr: c1,
      notes: "15 mid-tier Jakarta & Surabaya commuter/lifestyle creators + seeding kits",
    },
    {
      category: "Commuter Sampling & Pop-Up Activations",
      amountIdr: c2,
      notes: "3 PM sampling booths at MRT Dukuh Atas, Blok M, and Surabaya transit hubs",
    },
    {
      category: "Paid Social Amplification",
      amountIdr: c3,
      notes: "TikTok & Instagram Reels dayparted between 14:00-17:00 WIB",
    },
    {
      category: "Content Production & POS Collateral",
      amountIdr: c4,
      notes: "Short-form video assets and convenience store trial display materials",
    },
  ];

  const totalBudgetIdr = budgetBreakdown.reduce(
    (sum, item) => sum + item.amountIdr,
    0,
  );

  const firstFact = keyFacts[0];
  const sourceReferences = [
    {
      id: "ref_01",
      sourceType: "document_fact" as const,
      claimOrDecision:
        firstFact?.statement ??
        `${meeting.clientName} (${meeting.projectName}) operates under a strict budget ceiling of Rp${meeting.budgetCeilingIdr.toLocaleString("en-US")} with no unsupported medical claims.`,
      referenceId: firstFact?.id ?? "fact_01",
      citationNote: firstFact?.pageOrSection ?? "Client Brief & Meeting Spec",
    },
    ...session.confirmedDecisions.map((dec, idx) => ({
      id: `ref_dec_${idx + 1}`,
      sourceType: dec.sourceType,
      claimOrDecision: `${dec.topic}: ${dec.decision}`,
      referenceId: dec.id,
      citationNote: dec.rationale ?? `Confirmed during ${dec.stage} stage`,
    })),
    {
      id: "ref_dir",
      sourceType: "user_decision" as const,
      claimOrDecision: `Selected '${selectedDirection.title}' (${selectedDirection.id}) with total budget Rp${totalBudgetIdr.toLocaleString("en-US")} IDR (leaving Rp${(ceiling - totalBudgetIdr).toLocaleString("en-US")} IDR buffer under ceiling).`,
      referenceId: selectedDirection.id,
      citationNote: additionalNotes ?? "Confirmed for team review",
    },
    {
      id: "ref_assumption_01",
      sourceType: "assumption" as const,
      claimOrDecision:
        "Transit hub and convenience store sampling permits in Jakarta and Surabaya can be cleared within 10 business days prior to Week 3.",
      citationNote: "Flagged as working assumption for team alignment",
    },
  ];

  const now = new Date().toISOString();

  return CampaignProposalSchema.parse({
    id: proposalId,
    meetingId: meeting.id,
    sessionId: session.id,
    executiveSummary: `A 6-week launch campaign for ${meeting.projectName} centered on "${selectedDirection.title}" — driving product trial among ${meeting.targetAudience} while keeping total spend at Rp${totalBudgetIdr.toLocaleString("en-US")} IDR (under the Rp${ceiling.toLocaleString("en-US")} IDR ceiling).`,
    clientContext: `${meeting.clientName} (fictional Indonesian RTD coffee brand) is preparing ${meeting.projectName}. Objective: ${meeting.clientObjective}.`,
    campaignObjectives: [
      meeting.clientObjective,
      meeting.meetingObjective,
      "Establish strong taste perception and afternoon ritual relevance without clinical or medical health claims",
    ],
    targetAudience: meeting.targetAudience,
    creativeDirections,
    selectedDirection,
    keyMessages: [
      "Real Indonesian Arabica-Robusta coffee character with lighter sugar for your 3 PM rhythm",
      "Designed for urban commuters who want full iced-coffee flavor without heavy afternoon sweetness",
    ],
    activationIdeas: [
      "3 PM Commuter Drop sampling booths near MRT Dukuh Atas, Blok M, and Surabaya Gubeng",
      "Office Desk Rescue tasting kits paired with authentic creator reaction reels",
      "Convenience store bundle trial mechanics during afternoon rush hours",
    ],
    channelStrategy: [
      {
        channel: "TikTok & Instagram Reels",
        role: "Reach & Cultural Relatability",
        tactics: [
          "3 PM commuter POV skits",
          "Blind taste-test street interviews in Jakarta & Surabaya",
        ],
      },
      {
        channel: "Commuter Transit & Convenience Retail OOH",
        role: "High-Frequency Trial Trigger",
        tactics: [
          "QR-enabled sampling vouchers redeemable at nearby minimarkets",
          "Afternoon daypart digital screens at transit hubs",
        ],
      },
    ],
    creatorStrategy:
      "Partner with 15 mid-tier Jakarta and Surabaya commuter, work-life, and coffee-culture creators focusing on genuine taste reactions and strict compliance with no-health-claim guidelines.",
    sixWeekTimeline: [
      {
        weekNumber: 1,
        phaseName: "Pre-Launch Teaser & Creator Seeding",
        milestones: [
          "Lock creator compliance briefs",
          "Dispatch 3 PM Desk Rescue seeding kits",
        ],
        deliverables: [
          "15 creator seeding packages",
          "Teaser short-form video cuts",
        ],
      },
      {
        weekNumber: 2,
        phaseName: "Hero Digital Launch & 3 PM Daypart Takeover",
        milestones: ["Publish hero reels", "Activate dayparted paid social"],
        deliverables: ["Hero campaign film", "Paid social flight 1"],
      },
      {
        weekNumber: 3,
        phaseName: "Jakarta Commuter Hub Sampling",
        milestones: ["MRT Dukuh Atas & Blok M pop-up sampling"],
        deliverables: ["Sampling booth experience", "Live commuter vox-pop reels"],
      },
      {
        weekNumber: 4,
        phaseName: "Surabaya Expansion & Creator Duets",
        milestones: ["Surabaya office & transit activation"],
        deliverables: ["Wave 2 creator content", "Regional promo codes"],
      },
      {
        weekNumber: 5,
        phaseName: "Convenience Store Trial Push",
        milestones: ["Minimarket afternoon bundle promotion"],
        deliverables: ["In-store POS wobblers", "Redemption tracking report"],
      },
      {
        weekNumber: 6,
        phaseName: "Retargeting & Campaign Wrap Review",
        milestones: ["Synthesize trial & repeat-intent metrics"],
        deliverables: ["Post-campaign learnings & scale recommendation deck"],
      },
    ],
    budgetBreakdown,
    totalBudgetIdr,
    kpis: [
      "12,000+ cans sampled across Jakarta and Surabaya commuter hubs",
      "2.5M+ organic and paid video views among 20-32 urban commuters",
      "8,000+ convenience store voucher redemptions within 6 weeks",
    ],
    risks: [
      {
        risk: "Creators inadvertently improvising medical, clinical, or weight-loss claims when describing low sugar",
        mitigation:
          "Enforce a mandatory creator script checklist and pre-publish review prohibiting medical or health claims",
      },
      {
        risk: "Transit station sampling permit delays in Jakarta or Surabaya",
        mitigation:
          "Secure backup co-working space and office lobby partner venues by Week 1",
      },
    ],
    sourceReferences,
    nextSteps: [
      "Review recommended creative direction and budget allocation with Creative Team Lead",
      "Confirm transit hub sampling permit lead times with activation vendor",
      ...(session.openQuestions.length > 0
        ? session.openQuestions.map((q) => `Resolve open question: ${q}`)
        : []),
    ],
    createdAt: now,
    updatedAt: now,
  });
}
