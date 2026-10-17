# Frontend Mock Mode Guide (Developer A)

Because the backend endpoints (`/api/meetings`, `/api/meetings/{meetingId}`) are developed in parallel by Developer B, the frontend includes a strictly isolated mock adapter in [`src/lib/client/mock-meetings.ts`](./mock-meetings.ts).

## How to Enable Mock Mode

### Option 1: Environment Variable in `.env.local` (Recommended)
Add the following flag to your local `.env.local` file (do not commit `.env.local`):

```bash
NEXT_PUBLIC_USE_MOCK_API="true"
```

### Option 2: Workspace Topbar Switch (Local Development)
Click the **API Mode: Live / Mock (KOVA Demo)** pill in the top navigation bar to toggle the explicit `localStorage` flag (`wops:use_mock_api`) between:
- **Mock Mode (`true`)**: Seeds the fictional **KOVA** (`KOVA Light — Low-Sugar RTD Coffee Launch`, `mtg_kova_001`) meeting and persists newly created meetings in `localStorage`.
- **Live API Mode (`false`)**: Calls the real Next.js Route Handlers (`GET /api/meetings`, `POST /api/meetings`, `GET /api/meetings/{meetingId}`).

## Strict No-Silent-Fallback Guarantee
When Mock Mode is disabled (`false`), `meetings-api.ts` **never** silently falls back to mock data if a live API call fails or returns `404`. Instead, the UI renders an explicit error state with an option to retry or explicitly enable Mock Mode.
