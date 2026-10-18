import { DocumentFact, DocumentMetadata } from "@/contracts/document";
import { Meeting } from "@/contracts/meeting";
import {
  PreparationProposal,
  PreparationProposalSchema,
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
              `- [${f.id} | ${f.category}] ${f.statement}${
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

  const budgetText =
    meeting.budgetCeilingIdr !== undefined
      ? `Rp${meeting.budgetCeilingIdr.toLocaleString("en-US")} IDR (strict ceiling, not mandatory full spend)`
      : "Not specified in brief yet (flag as open question if needed)";

  return [
    "You are WOPS! (Work Out Problems Swiftly) — 'Less Chit. More Chat.'",
    "You are a proactive, voice-first AI thinking partner helping an assigned participant prepare BEFORE a team meeting.",
    "Keep spoken responses concise, natural, warm, and tailored to the participant's specific role.",
    "",
    "=== PARTICIPANT PROFILE ===",
    `Name: ${session.participantName ?? "Team Member"}`,
    `Role: ${session.participantRole}`,
    `Participant ID: ${session.participantId}`,
    "",
    "=== MEETING CONTEXT ===",
    `Title: ${meeting.title}`,
    `Client: ${meeting.clientName} (Note: KOVA is a fictional Indonesian RTD coffee brand for demonstration)`,
    `Project: ${meeting.projectName}`,
    `Meeting Objective: ${meeting.meetingObjective}`,
    `Client Objective: ${meeting.clientObjective ?? "To be confirmed from brief"}`,
    `Target Audience: ${meeting.targetAudience ?? "To be confirmed from brief"}`,
    `Budget Ceiling: ${budgetText}`,
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
    "4. Guide the human participant through options tailored to their role rather than taking over decision ownership.",
  ].join("\n");
}

export function buildDocumentExtractionPrompt(
  meeting: Meeting,
  fileName: string,
  documentId: string,
): string {
  return [
    `Analyze the attached client document (${fileName}) for meeting "${meeting.title}" (${meeting.clientName} — ${meeting.projectName}).`,
    "Extract:",
    "1. A concise 1-3 sentence executive summary of the document.",
    "2. Up to 8 concrete, verifiable facts (`extractedFacts`).",
    "Each fact must include:",
    `- id: string (e.g., "${documentId}_fact_01")`,
    "- statement: string",
    "- category: one of 'client_objective' | 'requirement' | 'target_audience' | 'budget' | 'constraint' | 'deliverable' | 'timeline' | 'other'",
    "- provenance: 'extracted'",
    "- pageOrSection: string (e.g., 'Page 2 — Product Specs')",
    `- sourceDocumentId: "${documentId}"`,
    `- sourceDocumentName: "${fileName}"`,
    "- confirmedByLead: false",
    "Do NOT invent claims that are not present in the document.",
    "Return strict JSON matching: { \"summary\": string, \"extractedFacts\": Array<...> }",
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
    "Synthesize a complete, role-aware personal PreparationProposal JSON object for the following participant's completed preparation session.",
    "",
    `Participant: ${session.participantName ?? session.participantId} (${session.participantRole})`,
    `Meeting JSON: ${JSON.stringify(meeting)}`,
    `Extracted Document Facts: ${JSON.stringify(keyFacts)}`,
    `Confirmed Session Decisions: ${JSON.stringify(session.confirmedDecisions)}`,
    `Session Transcripts: ${JSON.stringify(session.transcripts)}`,
    `Open Questions: ${JSON.stringify(session.openQuestions)}`,
    `Preferred Concept ID: ${selectedConceptId ?? session.selectedConceptId ?? "dir_01"}`,
    `Additional Notes: ${additionalNotes ?? "None"}`,
    "",
    "STRICT REQUIREMENTS:",
    "1. KOVA is a fictional Indonesian ready-to-drink coffee brand. Do NOT include any unsupported medical or clinical health claims.",
    "2. Tailor title, summary, keyIdeas, directions, recommendations, talkingPoints, and roleSections to the participant's specific role.",
    "3. Every item in sharedFacts[] must specify sourceType as 'document_fact', 'user_decision', or 'assumption'.",
    "4. Output valid JSON matching PreparationProposalSchema.",
  ].join("\n");
}

export function buildFallbackCampaignProposal(params: {
  proposalId: string;
  meeting: Meeting;
  keyFacts: DocumentFact[];
  session: PreparationSession;
  selectedConceptId?: string;
  additionalNotes?: string;
}): PreparationProposal {
  const {
    proposalId,
    meeting,
    keyFacts,
    session,
    selectedConceptId,
    additionalNotes,
  } = params;

  const now = new Date().toISOString();
  const roleLower = session.participantRole.toLowerCase();
  const isDesigner =
    roleLower.includes("designer") ||
    roleLower.includes("brand") ||
    roleLower.includes("art") ||
    roleLower.includes("visual");

  const chosenId =
    selectedConceptId ??
    session.selectedConceptId ??
    (isDesigner ? "dir_designer_01" : "dir_01");

  const sharedFacts =
    keyFacts.length > 0
      ? keyFacts.map((fact, idx) => ({
          id: `ref_${idx + 1}`,
          sourceType: "document_fact" as const,
          claimOrDecision: fact.statement,
          referenceId: fact.id,
          citationNote: [fact.sourceDocumentName, fact.pageOrSection]
            .filter(Boolean)
            .join(" · "),
        }))
      : [
          {
            id: "ref_01",
            sourceType: "document_fact" as const,
            claimOrDecision:
              "KOVA Light contains 5g cane sugar per 200ml can and uses a 100% Indonesian Arabica-Robusta blend.",
            referenceId: "fact_01",
            citationNote: "KOVA-Brand-Brief-2026.pdf · Page 2 — Product Specs",
          },
        ];

  const confirmedDecisions =
    session.confirmedDecisions.length > 0
      ? session.confirmedDecisions.map((dec) => ({
          id: dec.id,
          stage: dec.stage,
          topic: dec.topic,
          decision: dec.decision,
          rationale:
            dec.rationale ?? `Confirmed during ${dec.stage} stage`,
          timestamp: dec.timestamp,
        }))
      : [
          {
            id: "dec_01",
            stage: "UNDERSTAND",
            topic: isDesigner
              ? "Brand Aesthetic Direction"
              : "Corridor Targeting",
            decision: isDesigner
              ? "Premium modern cold-brew visual language without clinical imagery"
              : "Prioritize MRT/KRL transit corridors in Jakarta and Surabaya",
            rationale: isDesigner
              ? "Complies strictly with brief guardrails against medical claims while elevating shelf appeal"
              : "Highest concentration of target 20-32 commuter demographic",
            timestamp: now,
          },
        ];

  if (isDesigner) {
    return PreparationProposalSchema.parse({
      id: proposalId,
      meetingId: meeting.id,
      participantId: session.participantId,
      participantRole: session.participantRole,
      participantName: session.participantName ?? "Bima Wijaya",
      sessionId: session.id,
      title: `${meeting.clientName} — Creative Direction & Visual Identity System`,
      summary:
        "Creative direction preparation proposing the 'Warm Terracotta & Fresh Mint' color system, minimalist physical sampling booth language, and cohesive digital asset deliverables that celebrate premium coffee taste without looking clinical.",
      status: "completed",
      keyIdeas: [
        "Anchor the visual identity in 'Warm Terracotta & Fresh Mint'—evoking rich Indonesian coffee soil and crisp lightness without looking like a clinical diet product.",
        "Design modular, eco-conscious physical sampling kiosks using light timber and matte recyclable aluminum to fit transit concourse guidelines.",
        "Establish a high-contrast typography hierarchy: bold modern sans for coffee appetite appeal, delicate subtext for the '5g cane sugar' spec.",
      ],
      directions: [
        {
          id: chosenId,
          title: "Warm Terracotta & Fresh Mint",
          tagline: "Earthy Coffee Heritage, Refreshing Modern Pace.",
          summary:
            "Combines deep roasted espresso hues with crisp eucalyptus mint and warm paper textures for a premium, non-diet aesthetic.",
          rationale:
            "Eliminates the cold medical feel of conventional diet drinks while standing out vibrantly against grey transit station concourses.",
          isRecommended: true,
        },
      ],
      recommendations: [
        {
          id: "rec_designer_01",
          topic: "Visual Packaging Hierarchy",
          recommendation:
            "Place 'Arabica-Robusta Blend' in prominent 24pt display font, and position '5g Gula Tebu' in an elegant lower pill badge.",
          rationale:
            "Signals taste supremacy immediately to avoid the 78% 'diet equals watery' bias noted in the client brief.",
          isParticipantConfirmed: true,
        },
        {
          id: "rec_designer_02",
          topic: "Sampling Booth Materials",
          recommendation:
            "Construct transit sampling counters from modular FSC-certified timber frames with interchangeable fabric wraps.",
          rationale:
            "Allows quick overnight transit station setup within strict 2-hour MRT engineering windows.",
          isParticipantConfirmed: true,
        },
      ],
      sharedFacts,
      confirmedDecisions,
      talkingPoints: [
        "Review the physical booth footprint with Nadia to ensure queue flow doesn't block turnstiles at Bundaran HI and Dukuh Atas MRT stations.",
        "Check with Team Lead whether the client has finalized the 200ml aluminum can die-line and supplier Pantone specs.",
        ...(additionalNotes ? [additionalNotes] : []),
      ],
      openQuestions: [
        ...session.openQuestions,
        "Can packaging manufacturer provide matte aluminum sample proofs before the team alignment meeting?",
      ],
      assumptions: [
        "Packaging supplier can achieve matte tactile finish without increasing unit packaging cost.",
        "MRT Jakarta concourses permit freestanding 2m x 1.5m modular wooden sampling counters.",
      ],
      risks: [
        {
          risk: "Matte finish on can sleeves scuffing during bulk carton transit to Surabaya.",
          mitigation:
            "Request UV protective coating sample tests from the packaging vendor.",
        },
      ],
      constraints: [
        "Visual layouts must not incorporate medical cross, calorie-counter, or clinical iconography.",
        "Asset deliverables must be scalable to vertical 9:16, square 1:1, and transit outdoor 16:9 displays.",
      ],
      missingInfo: ["Approved 3D CAD files for the 200ml slim can format."],
      roleSections: [
        {
          title: "Required Creative Asset Deliverables",
          description: "Visual production scope for the 6-week launch campaign",
          items: [
            "Social Motion Kit: 8 animated story/reel intro templates and lower-third stickers.",
            "Transit Hub Display Graphics: High-res outdoor banners (16:9) for Jakarta MRT concourse LED screens.",
            "Physical Booth Architecture: Modular timber counter blueprints, barista apron embroidery, and branded recycling bins.",
            "Creator Toolkit: Typography guidance, color hex codes (#C84B31, #3A6B56), and logo exclusion zones.",
          ],
        },
      ],
      createdAt: session.endedAt ?? now,
      updatedAt: now,
    });
  }

  const ceiling = meeting.budgetCeilingIdr ?? 250000000;
  const targetTotal =
    ceiling >= 250000000 ? 235000000 : Math.floor(ceiling * 0.94);
  const reserve = ceiling - targetTotal;

  return PreparationProposalSchema.parse({
    id: proposalId,
    meetingId: meeting.id,
    participantId: session.participantId,
    participantRole: session.participantRole,
    participantName: session.participantName ?? "Nadia Kusuma",
    sessionId: session.id,
    title: `${meeting.clientName} — Campaign Strategy & Channel Allocation`,
    summary: `Strategic pre-meeting preparation exploring commuter transit corridors in Jakarta and Surabaya, taste-first positioning, and a Rp${targetTotal.toLocaleString("en-US")} channel allocation under the Rp${ceiling.toLocaleString("en-US")} ceiling with a Rp${reserve.toLocaleString("en-US")} contingency reserve.`,
    status: "completed",
    keyIdeas: [
      "Prioritize high-density urban transit corridors (Jakarta MRT/KRL and Surabaya transit) for 20-32 young commuters.",
      "Adopt 'Real Taste, Lighter Pace' hook: lead with authentic Arabica-Robusta taste first, with low-sugar as the everyday lifestyle benefit.",
      `Deploy a Rp${targetTotal.toLocaleString("en-US")} channel split across creator seeding and commuter sampling, preserving a Rp${reserve.toLocaleString("en-US")} contingency reserve under the ceiling.`,
    ],
    directions: [
      {
        id: chosenId,
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
        recommendation: `Hold a Rp${reserve.toLocaleString("en-US")} unallocated reserve under the Rp${ceiling.toLocaleString("en-US")} budget ceiling.`,
        rationale:
          "Covers potential transit permit overtime fees or creator asset revisions without exceeding client brief ceiling.",
        isParticipantConfirmed: true,
      },
    ],
    sharedFacts,
    confirmedDecisions,
    talkingPoints: [
      "Walk the team through the Rp120M creator / Rp80M sampling split to check alignment with Bima's physical asset requirements.",
      "Clarify transit sampling permit lead times (MRT Jakarta & KRL) with the Team Lead before committing launch week dates.",
      ...(additionalNotes ? [additionalNotes] : []),
    ],
    openQuestions: [
      ...session.openQuestions,
      "Who manages on-ground cold storage and inventory replenishment at Jakarta MRT sampling hubs?",
    ],
    assumptions: [
      "MRT and KRL transit station sampling permits can be secured within 10-14 business days.",
      "TikTok Spark ad whitelisting permits creator turnaround within 5 days of product delivery.",
    ],
    risks: [
      {
        risk: "Creator content veering into clinical or weight-loss claims during live streaming.",
        mitigation:
          "Mandatory compliance checklist and pre-approval gate for all sponsored video drafts.",
      },
    ],
    constraints: [
      "Strict zero clinical or medical claims constraint (Client Brief Guardrail).",
      `Total spend cannot exceed Rp${ceiling.toLocaleString("en-US")} across all 6 weeks.`,
    ],
    missingInfo: [
      "Confirmed list of primary MRT stations permitted for beverage sampling.",
    ],
    roleSections: [
      {
        title: "Proposed Channel & Budget Breakdown",
        description: `Preliminary allocation under Rp${ceiling.toLocaleString("en-US")} ceiling with contingency reserve`,
        items: [
          "TikTok Spark Ads & Creator Seeding: Rp120,000,000 (15 lifestyle creators)",
          "Commuter Station Sampling Hubs: Rp80,000,000 (Jakarta MRT + Surabaya Gubeng)",
          "Meta Whitelisting & Digital Amplification: Rp35,000,000",
          `Safety Contingency Reserve: Rp${reserve.toLocaleString("en-US")} (Remaining under ceiling)`,
        ],
      },
    ],
    createdAt: session.endedAt ?? now,
    updatedAt: now,
  });
}
