<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# WOPS! Agent & Developer Ownership Guide

## Project Context
**WOPS!** (*Work Out Problems Swiftly*) — *"Less Chit. More Chat."*  
A proactive, voice-first AI thinking partner that helps teams prepare for meetings through structured ideation.

## File & Module Ownership

### Developer A — Frontend & Client Experience
Owns all user-facing UI, client state, and browser/voice interactions:
- **Frontend Pages (`src/app/(workspace)/**`)**: Workspace dashboard, meetings views, proposals views, and layouts.
- **Components (`src/components/**`)**: `layout/`, `meetings/`, `voice/`, `proposals/`, and `ui/`.
- **Hooks (`src/hooks/**`)**: Custom React hooks for UI state, audio capture/playback, and session lifecycle.
- **Client Services (`src/lib/client/**`)**: Browser-side API clients, WebSocket/WebRTC helpers, and audio utilities.

### Developer B — Backend, Cloud & AI Engine
Owns server endpoints, cloud integrations, and AI orchestration:
- **API Routes (`src/app/api/**`)**: Next.js Route Handlers (e.g., `/api/health`, session endpoints, document endpoints).
- **Server Services (`src/lib/server/**`)**: Google Cloud Storage, Firestore, Gemini Live API server integration, and server-side utilities.
- **Skill Engine (`src/lib/skills/**`)**: Structured ideation prompts, facilitation skills, and proposal synthesis logic.

### Shared Contracts (`src/contracts/**` & `src/types/**`)
- `src/contracts/meeting.ts`
- `src/contracts/document.ts`
- `src/contracts/session.ts`
- `src/contracts/proposal.ts`
- `src/types/**`

> **IMPORTANT:** Shared contracts and types define the boundary between Developer A and Developer B. **All changes to `src/contracts/**` and `src/types/**` require explicit team agreement** before modification.
