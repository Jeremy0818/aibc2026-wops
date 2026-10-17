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
| `VALIDATION_ERROR` | `422` / `400` | Request body failed Zod schema validation |
| `NOT_FOUND` | `404` | Meeting, document, fact, session, or proposal does not exist |
| `CONFLICT` | `409` | State conflict (e.g. finalizing while documents are still processing) |
| `INVALID_STAGE_TRANSITION` | `409` | Attempted invalid `SkillStage` transition |
| `UNPROCESSABLE_ENTITY` | `422` | Business rule violation or unsupported file format |
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

### 4.4 Campaign Proposals (Cross-Role Synthesis)

#### `POST /api/sessions/{sessionId}/proposal`
Synthesizes proposal incorporating multi-session decisions and highlighting conflicts.

- **Request Body (`GenerateProposalRequestSchema`):**
  ```json
  {
    "selectedConceptId": "dir_01",
    "additionalNotes": "Keep Rp15M contingency reserve under ceiling",
    "sessionIds": ["ses_kova_001", "ses_kova_002"]
  }
  ```
- **Response `201 Created` (`CampaignProposalSchema`):**
  ```json
  {
    "proposal": {
      "id": "prop_kova_001",
      "meetingId": "mtg_kova_001",
      "sessionIds": ["ses_kova_001", "ses_kova_002"],
      "participantContributions": [
        {
          "participantId": "usr_planner_01",
          "participantName": "Nadia Kusuma",
          "participantRole": "Creative Campaign Planner",
          "decisionsCount": 4,
          "completedPrep": true
        },
        {
          "participantId": "usr_designer_01",
          "participantName": "Bima Wijaya",
          "participantRole": "Senior Brand Designer",
          "decisionsCount": 3,
          "completedPrep": true
        }
      ],
      "unresolvedConflicts": [],
      "totalBudgetIdr": 235000000
    }
  }
  ```
- **Errors:** `404 NOT_FOUND`, `422 UNPROCESSABLE_ENTITY`, `502 UPSTREAM_ERROR`.

#### `GET /api/proposals/{proposalId}`
Retrieves generated proposal.
