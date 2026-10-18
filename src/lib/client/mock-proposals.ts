import {
  PreparationProposalSchema,
  type GenerateProposalRequest,
  type PreparationProposal,
} from "@/contracts/proposal";
import type { PreparationSession } from "@/contracts/session";

const PROPOSALS_STORAGE_KEY = "wops:mock_proposals_v1";

export function loadProposalsFromStorage(): Record<string, PreparationProposal> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PreparationProposal>;
  } catch {
    return {};
  }
}

export function saveProposalsToStorage(
  proposals: Record<string, PreparationProposal>
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
  } catch {
    // Storage quota or private browsing
  }
}

/**
 * Builds a deterministic personal preparation proposal for Nadia Kusuma (Campaign Planner).
 */
export function buildPlannerProposal(
  session: PreparationSession
): PreparationProposal {
  const now = new Date().toISOString();
  return PreparationProposalSchema.parse({
    id: `prop_${session.id}_planner`,
    meetingId: session.meetingId,
    participantId: session.participantId,
    participantRole: session.participantRole,
    participantName: session.participantName,
    sessionId: session.id,
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
        id: "dir_planner_01",
        title: "Real Taste, Lighter Pace",
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
        id: "rec_planner_01",
        topic: "Channel Mix",
        recommendation:
          "Allocate Rp120M to TikTok creator seeding, Rp80M to commuter transit sampling, and Rp35M to paid social.",
        rationale:
          "Balances wide viral reach with high-touch physical product trial where commuters gather daily.",
        isParticipantConfirmed: true,
      },
      {
        id: "rec_planner_02",
        topic: "Contingency Safety",
        recommendation:
          "Hold a Rp15M unallocated reserve under the Rp250M budget ceiling.",
        rationale:
          "Covers potential transit permit overtime fees or creator asset revisions without exceeding client brief ceiling.",
        isParticipantConfirmed: true,
      },
    ],
    confirmedDecisions: session.confirmedDecisions.map((dec) => ({
      id: dec.id,
      stage: dec.stage,
      topic: dec.topic,
      decision: dec.decision,
      rationale: dec.rationale,
      timestamp: dec.timestamp,
    })),
    sharedFacts: [
      {
        id: "fact_ref_01",
        sourceType: "document_fact",
        claimOrDecision:
          "KOVA Light contains 5g cane sugar per 200ml can and uses a 100% Indonesian Arabica-Robusta blend.",
        referenceId: "fact_01",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 2 — Product Specs",
      },
      {
        id: "fact_ref_02",
        sourceType: "document_fact",
        claimOrDecision:
          "Primary launch cities are Jakarta and Surabaya, focusing on MRT/commuter transit corridors.",
        referenceId: "fact_02",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 3 — Market & Distribution",
      },
      {
        id: "fact_ref_03",
        sourceType: "document_fact",
        claimOrDecision:
          "78% of 20–32 commuters avoid 'diet' coffee labels expecting a watery aftertaste.",
        referenceId: "fact_03",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 4 — Audience Research",
      },
      {
        id: "fact_ref_04",
        sourceType: "document_fact",
        claimOrDecision:
          "All copy and creator briefs must strictly avoid medical, clinical, or weight-loss claims.",
        referenceId: "fact_04",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 5 — Brand Guardrails",
      },
    ],
    talkingPoints: [
      "Walk the team through the Rp120M creator / Rp80M sampling split to check alignment with Bima's physical asset requirements.",
      "Clarify transit sampling permit lead times (MRT Jakarta & KRL) with the Team Lead before committing launch week dates.",
      "Discuss whether Surabaya on-ground activations should run concurrently or stagger one week after Jakarta.",
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
      {
        risk: "Sampling rush causing queue congestion during peak transit hours (4:30 PM - 6:30 PM).",
        mitigation:
          "Implement quick QR-code redemption to keep average consumer interaction under 30 seconds.",
      },
    ],
    constraints: [
      "Strict zero clinical or medical claims constraint (Client Brief Guardrail).",
      "Total spend cannot exceed Rp250,000,000 across all 6 weeks.",
    ],
    missingInfo: [
      "Confirmed list of primary MRT stations permitted for beverage sampling.",
    ],
    roleSections: [
      {
        title: "Proposed Channel & Budget Breakdown",
        description: "Preliminary allocation under Rp250M ceiling with contingency reserve",
        items: [
          "TikTok Spark Ads & Creator Seeding: Rp120,000,000 (15 lifestyle creators)",
          "Commuter Station Sampling Hubs: Rp80,000,000 (Jakarta MRT + Surabaya Gubeng)",
          "Meta Whitelisting & Digital Amplification: Rp35,000,000",
          "Safety Contingency Reserve: Rp15,000,000 (Remaining under Rp250M ceiling)",
        ],
      },
      {
        title: "Target Performance Metrics (KPIs)",
        description: "Hypotheses to discuss during team alignment meeting",
        items: [
          "Sampling Reach: 15,000 cans distributed to commuters across Jakarta & Surabaya.",
          "Digital Engagement: 2.5M cumulative video views on #RealTasteLighterPace.",
          "Acquisition: 4,500 QR scan signups for launch discount vouchers.",
        ],
      },
    ],
    createdAt: session.endedAt ?? now,
    updatedAt: now,
  });
}

/**
 * Builds a deterministic personal preparation proposal for Bima Wijaya (Senior Brand Designer).
 */
export function buildDesignerProposal(
  session: PreparationSession
): PreparationProposal {
  const now = new Date().toISOString();
  return PreparationProposalSchema.parse({
    id: `prop_${session.id}_designer`,
    meetingId: session.meetingId,
    participantId: session.participantId,
    participantRole: session.participantRole,
    participantName: session.participantName,
    sessionId: session.id,
    title: "KOVA Light — Creative Direction & Visual Identity System",
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
        id: "dir_designer_01",
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
    confirmedDecisions: session.confirmedDecisions.map((dec) => ({
      id: dec.id,
      stage: dec.stage,
      topic: dec.topic,
      decision: dec.decision,
      rationale: dec.rationale,
      timestamp: dec.timestamp,
    })),
    sharedFacts: [
      {
        id: "fact_ref_01",
        sourceType: "document_fact",
        claimOrDecision:
          "KOVA Light contains 5g cane sugar per 200ml can and uses a 100% Indonesian Arabica-Robusta blend.",
        referenceId: "fact_01",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 2 — Product Specs",
      },
      {
        id: "fact_ref_03",
        sourceType: "document_fact",
        claimOrDecision:
          "78% of 20–32 commuters avoid 'diet' coffee labels expecting a watery aftertaste.",
        referenceId: "fact_03",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 4 — Audience Research",
      },
      {
        id: "fact_ref_04",
        sourceType: "document_fact",
        claimOrDecision:
          "All copy and creator briefs must strictly avoid medical, clinical, or weight-loss claims.",
        referenceId: "fact_04",
        citationNote: "KOVA-Brand-Brief-2026.pdf · Page 5 — Brand Guardrails",
      },
    ],
    talkingPoints: [
      "Review the physical booth footprint with Nadia to ensure queue flow doesn't block turnstiles at Bundaran HI and Dukuh Atas MRT stations.",
      "Check with Team Lead whether the client has finalized the 200ml aluminum can die-line and supplier Pantone specs.",
      "Propose motion graphic templates for 9:16 vertical video so external creators maintain consistent typography.",
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
    missingInfo: [
      "Approved 3D CAD files for the 200ml slim can format.",
    ],
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
      {
        title: "Production Feasibility & Timeline",
        description: "Design considerations to coordinate with project schedule",
        items: [
          "Print Proof Turnaround: 5 working days required for physical packaging proof approval.",
          "Booth Fabrication: 8 working days for modular kiosk assembly in Jakarta and Surabaya.",
        ],
      },
    ],
    createdAt: session.endedAt ?? now,
    updatedAt: now,
  });
}

/**
 * Automatically synthesizes or updates the mock personal preparation proposal
 * when a session transitions to completed.
 */
export function mockGenerateProposalForCompletedSession(
  session: PreparationSession
): PreparationProposal {
  const proposals = loadProposalsFromStorage();

  let proposal: PreparationProposal;
  const roleLower = session.participantRole.toLowerCase();

  if (
    roleLower.includes("designer") ||
    roleLower.includes("brand") ||
    roleLower.includes("art") ||
    roleLower.includes("visual")
  ) {
    proposal = buildDesignerProposal(session);
  } else {
    proposal = buildPlannerProposal(session);
  }

  proposals[proposal.id] = proposal;
  saveProposalsToStorage(proposals);
  return proposal;
}

/**
 * Mock API call for POST /api/sessions/{sessionId}/proposal
 */
export function mockGenerateProposal(
  sessionId: string,
  request?: GenerateProposalRequest,
  session?: PreparationSession
): PreparationProposal {
  if (session) {
    return mockGenerateProposalForCompletedSession(session);
  }

  const proposals = loadProposalsFromStorage();
  const existing = Object.values(proposals).find((p) => p.sessionId === sessionId);
  if (existing) return existing;

  // Fallback generation for mock session
  const fallbackSession: PreparationSession = {
    id: sessionId,
    meetingId: "mtg_kova_001",
    participantId: "usr_planner_01",
    participantRole: "Creative Campaign Planner",
    participantName: "Nadia Kusuma",
    currentStage: "ALIGN",
    stageHistory: [],
    transcripts: [],
    confirmedDecisions: [],
    openQuestions: [],
    selectedConceptId: request?.selectedConceptId ?? null,
    status: "completed",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return mockGenerateProposalForCompletedSession(fallbackSession);
}

/**
 * Mock API call for GET /api/proposals/{proposalId}
 */
export function mockGetProposal(proposalId: string): PreparationProposal | null {
  const proposals = loadProposalsFromStorage();
  return proposals[proposalId] ?? null;
}

/**
 * Mock API call for GET /api/proposals?participantId=...
 * Filters proposals strictly to the active employee's participantId.
 * Does NOT list another employee's private proposal.
 */
export function mockListProposalsForParticipant(
  participantId?: string,
  meetingId?: string
): PreparationProposal[] {
  const proposals = loadProposalsFromStorage();
  let list = Object.values(proposals);

  if (participantId) {
    list = list.filter(
      (p) => p.participantId.toLowerCase() === participantId.toLowerCase()
    );
  }

  if (meetingId) {
    list = list.filter((p) => p.meetingId === meetingId);
  }

  return list.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
