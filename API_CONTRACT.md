# WOPS! (Work Out Problems Swiftly) — Contract V2 API Specification

> **Guiding Principle:**  
> **One Meeting → One Shared Document-Grounded Context → Multiple Participant-Specific AI Sessions → One Aligned Proposal.**  
> WOPS! is a proactive, voice-first AI thinking partner used **before** meetings, not a meeting recorder.  
> Single source of truth between **Developer A (Frontend & Client Experience)** and **Developer B (Backend, Cloud & AI Engine)**.  
> All endpoints use shared Zod schemas defined in [`src/contracts/`](./src/contracts/).

---

## 1. Product Workflow & Domain Rules

1. **Document-First Setup:** In creative agency workflows, clients provide campaign requirements in documents (PDF, DOCX, PPTX). Team Leads set up basic meeting metadata and assign participating employees once, then attach client documents directly on the creation screen.
2. **Draft → Upload → Grounding → Finalize Flow:**
   - **Step 1 (Draft):** Team Lead creates a minimal meeting draft via `POST /api/meetings` with title, client name, project name, schedule, internal meeting objective, lead role, and assigned participants. Client fields (`clientObjective`, `targetAudience`, `budgetCeilingIdr`) are extracted from documents and are optional in the draft.
   - **Step 2 (Upload & Extract):** Frontend uploads selected client documents to `POST /api/meetings/{meetingId}/documents`. Backend extracts grounded facts categorized by objective, audience, budget, requirements, constraints, and deliverables.
   - **Step 3 (Review & Correct):** Team Lead reviews extracted source-backed facts in place. Optional corrections can be submitted via `PATCH /api/meetings/{meetingId}/facts/{factId}`.
   - **Step 4 (Finalize):** Team Lead calls `POST /api/meetings/{meetingId}/finalize` to confirm grounded context. The meeting status transitions from `draft` to `ready`. A meeting **never** becomes `ready` merely because an upload completed.
3. **Participant-Specific Role-Aware Sessions:**
   - Each voice session belongs to a specific `meetingId` and `participantId` (`POST /api/sessions`).
   - Every participant shares the **same** underlying client brief facts, but the AI thinking partner tailors its sparring focus, questions, and trade-offs to that employee's assigned role (e.g., Campaign Planner vs. Senior Brand Designer).
4. **Multi-Session Proposal Aggregation:**
   - `CampaignProposal` aggregates decisions and commitments across multiple role-specific sessions.
   - Explicitly tracks `participantContributions` and highlights `unresolvedConflicts` between workstreams for the upcoming team meeting.
5. **Monetary Values & Budget Representation:**
   - All IDR amounts (`budgetCeilingIdr`, `amountIdr`, `totalBudgetIdr`) are **non-negative integers**.
   - An unknown budget ceiling during draft is represented as `undefined` (omitted), **never** as `0`.
   - For the demo KOVA campaign, `250000000` (Rp250,000,000) is a maximum budget ceiling, not a mandatory full spend.
6. **File Format & Size Constraints:**
   - Target formats: `PDF`, `DOCX`, `PPTX`.
   - MVP upload validation: `PDF` supported now (`application/pdf`). `DOCX`/`PPTX` support is recorded for future ingestion; unsupported formats are rejected with HTTP `422` (`VALIDATION_ERROR`) and never silently renamed or converted.
   - Maximum file size: **10 MB** (10,485,760 bytes). Files exceeding this limit return HTTP `422` with a clear message.
7. **Timestamps:** ISO 8601 UTC strings (`z.string().datetime()`).
8. **Fact Categorization & Provenance:**
   - Categories: `client_objective`, `requirement`, `target_audience`, `budget`, `constraint`, `deliverable`, `timeline`, `other`.
   - Provenance: `extracted` (source-grounded), `confirmed` (verified/corrected by Team Lead), `assumption` (unverified working assumption).

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

- **Server-Side Secret Isolation:** Permanent `GEMINI_API_KEY` credentials and Google Cloud service account keys remain strictly on the server (`src/lib/server/**`) and are **never** exposed to client bundles or `NEXT_PUBLIC_*` variables.
- **Ephemeral Client Authentication:** The client requests short-lived tokens via `POST /api/sessions/{sessionId}/live-token` to connect directly to the Gemini Live multimodal endpoint.
- **Source of Truth:** Next.js Route Handlers and Firebase/Firestore act as the authoritative store for meeting setup, document metadata, transcripts, decisions, and proposals.

---

## 3. Standard Error Format

All error responses return `ApiErrorSchema` ([`src/contracts/error.ts`](./src/contracts/error.ts)):

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
    "timestamp": "2026-10-18T04:00:00.000Z"
  }
}
```

### Error Codes (`ApiErrorCodeSchema`)
| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `BAD_REQUEST` | `400` | Malformed JSON or missing parameters |
| `UNAUTHORIZED` | `401` | Missing or invalid authentication token |
| `FORBIDDEN` | `403` | Authenticated user is not authorized to mutate shared meeting context or session |
| `NOT_FOUND` | `404` | Meeting, document, fact, session, or proposal does not exist |
| `CONFLICT` | `409` | State conflict (e.g. finalizing while documents are still processing) |
| `INVALID_STAGE_TRANSITION` | `409` | Attempted invalid `SkillStage` transition |
| `UNPROCESSABLE_ENTITY` | `422` | Business rule violation or unsupported file format |
| `VALIDATION_ERROR` | `422` / `400` | Request body failed Zod schema validation |
| `INTERNAL_ERROR` | `500` | Server-side execution failure |
| `UPSTREAM_ERROR` | `502` | Upstream failure communicating with Gemini Live, GCS, or Firestore |

---

## 4. REST Endpoints Specification

### 4.1 Health Check

#### `GET /api/health`
Verifies API availability.

- **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "service": "wops-api"
  }
  ```

---

### 4.2 Meetings (Document-First Setup)

#### `GET /api/meetings`
Lists all meetings ordered by schedule/creation date.

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
        "leadRole": "Creative Team Lead",
        "participants": [
          { "id": "usr_lead_01", "name": "Raka Pratama", "role": "Creative Team Lead" },
          { "id": "usr_planner_01", "name": "Nadia Kusuma", "role": "Creative Campaign Planner" },
          { "id": "usr_designer_01", "name": "Bima Wijaya", "role": "Senior Brand Designer" }
        ],
        "status": "ready",
        "documentIds": ["doc_kova_brief_01"],
        "clientObjective": "Drive trial among urban young professionals in Jakarta and Surabaya without sacrificing coffee taste perception",
        "targetAudience": "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
        "budgetCeilingIdr": 250000000,
        "clientRequirements": [
          "Highlight low-sugar positioning without medical claims",
          "Include creator-led social activation"
        ],
        "constraints": ["KOVA is a fictional brand", "No unsupported health claims"],
        "createdAt": "2026-10-18T00:00:00.000Z",
        "updatedAt": "2026-10-18T00:05:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/meetings`
Creates a minimal meeting draft.

- **Request Body (`CreateMeetingRequestSchema`):**
  ```json
  {
    "title": "KOVA Low-Sugar RTD Launch Ideation",
    "clientName": "KOVA",
    "projectName": "KOVA Light — Low-Sugar RTD Coffee Launch",
    "scheduledAt": "2026-10-20T03:00:00.000Z",
    "meetingObjective": "Align on primary creative direction and launch plan",
    "leadRole": "Creative Team Lead",
    "participants": [
      { "name": "Nadia Kusuma", "role": "Creative Campaign Planner" },
      { "name": "Bima Wijaya", "role": "Senior Brand Designer" }
    ]
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "meeting": {
      "id": "mtg_kova_001",
      "status": "draft",
      "documentIds": [],
      "createdAt": "2026-10-18T04:00:00.000Z",
      "updatedAt": "2026-10-18T04:00:00.000Z"
    }
  }
  ```
- **Errors:** `400 BAD_REQUEST`, `422 VALIDATION_ERROR`.

#### `GET /api/meetings/{meetingId}`
Fetches meeting details.

- **Response `200 OK`:** `{ "meeting": { ... } }`
- **Errors:** `404 NOT_FOUND`.

#### `POST /api/meetings/{meetingId}/documents`
Uploads a client PDF brief to a meeting draft.

- **Request:** `multipart/form-data` with:
  - `file`: PDF binary (up to 10 MB).
  - `type`: optional `"brief" | "notes" | "other"`.
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
      "summary": "KOVA Light low-sugar launch brief.",
      "extractedFacts": [
        {
          "id": "fact_01",
          "statement": "KOVA Light contains 5g cane sugar per 200ml can.",
          "category": "requirement",
          "provenance": "extracted",
          "pageOrSection": "Page 2 — Product Specs",
          "sourceDocumentId": "doc_kova_brief_01",
          "sourceDocumentName": "KOVA-Brand-Brief-2026.pdf",
          "confirmedByLead": false
        }
      ],
      "uploadedAt": "2026-10-18T04:01:00.000Z",
      "processedAt": "2026-10-18T04:01:03.000Z"
    }
  }
  ```
- **Errors:** `400 BAD_REQUEST`, `404 NOT_FOUND`, `422 UNPROCESSABLE_ENTITY` (unsupported format or size limit).

#### `POST /api/meetings/{meetingId}/facts`
Adds new Team Lead information not found in any client document (e.g. missing budget ceiling, campaign objective, or additional requirements).

- **Request Body (`CreateDocumentFactRequestSchema`):**
  ```json
  {
    "statement": "Total campaign budget ceiling is Rp250,000,000 for 6 weeks.",
    "category": "budget",
    "provenance": "lead_added",
    "confirmedByLead": true,
    "addedByRole": "Creative Team Lead",
    "addedByUserId": "usr_lead_01"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "fact": {
      "id": "fact_lead_9b2a1",
      "statement": "Total campaign budget ceiling is Rp250,000,000 for 6 weeks.",
      "category": "budget",
      "provenance": "lead_added",
      "confirmedByLead": true,
      "addedByRole": "Creative Team Lead",
      "addedByUserId": "usr_lead_01",
      "createdAt": "2026-10-18T05:00:00.000Z"
    }
  }
  ```
- **Errors:** `400 BAD_REQUEST`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`.

#### `PATCH /api/meetings/{meetingId}/facts/{factId}`
Corrects or confirms an extracted client fact during review.

- **Request Body (`UpdateDocumentFactRequestSchema`):**
  ```json
  {
    "statement": "KOVA Light contains 5g cane sugar per 200ml can (Arabica-Robusta blend)",
    "category": "requirement",
    "provenance": "confirmed",
    "confirmedByLead": true
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "fact": {
      "id": "fact_01",
      "statement": "KOVA Light contains 5g cane sugar per 200ml can (Arabica-Robusta blend)",
      "category": "requirement",
      "provenance": "confirmed",
      "confirmedByLead": true
    }
  }
  ```
- **Errors:** `404 NOT_FOUND`, `422 VALIDATION_ERROR`.

#### `POST /api/meetings/{meetingId}/finalize`
Finalizes meeting setup and marks it `ready` for employee preparation. Idempotent.

- **Request Body (`FinalizeMeetingRequestSchema`):**
  ```json
  {
    "clientObjective": "Drive trial among urban commuters in Jakarta & Surabaya",
    "targetAudience": "Urban Gen Z and young millennials (20-32)",
    "budgetCeilingIdr": 250000000,
    "clientRequirements": ["Highlight low-sugar without medical claims"],
    "constraints": ["No clinical health claims"]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "meeting": {
      "id": "mtg_kova_001",
      "status": "ready",
      "finalizedAt": "2026-10-18T04:02:00.000Z"
    }
  }
  ```
- **Errors:** `404 NOT_FOUND`, `409 CONFLICT` (if documents are still processing), `422 UNPROCESSABLE_ENTITY` (no documents attached).

#### `GET /api/meetings/{meetingId}/context`
Returns unified meeting context and grounded facts for AI grounding.

- **Response `200 OK` (`MeetingContextResponseSchema`):**
  ```json
  {
    "meeting": { ... },
    "documents": [ ... ],
    "synthesizedBrief": "KOVA is launching a low-sugar RTD coffee line with a Rp250M budget ceiling.",
    "keyFacts": [ ... ],
    "missingCategories": []
  }
  ```
- **Errors:** `404 NOT_FOUND`.

---

### 4.3 Participant-Specific Voice Sessions

#### `POST /api/sessions`
Initializes a role-aware preparation session for an assigned participant.

- **Request Body (`CreateSessionRequestSchema`):**
  ```json
  {
    "meetingId": "mtg_kova_001",
    "participantId": "usr_planner_01",
    "participantRole": "Creative Campaign Planner",
    "participantName": "Nadia Kusuma"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "session": {
      "id": "ses_kova_001",
      "meetingId": "mtg_kova_001",
      "participantId": "usr_planner_01",
      "participantRole": "Creative Campaign Planner",
      "currentStage": "UNDERSTAND",
      "status": "ringing",
      "startedAt": "2026-10-18T04:05:00.000Z"
    }
  }
  ```
- **Errors:** `404 NOT_FOUND`, `422 VALIDATION_ERROR`.

#### `GET /api/sessions/{sessionId}`
Retrieves session transcripts, decisions, and stage state.

- **Response `200 OK`:** `{ "session": { ... } }`
- **Errors:** `404 NOT_FOUND`.

#### `POST /api/sessions/{sessionId}/live-token`
Provisions ephemeral token for Gemini Live WebRTC/WebSocket.

- **Response `200 OK` (`LiveTokenResponseSchema`):**
  ```json
  {
    "sessionId": "ses_kova_001",
    "ephemeralToken": "eph_tok_...",
    "expiresAt": "2026-10-18T04:20:00.000Z",
    "stage": "UNDERSTAND"
  }
  ```

#### `POST /api/sessions/{sessionId}/events`
Appends transcripts or decisions with grounding source attribution.

- **Errors:** `404 NOT_FOUND`, `409 CONFLICT`, `422 VALIDATION_ERROR`.

#### `POST /api/sessions/{sessionId}/advance`
Advances through stages: `UNDERSTAND` -> `EXPLORE` -> `EVALUATE` -> `ALIGN`.

- **Errors:** `404 NOT_FOUND`, `409 INVALID_STAGE_TRANSITION`.

#### `POST /api/sessions/{sessionId}/complete`
Completes preparation session.

---

### 4.4 Individual Preparation Proposals

Each assigned employee has their own personal preparation output for each meeting they prepare for.
WOPS! does NOT generate a unified team proposal for an entire meeting.
The actual meeting is where employees share ideas, discuss differences, and make collective decisions.

#### `POST /api/sessions/{sessionId}/proposal`
Synthesizes the individual preparation proposal for the caller's completed session.

- **Request Body (`GenerateProposalRequestSchema`):**
  ```json
  {
    "selectedConceptId": "dir_01",
    "additionalNotes": "Focus on 3 PM transit corridors"
  }
  ```
- **Response `201 Created` (`PreparationProposalSchema`):**
  ```json
  {
    "proposal": {
      "id": "prop_kova_planner_001",
      "meetingId": "mtg_kova_001",
      "participantId": "usr_planner_01",
      "participantRole": "Creative Campaign Planner",
      "participantName": "Nadia Kusuma",
      "sessionId": "ses_kova_001",
      "title": "Campaign Strategy & Channel Allocation",
      "summary": "Strategic preparation for KOVA Light targeting Jakarta & Surabaya commuter corridors.",
      "status": "completed",
      "keyIdeas": [
        "Target MRT/KRL transit corridors during 3 PM commute slump",
        "Adopt 'Real Taste, Lighter Pace' positioning"
      ],
      "directions": [
        {
          "id": "dir_01",
          "title": "3 PM Tanpa Drama",
          "tagline": "Kopi Beneran, Gula Ringan.",
          "summary": "Own the 3 PM commuter slump in Jakarta and Surabaya.",
          "rationale": "Connects low-sugar spec to daily commuter habit.",
          "isRecommended": true
        }
      ],
      "recommendations": [
        {
          "id": "rec_01",
          "topic": "Channel Mix",
          "recommendation": "Rp120M creator seeding + Rp80M commuter transit hubs",
          "rationale": "Maximizes sampling volume under Rp250M ceiling",
          "isParticipantConfirmed": true
        }
      ],
      "confirmedDecisions": [
        {
          "id": "dec_01",
          "stage": "UNDERSTAND",
          "topic": "Corridor Targeting",
          "decision": "Prioritize MRT/KRL corridors in Jakarta and Surabaya",
          "rationale": "High concentration of target 20-32 demographic"
        }
      ],
      "sharedFacts": [
        {
          "id": "ref_01",
          "sourceType": "document_fact",
          "claimOrDecision": "5g cane sugar per 200ml can",
          "referenceId": "fact_01",
          "citationNote": "Page 2 — Product Specs"
        }
      ],
      "talkingPoints": [
        "Bring up MRT sampling permit timeline with account lead",
        "Confirm Surabaya on-ground logistics team"
      ],
      "openQuestions": [
        "Who manages daily inventory replenishment at sampling stations?"
      ],
      "assumptions": [
        "Station sampling permits cleared within 10 business days"
      ],
      "risks": [
        {
          "risk": "Unauthorized clinical or health claims by creators",
          "mitigation": "Strict creative briefing guardrails and pre-approval"
        }
      ],
      "constraints": [
        "Strict zero medical claims constraint"
      ],
      "missingInfo": [],
      "roleSections": [
        {
          "title": "Channel & Budget Allocation",
          "description": "Preliminary allocation under Rp250M ceiling",
          "items": [
            "TikTok Creator Partnerships: Rp120,000,000",
            "Commuter Station Sampling: Rp80,000,000",
            "Paid Amplification: Rp35,000,000",
            "Contingency Buffer: Rp15,000,000"
          ]
        }
      ],
      "createdAt": "2026-10-18T04:20:00.000Z",
      "updatedAt": "2026-10-18T04:20:00.000Z"
    }
  }
  ```
- **Errors:** `404 NOT_FOUND`, `422 UNPROCESSABLE_ENTITY`, `502 UPSTREAM_ERROR`.

#### `GET /api/proposals/{proposalId}`
Retrieves an individual preparation proposal by its ID.

- **Response `200 OK`:** `{ "proposal": { ... } }`
- **Errors:** `404 NOT_FOUND`.

#### `GET /api/proposals`
Lists individual preparation proposals for the authenticated employee (filter by `participantId` or `meetingId`).

- **Query Parameters:**
  - `participantId` (optional string): filter by participant identifier.
  - `meetingId` (optional string): filter by meeting identifier.
- **Response `200 OK`:**
  ```json
  {
    "proposals": [ ... ]
  }
  ```
- **Errors:** `401 UNAUTHORIZED`.

---

## 5. Shared Context Ownership & Role Permissions Architecture

### 5.1 Context Ownership Model

**Core Rule:**
```text
Shared Meeting Context = Client Brief Documents + Extracted Facts + Team Lead Additions/Corrections
```

Both original uploaded client documents and extracted/confirmed facts reside within the same Shared Meeting Context.
- **Team Lead** is the sole authorized custodian of the Shared Meeting Context.
- **Assigned Employees** receive an approved, read-only representation of the context to ground their individual, role-aware preparation sessions.
- An employee cannot modify shared documents or facts, nor can they alter another employee's preparation sessions.

### 5.2 Identity Modeling vs. Display Role Strings

- **Authorization Gap Identified:** In `MeetingSchema`, `leadRole` is currently stored as a display string (e.g. `"Creative Team Lead"`). In production, authorization MUST NOT rely on display strings or client-side selectors.
- **Required Backend Identity Model:**
  - `MeetingSchema` must specify `teamLeadUserId: string` (or `createdByUserId: string`).
  - Next.js server Route Handlers must inspect the caller's authenticated identity (`req.auth.userId` or session cookie).
  - Mutating shared context requires `callerUserId === meeting.teamLeadUserId`.
  - Frontend role selectors (such as the persona toggle) are strictly UI preview and demo simulators; backend endpoints must reject unauthorized requests with HTTP `403 Forbidden`.

### 5.3 Endpoint Authorization Matrix

| Endpoint | Method | Allowed Roles | Description / Preconditions |
| :--- | :--- | :--- | :--- |
| `/api/meetings` | `POST` | Authenticated User | Creates meeting; caller becomes `teamLeadUserId`. |
| `/api/meetings/{id}` | `GET` | Team Lead or Assigned Employee | Read meeting details. |
| `/api/meetings/{id}/context` | `GET` | Team Lead or Assigned Employee | Read unified shared context & facts. |
| `/api/meetings/{id}/documents` | `POST` | **Team Lead Only** | Upload client brief PDF to meeting. |
| `/api/meetings/{id}/documents/{docId}` | `DELETE` / `PUT` | **Team Lead Only** | Remove or replace document (pending backend contract extension). |
| `/api/meetings/{id}/facts` | `POST` | **Team Lead Only** | Add missing fact (`provenance: "lead_added"`). |
| `/api/meetings/{id}/facts/{factId}` | `PATCH` | **Team Lead Only** | Edit or confirm extracted fact (`provenance: "confirmed"`). |
| `/api/meetings/{id}/finalize` | `POST` | **Team Lead Only** | Finalize meeting setup and lock shared context. |
| `/api/sessions` | `POST` | Assigned Employee | Start session for caller's own `participantId`. |
| `/api/sessions/{id}/events` | `POST` | **Session Owner Only** | Append transcript or decision event to caller's session. |
| `/api/sessions/{id}/advance` | `POST` | **Session Owner Only** | Advance caller's session through skill stages. |
| `/api/sessions/{id}/proposal` | `POST` | **Session Owner Only** | Request personal preparation proposal synthesis for caller's completed session. |
| `/api/proposals/{id}` | `GET` | **Proposal Owner Only** | Read caller's personal preparation proposal. |
| `/api/proposals` | `GET` | Authenticated User | Read own personal preparation proposals. |

### 5.4 HTTP 403 Forbidden Specification

When a user attempts an unauthorized mutation (e.g. an employee attempts to upload a brief, edit a fact, or advance another employee's session), the server returns:

- **Status Code:** `403 Forbidden`
- **Body (`ApiErrorSchema`):**
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Only the meeting's authorized Team Lead can mutate shared meeting context.",
      "details": [
        {
          "field": "userId",
          "message": "User usr_planner_01 is an assigned participant but not the team lead (usr_lead_01)."
        }
      ],
      "requestId": "req_auth_789abc",
      "timestamp": "2026-10-18T06:30:00.000Z"
    }
  }
  ```

### 5.5 Document Lifecycle & Data Integrity Rules

1. **Raw Document Preservation:** Uploaded PDFs and extracted source statements are never overwritten or fabricated.
2. **Provenance Isolation:**
   - Raw facts: `provenance: "extracted"`, with `sourceDocumentId` and `pageOrSection`.
   - Lead-added facts: `provenance: "lead_added"`, `sourceDocumentId: undefined`.
   - Lead-corrected facts: `provenance: "confirmed"`, statement contains lead edits while preserving original raw excerpt in evidence history.
3. **Document Removal / Replacement Behavior:**
   - When a document is removed (`DELETE /documents/{id}`):
     - Unreviewed extracted facts (`provenance: "extracted"`) tied to that document are soft-deleted or marked `revoked`.
     - Confirmed facts (`provenance: "confirmed"`) are preserved as lead-confirmed institutional knowledge, with `sourceDocumentId` flagged as archived.
     - Lead-added facts (`provenance: "lead_added"`) remain completely unaffected.
     - `meeting.contextVersion` increments by 1.
4. **Session Version Immutability:**
   - Completed preparation sessions represent historical truth. A session snapshots or records `contextVersionAtStart`.
   - Modifying documents or facts increments `meeting.contextVersion` for future sessions without invalidating or altering completed session transcripts and decisions.

