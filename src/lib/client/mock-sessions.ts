import {
  type AdvanceStageRequest,
  type AppendSessionEventRequest,
  type CompleteSessionRequest,
  type CreateSessionRequest,
  type DecisionEvent,
  type LiveTokenResponse,
  type PreparationSession,
  type SkillStage,
  type TranscriptEvent,
} from "@/contracts/session";
import { mockGenerateProposalForCompletedSession } from "./mock-proposals";

const SESSIONS_STORAGE_KEY = "wops:mock_sessions_v1";

export interface ScriptedTurn {
  stage: SkillStage;
  agentSpeech: string;
  expectedUserDecision: string;
  suggestedUserSpeech: string;
  decisionItem?: {
    topic: string;
    decision: string;
    rationale: string;
  };
  openQuestion?: string;
}

export const PLANNER_SCRIPTED_TURNS: ScriptedTurn[] = [
  {
    stage: "UNDERSTAND",
    agentSpeech:
      "Hi Nadia! Let's do a focused 5-minute prep for the KOVA Light launch. Looking at the brief: Rp250M ceiling, 20-32 urban commuters in Jakarta & Surabaya, and zero medical claims. Does this match your baseline?",
    suggestedUserSpeech:
      "Yes, exactly. I want to prioritize commuter transit corridors—specifically MRT and KRL stations in Jabodetabek.",
    expectedUserDecision:
      "Focus campaign on urban transit corridors (Jakarta MRT/KRL and Surabaya transit) for 20-32 young commuters.",
    decisionItem: {
      topic: "Targeting & Corridors",
      decision: "Prioritize MRT/KRL transit hubs in Jakarta and Surabaya",
      rationale:
        "Highest daily density of the target 20-32 commuter demographic looking for morning and afternoon energy.",
    },
  },
  {
    stage: "EXPLORE",
    agentSpeech:
      "Let's explore the core hook. Research shows 78% of commuters avoid 'diet' coffee expecting a watery aftertaste. How should we frame the 5g cane sugar without sounding medical?",
    suggestedUserSpeech:
      "We lead with 'Real Taste, Lighter Pace'—celebrating the Arabica-Robusta coffee blend first, with low sugar as the everyday bonus.",
    expectedUserDecision:
      "Adopt 'Real Taste, Lighter Pace' hook: taste first, low-sugar as modern lifestyle benefit.",
    decisionItem: {
      topic: "Campaign Hook & Messaging",
      decision: "Position as 'Real Taste, Lighter Pace' with taste-first copy",
      rationale:
        "Directly tackles the 78% watery-taste perception barrier identified in brief audience research.",
    },
  },
  {
    stage: "EVALUATE",
    agentSpeech:
      "Now evaluate the channel mix against the Rp250M ceiling: Rp120M for TikTok Spark creator seeding, Rp80M for commuter sampling hubs, and Rp35M for social whitelisting. Total Rp235M, leaving a Rp15M safety buffer under ceiling. Does that work?",
    suggestedUserSpeech:
      "That split is solid. It keeps us comfortably under the ceiling and gives us enough sampling volume to hit 15,000 signups.",
    expectedUserDecision:
      "Allocate Rp235,000,000 across creator seeding and transit sampling with Rp15,000,000 contingency buffer.",
    decisionItem: {
      topic: "Budget & Channel Split",
      decision: "Rp235,000,000 total budget allocation with Rp15M contingency reserve",
      rationale:
        "Balanced split drives both digital creator reach and physical taste-trial to clear the trial barrier.",
    },
  },
  {
    stage: "ALIGN",
    agentSpeech:
      "Perfect! We're aligned on strategy, messaging, and budget split. One open question for the team review: will MRT station sampling permits be cleared before Week 3?",
    suggestedUserSpeech:
      "I will raise that with our team lead and agency ops during the alignment call.",
    expectedUserDecision:
      "Flag transit sampling permit lead-times as priority alignment question for team review.",
    openQuestion:
      "Confirm MRT Jakarta sampling booth permit approval lead times for Week 3 activation.",
  },
];

export const DESIGNER_SCRIPTED_TURNS: ScriptedTurn[] = [
  {
    stage: "UNDERSTAND",
    agentSpeech:
      "Hi Bima! Let's prep the visual direction for KOVA Light. The product is a 200ml slim can with Arabica-Robusta blend. Brand guardrail: strictly no medical or diet-culture tropes. Ready to walk through the visual assets?",
    suggestedUserSpeech:
      "Ready. The visual design needs to feel like premium ready-to-drink coffee, clean and modern, not clinical.",
    expectedUserDecision:
      "Commit to premium cold-brew aesthetic and eliminate all clinical/diet visual cues.",
    decisionItem: {
      topic: "Brand Aesthetic Direction",
      decision: "Premium modern cold-brew visual language without clinical imagery",
      rationale:
        "Complies strictly with brief guardrails against medical claims while elevating shelf appeal.",
    },
  },
  {
    stage: "EXPLORE",
    agentSpeech:
      "Let's explore visual routes. Concept A is 'Urban Crisp' with matte slate textures and condensation droplets. Concept B is 'Commuter Glow' with warm sunset lighting and motion blur. Which fits the low-sugar positioning best?",
    suggestedUserSpeech:
      "I recommend 'Urban Crisp'—matte slate background, bold terracotta accent (#D95D39), and high-contrast typography for transit screens.",
    expectedUserDecision:
      "Select 'Urban Crisp' design route with matte slate and high-contrast commuter legibility.",
    decisionItem: {
      topic: "Key Visual Concept",
      decision: "Adopt 'Urban Crisp' with matte slate finish and terracotta accents",
      rationale:
        "Delivers highest readability on high-speed transit digital screens and retail displays.",
    },
  },
  {
    stage: "EVALUATE",
    agentSpeech:
      "Let's evaluate format delivery for the 6-week launch: 12 key assets across 9:16 vertical video, 1:1 social, and sampling booth wraps. Can the design team deliver within 10 business days post-review?",
    suggestedUserSpeech:
      "Yes, if the team lead approves the master visual in the meeting, 10 days is realistic for batch production.",
    expectedUserDecision:
      "12 key asset deliverables locked for 10-day production timeline post-meeting.",
    decisionItem: {
      topic: "Asset Scope & Timeline",
      decision: "12 multi-format asset deliverables within 10 business days",
      rationale:
        "Modular visual system allows simultaneous adaptation across social and physical print formats.",
    },
  },
  {
    stage: "ALIGN",
    agentSpeech:
      "Great! Concept and production milestones are solid. One open question for the meeting: do we need 3D render files from the can packaging vendor for the sampling booth wraps?",
    suggestedUserSpeech:
      "Yes, I will ask the account team to request the packaging CAD renders immediately.",
    expectedUserDecision:
      "Request 3D can render CAD files from packaging vendor for sampling wrap fidelity.",
    openQuestion:
      "Request 3D can render files from packaging supplier for accurate physical booth scale.",
  },
];

export function getScriptedDialogForRole(role: string): ScriptedTurn[] {
  const normalized = role.toLowerCase();
  if (
    normalized.includes("designer") ||
    normalized.includes("brand") ||
    normalized.includes("art") ||
    normalized.includes("visual")
  ) {
    return DESIGNER_SCRIPTED_TURNS;
  }
  return PLANNER_SCRIPTED_TURNS;
}

function loadSessionsFromStorage(): Record<string, PreparationSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PreparationSession>;
  } catch {
    return {};
  }
}

function saveSessionsToStorage(sessions: Record<string, PreparationSession>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage quota or private browsing
  }
}

export function mockCreateSession(
  input: CreateSessionRequest
): PreparationSession {
  const sessions = loadSessionsFromStorage();
  const sessionId = `ses_${input.meetingId}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const newSession: PreparationSession = {
    id: sessionId,
    meetingId: input.meetingId,
    participantId: input.participantId,
    participantRole: input.participantRole ?? "Participant",
    participantName: input.participantName ?? input.participantRole ?? "Participant",
    currentStage: "UNDERSTAND",
    stageHistory: [
      {
        fromStage: null,
        toStage: "UNDERSTAND",
        transitionedAt: now,
        reason: "Preparation call started",
      },
    ],
    transcripts: [],
    confirmedDecisions: [],
    openQuestions: [],
    selectedConceptId: null,
    status: "active",
    startedAt: now,
    updatedAt: now,
  };

  sessions[sessionId] = newSession;
  saveSessionsToStorage(sessions);
  return newSession;
}

export function mockGetSession(sessionId: string): PreparationSession {
  const sessions = loadSessionsFromStorage();
  const session = sessions[sessionId];
  if (!session) {
    // Return a fallback session if not found
    return {
      id: sessionId,
      meetingId: "mtg_kova_001",
      participantId: "usr_planner_01",
      participantRole: "Creative Campaign Planner",
      participantName: "Nadia Kusuma",
      currentStage: "UNDERSTAND",
      stageHistory: [],
      transcripts: [],
      confirmedDecisions: [],
      openQuestions: [],
      selectedConceptId: null,
      status: "active",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return session;
}

export function mockGetLiveToken(sessionId: string): LiveTokenResponse {
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return {
    sessionId,
    ephemeralToken: `eph_demo_tok_${Date.now().toString(36)}`,
    expiresAt: expires,
    stage: "UNDERSTAND",
  };
}

export function mockAppendSessionEvent(
  sessionId: string,
  event: AppendSessionEventRequest
): PreparationSession {
  const sessions = loadSessionsFromStorage();
  const session = sessions[sessionId] ?? mockGetSession(sessionId);
  const now = new Date().toISOString();

  if (event.type === "transcript") {
    const transcript: TranscriptEvent = {
      id: `evt_tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      stage: event.event.stage,
      speaker: event.event.speaker,
      text: event.event.text,
      isFinal: event.event.isFinal ?? true,
      timestamp: event.event.timestamp ?? now,
    };
    session.transcripts.push(transcript);
  } else if (event.type === "decision") {
    const decision: DecisionEvent = {
      id: `evt_dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      stage: event.event.stage,
      topic: event.event.topic,
      decision: event.event.decision,
      rationale: event.event.rationale,
      sourceType: event.event.sourceType ?? "user_decision",
      sourceReferenceIds: event.event.sourceReferenceIds ?? [],
      timestamp: event.event.timestamp ?? now,
    };
    session.confirmedDecisions.push(decision);
  } else if (event.type === "open_question") {
    if (!session.openQuestions.includes(event.question)) {
      session.openQuestions.push(event.question);
    }
  } else if (event.type === "select_concept") {
    session.selectedConceptId = event.selectedConceptId;
  }

  session.updatedAt = now;
  sessions[sessionId] = session;
  saveSessionsToStorage(sessions);
  return session;
}

export function mockAdvanceSessionStage(
  sessionId: string,
  request: AdvanceStageRequest
): PreparationSession {
  const sessions = loadSessionsFromStorage();
  const session = sessions[sessionId] ?? mockGetSession(sessionId);
  const now = new Date().toISOString();

  session.stageHistory.push({
    fromStage: session.currentStage,
    toStage: request.targetStage,
    transitionedAt: now,
    reason: request.reason ?? "Stage advanced by participant",
  });
  session.currentStage = request.targetStage;
  session.updatedAt = now;

  sessions[sessionId] = session;
  saveSessionsToStorage(sessions);
  return session;
}

export function mockCompleteSession(
  sessionId: string,
  request: CompleteSessionRequest
): PreparationSession {
  const sessions = loadSessionsFromStorage();
  const session = sessions[sessionId] ?? mockGetSession(sessionId);
  const now = new Date().toISOString();

  session.status = "completed";
  session.endedAt = now;
  session.updatedAt = now;
  if (request.selectedConceptId) {
    session.selectedConceptId = request.selectedConceptId;
  }

  sessions[sessionId] = session;
  saveSessionsToStorage(sessions);

  // Automatically generate personal preparation proposal for this participant's completed session
  mockGenerateProposalForCompletedSession(session);

  return session;
}
