import {
  CreateMeetingRequestSchema,
  MeetingSchema,
  type CreateMeetingRequest,
  type Meeting,
} from "@/contracts/meeting";

const MOCK_MODE_STORAGE_KEY = "wops:use_mock_api";
const MOCK_MEETINGS_STORAGE_KEY = "wops:mock_meetings_v1";

/**
 * Seeded KOVA Demo Meeting matching MeetingSchema and API_CONTRACT.md.
 * Displayed ONLY when mock mode is explicitly enabled.
 */
export const KOVA_SEED_MEETING: Meeting = MeetingSchema.parse({
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
    "Highlight low-sugar positioning (5g cane sugar per 200ml can) without making clinical or medical health claims",
    "Include creator-led social activation and commuter hub trial mechanics",
    "Deliver a 6-week phased rollout schedule with clear KPIs",
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
  ],
  status: "ready",
  documentIds: ["doc_kova_brief_01"],
  createdAt: "2026-10-17T15:00:00.000Z",
  updatedAt: "2026-10-17T15:10:00.000Z",
});

export const KOVA_DEMO_MEETING_DRAFT: CreateMeetingRequest =
  CreateMeetingRequestSchema.parse({
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

export function resetMockMeetingsToKovaDefault(): Meeting[] {
  const initial = [KOVA_SEED_MEETING];
  writeStoredMockMeetings(initial);
  return initial;
}

export async function mockListMeetings(): Promise<Meeting[]> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  return readStoredMockMeetings();
}

export async function mockGetMeetingById(meetingId: string): Promise<Meeting | null> {
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
    id: `mtg_${validatedInput.clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "custom"}_${suffix}`,
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
