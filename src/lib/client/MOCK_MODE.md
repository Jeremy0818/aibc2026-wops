# Frontend Mock Mode Guide (Developer A)

Because the backend endpoints (`/api/meetings`, `/api/meetings/{meetingId}`, `/api/meetings/{meetingId}/documents`, `/api/meetings/{meetingId}/context`) are developed in parallel by Developer B, the frontend includes a strictly isolated mock adapter in [`src/lib/client/mock-meetings.ts`](./mock-meetings.ts).

## How to Enable Mock Mode

### Option 1: Environment Variable in `.env.local` (Recommended)
Add the following flag to your local `.env.local` file (do not commit `.env.local`):

```bash
NEXT_PUBLIC_USE_MOCK_API="true"
```

### Option 2: Workspace Header Switch (Local Development)
Click the **Demo mode / Live API** pill in the top header to toggle the explicit `localStorage` flag (`wops:use_mock_api`) between:
- **Demo Mode (`true`)**:
  - Seeds the fictional **KOVA** (`KOVA Light — Low-Sugar RTD Coffee Launch`, `mtg_kova_001`) meeting with **shared context** and **multiple assigned participants**:
    - `Raka Pratama` (`usr_lead_01`, `Creative Team Lead`) — Meeting Lead
    - `Nadia Kusuma` (`usr_planner_01`, `Creative Campaign Planner`) — Assigned Employee Role 1
    - `Bima Wijaya` (`usr_designer_01`, `Senior Brand Designer`) — Assigned Employee Role 2
  - Seeds the shared grounded PDF document (`KOVA-Brand-Brief-2026.pdf`, `doc_kova_brief_01`) with 4 extracted brief facts attached once at the meeting level.
  - **Create Meeting (`/meetings/new`) is document-first**: basics, multi-file client document selection (PDF now up to 10 MB; DOCX/PPTX shown as "planned" and safely rejected), employee assignment, and in-place review. Under Contract V2, the UI creates a minimal draft without requiring manual transcription of client requirements (`clientObjective`, `targetAudience`, and `budgetCeilingIdr` are extracted from documents), uploads documents sequentially with real-time progress, renders categorized source facts with provenance, and transitions status from `draft` to `ready` via an explicit **"Confirm & Finalize Setup"** action (`POST /api/meetings/{id}/finalize`).
  - Readiness requires explicit Team Lead confirmation via **Confirm & Finalize Setup** (either during creation or on `/meetings/[meetingId]`). Meetings remain in `draft` until finalized.
  - Existing meetings (`/meetings/[meetingId]`) still support adding/retrying shared PDFs, including the one-click **"Attach sample KOVA PDF"** helper.
  - Supports **Employee Role-Aware Preparation** (`/prepare` → `/prepare/[meetingId]`): includes a clearly labeled **Demo Employee Role Switcher** so evaluators can compare how **Creative Campaign Planner** vs. **Senior Brand Designer** receive role-specific AI focus areas and 4-stage prompts (`Understand → Explore → Evaluate → Align`) while viewing the **exact same** read-only shared client brief and PDF facts without re-uploading the PDF.
  - Uploading a PDF whose filename includes `"fail"` or `"corrupt"` deterministically simulates a `failed` processing state (`processingStatus: "failed"`) to test error and retry flows.
  - Uploading a PDF whose filename includes `"empty"` or `"blank"` deterministically simulates a `ready` document with `extractedFacts: []` to test the empty-facts grounded preview state.
- **Live API Mode (`false`)**:
  - Calls the real Next.js Route Handlers (`GET /api/meetings`, `POST /api/meetings`, `GET /api/meetings/{meetingId}`, `POST /api/meetings/{meetingId}/documents`, `GET /api/meetings/{meetingId}/context`).

## Strict No-Silent-Fallback Guarantee
When Demo Mode is disabled (`false`), `meetings-api.ts` and `documents-api.ts` **never** silently fall back to mock data if a live API call fails or returns `404`. Instead, the UI renders an explicit error state with an option to retry or explicitly enable Demo Mode.
