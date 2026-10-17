# WOPS! (Work Out Problems Swiftly) — MVP API Contract

> **Purpose:** Single source of truth between **Developer A (Frontend & Client Experience)** and **Developer B (Backend, Cloud & AI Engine)**.  
> All endpoints below use shared Zod schemas defined in [`src/contracts/`](./src/contracts/). Any modifications to `src/contracts/**` or this contract require explicit team agreement.

---

## 1. Domain & Business Rules

1. **Product Positioning:** WOPS! is a proactive, voice-first AI thinking partner used **before** meetings (not a meeting recorder).
2. **Demo Brand Constraint:** **KOVA** is a fictional Indonesian ready-to-drink (RTD) low-sugar coffee brand. Proposals and facilitation prompts must never fabricate unsupported medical or clinical health claims.
3. **Monetary Values & Budget Ceiling:**
   - All IDR currency amounts (`budgetCeilingIdr`, `amountIdr`, `totalBudgetIdr`) are represented as **non-negative integers** in Indonesian Rupiah (e.g., `250000000` for Rp250,000,000).
   - For the KOVA demo, `250000000` (Rp250,000,000) is a **budget ceiling**, not a mandatory spend (`totalBudgetIdr <= budgetCeilingIdr`).
4. **Timestamps:** All timestamps across requests and responses use **ISO 8601 UTC strings** (validated via `z.string().datetime()`).
5. **Grounding & Source Attribution:** Both `DecisionEvent` and `ProposalSourceReference` explicitly classify statements using `GroundingSourceType`:
   - `document_fact` — Directly grounded in uploaded client PDF briefs/documents.
   - `user_decision` — Explicitly decided or confirmed by the human planner during the session.
   - `assumption` — Working assumption flagged for team alignment or client validation.
6. **Structured Ideation Stages (`SkillStage`):**
   - Valid stages: `UNDERSTAND` -> `EXPLORE` -> `EVALUATE` -> `ALIGN`.
   - Stage transitions are strictly validated by the backend via `POST /api/sessions/{sessionId}/advance`. Invalid transitions return `409 Conflict` with error code `INVALID_STAGE_TRANSITION`.

---

## 2. Gemini Live Architecture & Security Boundary

```text
+--------------------+        1. POST /api/sessions/{id}/live-token         +-----------------------+
|                    | ---------------------------------------------------> |                       |
|  Browser Client    | <--------------------------------------------------- |   Next.js Backend     |
|  (Developer A)     |        2. LiveTokenResponse (ephemeralToken)         |   (Developer B)       |
|                    |                                                      |                       |
|                    |        3. Direct WebRTC / WebSocket Live Session     |  Holds permanent      |
|                    | <==================================================> |  GEMINI_API_KEY       |
|                    |           Gemini Live API (Ephemeral Auth)           |  server-side only     |
|                    |                                                      |                       |
|                    |        4. POST /events, /advance, /complete          |  Persists state,      |
|                    | ---------------------------------------------------> |  context & generates  |
+--------------------+                                                      |  CampaignProposal     |
                                                                            +-----------------------+
```

- **Server-Side Secret Isolation:** Permanent `GEMINI_API_KEY` credentials remain strictly on the Next.js server (`src/lib/server/**`) and must **never** be exposed to the browser or included in `NEXT_PUBLIC_*` variables.
- **Ephemeral Client Authentication:**
  1. The browser calls `POST /api/sessions/{sessionId}/live-token`.
  2. The backend provisions a short-lived ephemeral token using the official Google Gen AI SDK (`@google/genai`) provisioning flow and returns `LiveTokenResponse` (`{ sessionId, ephemeralToken, expiresAt, stage }`).
  3. The browser connects to Gemini Live using the supported client authentication flow with `ephemeralToken`.
  4. **Implementation Note:** Before implementing `POST /api/sessions/{sessionId}/live-token`, Developer B must verify current `@google/genai` SDK support for ephemeral token creation and Live API model identifiers rather than hardcoding unverified model strings or token fields.
- **Backend State Authority:** The Next.js backend remains the source of truth for meeting context, stage progression (`UNDERSTAND` -> `EXPLORE` -> `EVALUATE` -> `ALIGN`), transcript/decision persistence, and grounded `CampaignProposal` synthesis.

---

## 3. Standard Error Format

All `4xx` and `5xx` error responses conform to `ApiErrorSchema` ([`src/contracts/error.ts`](./src/contracts/error.ts)):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "budgetCeilingIdr",
        "message": "Expected integer, received float"
      }
    ],
    "requestId": "req_01J...",
    "timestamp": "2026-10-17T16:00:00.000Z"
  }
}
```

### Error Codes (`ApiErrorCodeSchema`)
| Code | Typical HTTP Status | Description |
| :--- | :--- | :--- |
| `BAD_REQUEST` | `400` | Malformed JSON, missing multipart file, or invalid query/path parameter |
| `VALIDATION_ERROR` | `422` / `400` | Request body failed Zod schema validation |
| `NOT_FOUND` | `404` | Requested meeting, document, session, or proposal does not exist |
| `CONFLICT` | `409` | Resource state conflict (e.g., modifying a completed session) |
| `INVALID_STAGE_TRANSITION` | `409` | Attempted an unsupported `SkillStage` transition |
| `UNPROCESSABLE_ENTITY` | `422` | Business rule violation (e.g., proposal budget exceeds `budgetCeilingIdr` or missing required session context) |
| `INTERNAL_ERROR` | `500` | Unexpected server error |
| `UPSTREAM_ERROR` | `502` | Failure communicating with Gemini API, Cloud Storage, or Firestore |

---

## 4. MVP REST Endpoints

### 4.1 Health Check

#### `GET /api/health`
Verifies the API service is running. *(Already implemented — do not modify).*

- **Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "wops-api"
}
```

---

### 4.2 Meetings

#### `GET /api/meetings`
Lists all meetings ordered by `scheduledAt` / `createdAt`.

- **Response `200 OK`:**
```json
{
  "meetings": [
    {
      "id": "mtg_kova_001",
      "title": "KOVA Low-Sugar RTD Launch Ideation",
      "clientName": "KOVA",
      "projectName": "KOVA Light — Low-Sugar RTD Coffee Launch",
      "scheduledAt": "2026-10-20T03:00:00.000Z",
      "meetingObjective": "Align on a primary creative direction and 6-week launch plan prior to agency review",
      "clientObjective": "Drive trial among urban young professionals in Jakarta and Surabaya without sacrificing coffee taste perception",
      "clientRequirements": [
        "Highlight low-sugar positioning without making clinical or medical health claims",
        "Include creator-led social activation and convenience store trial mechanics"
      ],
      "targetAudience": "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
      "constraints": [
        "KOVA is a fictional brand for demo purposes",
        "No unsupported health or medical claims",
        "Budget ceiling of Rp250,000,000 (ceiling, not mandatory full spend)"
      ],
      "budgetCeilingIdr": 250000000,
      "participantRole": "Creative Campaign Planner",
      "leadRole": "Creative Team Lead",
      "participants": [
        {
          "id": "usr_lead_01",
          "name": "Raka Pratama",
          "role": "Creative Team Lead"
        },
        {
          "id": "usr_planner_01",
          "name": "Nadia Kusuma",
          "role": "Creative Campaign Planner"
        }
      ],
      "status": "ready",
      "documentIds": ["doc_kova_brief_01"],
      "createdAt": "2026-10-17T15:00:00.000Z",
      "updatedAt": "2026-10-17T15:10:00.000Z"
    }
  ]
}
```

#### `POST /api/meetings`
Creates a new meeting configured by the Creative Team Lead.

- **Request Body (`CreateMeetingRequestSchema`):**
```json
{
  "title": "KOVA Low-Sugar RTD Launch Ideation",
  "clientName": "KOVA",
  "projectName": "KOVA Light — Low-Sugar RTD Coffee Launch",
  "scheduledAt": "2026-10-20T03:00:00.000Z",
  "meetingObjective": "Align on a primary creative direction and 6-week launch plan prior to agency review",
  "clientObjective": "Drive trial among urban young professionals in Jakarta and Surabaya",
  "clientRequirements": [
    "Highlight low-sugar positioning without making clinical health claims",
    "Include creator-led social activation"
  ],
  "targetAudience": "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
  "constraints": [
    "KOVA is a fictional brand",
    "No unsupported health claims",
    "Total proposed budget must not exceed Rp250,000,000"
  ],
  "budgetCeilingIdr": 250000000,
  "participantRole": "Creative Campaign Planner",
  "leadRole": "Creative Team Lead",
  "participants": [
    {
      "name": "Nadia Kusuma",
      "role": "Creative Campaign Planner"
    }
  ]
}
```
- **Response `201 Created`:**
```json
{
  "meeting": {
    "id": "mtg_kova_001",
    "...": "Full Meeting object conforming to MeetingSchema"
  }
}
```
- **Errors:** `400 BAD_REQUEST`, `422 VALIDATION_ERROR`.

#### `GET /api/meetings/{meetingId}`
Fetches a single meeting by ID.

- **Response `200 OK`:**
```json
{
  "meeting": {
    "id": "mtg_kova_001",
    "...": "Full Meeting object conforming to MeetingSchema"
  }
}
```
- **Errors:** `404 NOT_FOUND`.

#### `POST /api/meetings/{meetingId}/documents`
Uploads a client PDF brief or supporting document and triggers document extraction.

- **Request:** `multipart/form-data` with field `file` (PDF/document binary) and optional `type` (`"pdf" | "brief" | "notes" | "other"`).
- **Response `201 Created`:**
```json
{
  "document": {
    "id": "doc_kova_brief_01",
    "meetingId": "mtg_kova_001",
    "name": "KOVA-Brand-Brief-2026.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 418290,
    "type": "brief",
    "processingStatus": "ready",
    "storageUri": "gs://wops-documents/mtg_kova_001/doc_kova_brief_01.pdf",
    "summary": "Client brief for KOVA low-sugar RTD coffee launch targeting urban commuters with a Rp250M budget ceiling.",
    "extractedFacts": [
      {
        "id": "fact_01",
        "statement": "KOVA Light contains 5g of cane sugar per 200ml can and uses 100% Indonesian Arabica-Robusta blend.",
        "pageOrSection": "Page 2 — Product Specs"
      }
    ],
    "uploadedAt": "2026-10-17T15:05:00.000Z",
    "processedAt": "2026-10-17T15:05:04.000Z"
  }
}
```
- **Errors:** `400 BAD_REQUEST`, `404 NOT_FOUND`, `422 UNPROCESSABLE_ENTITY`, `502 UPSTREAM_ERROR`.

#### `GET /api/meetings/{meetingId}/context`
Returns the combined meeting specification, uploaded document metadata, synthesized brief, and extracted `DocumentFact` items used to ground the AI facilitator.

- **Response `200 OK` (`MeetingContextResponseSchema`):**
```json
{
  "meeting": {
    "id": "mtg_kova_001",
    "...": "MeetingSchema"
  },
  "documents": [
    {
      "id": "doc_kova_brief_01",
      "...": "DocumentMetadataSchema"
    }
  ],
  "synthesizedBrief": "KOVA is launching KOVA Light, a low-sugar RTD coffee for urban Indonesian commuters with a Rp250,000,000 budget ceiling.",
  "keyFacts": [
    {
      "id": "fact_01",
      "statement": "KOVA Light contains 5g of cane sugar per 200ml can.",
      "pageOrSection": "Page 2"
    }
  ]
}
```
- **Errors:** `404 NOT_FOUND`.

---

### 4.3 Preparation Sessions

#### `POST /api/sessions`
Creates and initializes a new voice-first preparation session for a meeting (starts in `UNDERSTAND` stage).

- **Request Body (`CreateSessionRequestSchema`):**
```json
{
  "meetingId": "mtg_kova_001",
  "participantName": "Nadia Kusuma",
  "participantRole": "Creative Campaign Planner"
}
```
- **Response `201 Created`:**
```json
{
  "session": {
    "id": "ses_kova_001",
    "meetingId": "mtg_kova_001",
    "currentStage": "UNDERSTAND",
    "stageHistory": [
      {
        "fromStage": null,
        "toStage": "UNDERSTAND",
        "transitionedAt": "2026-10-17T15:15:00.000Z",
        "reason": "Session initialized"
      }
    ],
    "transcripts": [],
    "confirmedDecisions": [],
    "openQuestions": [],
    "selectedConceptId": null,
    "status": "ringing",
    "startedAt": "2026-10-17T15:15:00.000Z",
    "updatedAt": "2026-10-17T15:15:00.000Z"
  }
}
```
- **Errors:** `404 NOT_FOUND`, `422 VALIDATION_ERROR`.

#### `GET /api/sessions/{sessionId}`
Retrieves the current state of a preparation session.

- **Response `200 OK`:**
```json
{
  "session": {
    "id": "ses_kova_001",
    "...": "PreparationSessionSchema"
  }
}
```
- **Errors:** `404 NOT_FOUND`.

#### `POST /api/sessions/{sessionId}/live-token`
Provisions a short-lived ephemeral credential for the browser to establish a Gemini Live voice session. **Never returns a permanent API key.**

- **Request Body:** `{}` (empty JSON object or optional client hints).
- **Response `200 OK` (`LiveTokenResponseSchema`):**
```json
{
  "sessionId": "ses_kova_001",
  "ephemeralToken": "eph_tok_...",
  "expiresAt": "2026-10-17T15:30:00.000Z",
  "stage": "UNDERSTAND"
}
```
- **Errors:** `404 NOT_FOUND`, `409 CONFLICT` (if session is already completed), `502 UPSTREAM_ERROR`.

#### `POST /api/sessions/{sessionId}/events`
Appends a transcript utterance, a confirmed decision, an open question, or a selected concept ID to the session.

- **Request Body (`AppendSessionEventRequestSchema`):**
  - **Transcript variant:**
    ```json
    {
      "type": "transcript",
      "event": {
        "stage": "UNDERSTAND",
        "speaker": "user",
        "text": "Let's focus on afternoon commuter fatigue in Jakarta without making health claims.",
        "isFinal": true,
        "timestamp": "2026-10-17T15:16:10.000Z"
      }
    }
    ```
  - **Decision variant:**
    ```json
    {
      "type": "decision",
      "event": {
        "stage": "EVALUATE",
        "topic": "Primary Creative Hook",
        "decision": "Position KOVA Light around 'Sharp Focus, Zero Crash' for 3 PM commuters",
        "rationale": "Grounded in product brief low-sugar spec without medical claims",
        "sourceType": "user_decision",
        "sourceReferenceIds": ["fact_01"],
        "timestamp": "2026-10-17T15:20:00.000Z"
      }
    }
    ```
  - **Open question variant:**
    ```json
    {
      "type": "open_question",
      "question": "Can retail sampling start in week 2 across MRT station kiosks?"
    }
    ```
  - **Select concept variant:**
    ```json
    {
      "type": "select_concept",
      "selectedConceptId": "dir_01"
    }
    ```
- **Response `200 OK`:**
```json
{
  "session": {
    "id": "ses_kova_001",
    "...": "Updated PreparationSession object"
  }
}
```
- **Errors:** `404 NOT_FOUND`, `409 CONFLICT`, `422 VALIDATION_ERROR`.

#### `POST /api/sessions/{sessionId}/advance`
Validates and transitions the session to the next ideation stage (`UNDERSTAND` -> `EXPLORE` -> `EVALUATE` -> `ALIGN`).

- **Request Body (`AdvanceStageRequestSchema`):**
```json
{
  "targetStage": "EXPLORE",
  "reason": "Brief objectives, constraints, andRp250M budget ceiling confirmed with planner"
}
```
- **Response `200 OK`:**
```json
{
  "session": {
    "id": "ses_kova_001",
    "currentStage": "EXPLORE",
    "...": "Updated PreparationSession object"
  }
}
```
- **Errors:** `404 NOT_FOUND`, `409 INVALID_STAGE_TRANSITION`, `422 VALIDATION_ERROR`.

#### `POST /api/sessions/{sessionId}/complete`
Marks the voice preparation session as `completed` and locks in the final `selectedConceptId` if provided.

- **Request Body (`CompleteSessionRequestSchema`):**
```json
{
  "selectedConceptId": "dir_01",
  "closingNotes": "Ready to synthesize KOVA Light campaign proposal"
}
```
- **Response `200 OK`:**
```json
{
  "session": {
    "id": "ses_kova_001",
    "status": "completed",
    "...": "Updated PreparationSession object"
  }
}
```
- **Errors:** `404 NOT_FOUND`, `409 CONFLICT`.

---

### 4.4 Campaign Proposals

#### `POST /api/sessions/{sessionId}/proposal`
Synthesizes a structured `CampaignProposal` grounded in the meeting context, uploaded document facts, and session decisions. Validates that `totalBudgetIdr <= meeting.budgetCeilingIdr` and that every source reference distinguishes `document_fact`, `user_decision`, or `assumption`.

- **Request Body (`GenerateProposalRequestSchema`):**
```json
{
  "selectedConceptId": "dir_01",
  "additionalNotes": "Keep contingency buffer under the Rp250,000,000 ceiling."
}
```
- **Response `201 Created`:**
```json
{
  "proposal": {
    "id": "prop_kova_001",
    "meetingId": "mtg_kova_001",
    "sessionId": "ses_kova_001",
    "executiveSummary": "A 6-week launch campaign for KOVA Light centered on afternoon urban commuters in Jakarta and Surabaya.",
    "clientContext": "KOVA (fictional Indonesian RTD coffee brand) is introducing a low-sugar coffee line with a Rp250,000,000 budget ceiling.",
    "campaignObjectives": [
      "Generate awareness and product trial among 20-32 urban commuters",
      "Establish KOVA Light as great-tasting low-sugar RTD coffee without clinical health claims"
    ],
    "targetAudience": "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
    "creativeDirections": [
      {
        "id": "dir_01",
        "title": "3 PM Tanpa Drama (3 PM Without the Crash)",
        "tagline": "Kopi Beneran, Gula Ringan.",
        "conceptSummary": "Own the 3 PM commuter and office slump moment with bold taste and lighter sugar.",
        "rationale": "Directly connects the 5g sugar product fact to a relatable daily ritual without medical claims.",
        "isRecommended": true
      }
    ],
    "selectedDirection": {
      "id": "dir_01",
      "title": "3 PM Tanpa Drama (3 PM Without the Crash)",
      "tagline": "Kopi Beneran, Gula Ringan.",
      "conceptSummary": "Own the 3 PM commuter and office slump moment with bold taste and lighter sugar.",
      "rationale": "Directly connects the 5g sugar product fact to a relatable daily ritual without medical claims.",
      "isRecommended": true
    },
    "keyMessages": [
      "Real Indonesian coffee character with lighter sugar for your afternoon rhythm",
      "Designed for daily commuters who want full flavor without heavy sweetness"
    ],
    "activationIdeas": [
      "3 PM Commuter Drop sampling booths near MRT Dukuh Atas and Blok M",
      "Office Desk Rescue kits paired with micro-creator unboxings"
    ],
    "channelStrategy": [
      {
        "channel": "TikTok & Instagram Reels",
        "role": "Reach & Cultural Relatability",
        "tactics": ["3 PM POV creator skits", "Taste-test street interviews"]
      }
    ],
    "creatorStrategy": "Partner with 15 mid-tier Jakarta/Surabaya lifestyle & commuter creators focusing on authentic taste reactions.",
    "sixWeekTimeline": [
      {
        "weekNumber": 1,
        "phaseName": "Pre-Launch Teaser & Creator Seeding",
        "milestones": ["Finalize creator briefs", "Dispatch seeding kits"],
        "deliverables": ["15 creator seeding boxes", "Teaser short-form edits"]
      },
      {
        "weekNumber": 2,
        "phaseName": "Hero Launch & 3 PM Digital Takeover",
        "milestones": ["Launch hero reels"],
        "deliverables": ["Hero launch video", "Paid social flight 1"]
      },
      {
        "weekNumber": 3,
        "phaseName": "Commuter Sampling Activation — Jakarta",
        "milestones": ["MRT hub activation"],
        "deliverables": ["Sampling booth collateral"]
      },
      {
        "weekNumber": 4,
        "phaseName": "Creator Duets & Surabaya Expansion",
        "milestones": ["Surabaya coffee community pop-up"],
        "deliverables": ["Wave 2 creator content"]
      },
      {
        "weekNumber": 5,
        "phaseName": "Retail Trial Push",
        "milestones": ["Minimarket bundle promo"],
        "deliverables": ["POS callout assets"]
      },
      {
        "weekNumber": 6,
        "phaseName": "Retargeting & Campaign Wrap Review",
        "milestones": ["Performance synthesis"],
        "deliverables": ["Post-campaign learnings deck"]
      }
    ],
    "budgetBreakdown": [
      {
        "category": "Creator Partnerships & Seeding",
        "amountIdr": 85000000,
        "notes": "15 mid-tier creators + seeding production"
      },
      {
        "category": "Commuter Sampling & Pop-Up Activations",
        "amountIdr": 75000000,
        "notes": "Jakarta & Surabaya commuter hubs"
      },
      {
        "category": "Paid Social Amplification",
        "amountIdr": 50000000,
        "notes": "TikTok & Meta targeted commuter dayparting"
      },
      {
        "category": "Content Production & Design",
        "amountIdr": 25000000,
        "notes": "Short-form video & POS assets"
      }
    ],
    "totalBudgetIdr": 235000000,
    "kpis": [
      "12,000+ cans sampled across commuter hubs",
      "2.5M+ organic & paid video views across Jakarta and Surabaya target demo"
    ],
    "risks": [
      {
        "risk": "Creators inadvertently improvising health or weight-loss claims",
        "mitigation": "Strict creator do/don't script checklist prohibiting medical or clinical claims"
      }
    ],
    "sourceReferences": [
      {
        "id": "ref_01",
        "sourceType": "document_fact",
        "claimOrDecision": "KOVA Light uses 5g cane sugar per 200ml can and has a Rp250,000,000 budget ceiling.",
        "referenceId": "fact_01",
        "citationNote": "KOVA-Brand-Brief-2026.pdf, Page 2"
      },
      {
        "id": "ref_02",
        "sourceType": "user_decision",
        "claimOrDecision": "Selected '3 PM Tanpa Drama' creative direction with Rp235,000,000 total budget (leaving Rp15,000,000 buffer under ceiling).",
        "referenceId": "dir_01"
      },
      {
        "id": "ref_03",
        "sourceType": "assumption",
        "claimOrDecision": "MRT commuter hub sampling permits can be cleared within 10 business days prior to Week 3.",
        "citationNote": "Flagged for team validation during meeting"
      }
    ],
    "nextSteps": [
      "Review proposal with Creative Team Lead in scheduled meeting",
      "Confirm MRT sampling permit lead times with activation vendor"
    ],
    "createdAt": "2026-10-17T15:25:00.000Z",
    "updatedAt": "2026-10-17T15:25:00.000Z"
  }
}
```
- **Errors:** `404 NOT_FOUND`, `422 UNPROCESSABLE_ENTITY`, `502 UPSTREAM_ERROR`.

#### `GET /api/proposals/{proposalId}`
Retrieves a generated `CampaignProposal` by ID.

- **Response `200 OK`:**
```json
{
  "proposal": {
    "id": "prop_kova_001",
    "...": "CampaignProposalSchema"
  }
}
```
- **Errors:** `404 NOT_FOUND`.
