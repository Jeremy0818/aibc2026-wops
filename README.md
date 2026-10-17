# WOPS! (Work Out Problems Swiftly)

> **"Less Chit. More Chat."**  
> AI-powered meeting preparation through proactive, voice-first structured ideation.

---

## Overview

**WOPS!** is a proactive, voice-first AI thinking partner designed to help teams prepare for high-stakes meetings through structured ideation. Instead of starting meetings unprepared or with scattered notes, teams collaborate with WOPS! to digest briefs, work through guided thinking stages, and synthesize actionable proposals.

### Demo Use Case: KOVA Coffee
A creative agency uses WOPS! to prepare a launch campaign for **KOVA**, a fictional Indonesian ready-to-drink (RTD) coffee brand introducing a new low-sugar coffee line.

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **API Layer:** Next.js Route Handlers
- **Validation & Contracts:** Zod
- **AI & Cloud (Planned Integration):**
  - Gemini Live API (real-time voice ideation)
  - Google Cloud Storage (document & brief storage)
  - Google Cloud Firestore (meetings, sessions, and proposals persistence)

---

## Architecture & Directory Structure

```text
src/
  app/
    (workspace)/          # Frontend workspace route group
      page.tsx            # WOPS! landing / dashboard view
      meetings/           # Meeting preparation routes
      proposals/          # Campaign proposal routes
    api/
      health/
        route.ts          # GET /api/health service check
  components/
    layout/               # Shell, navigation, and page layout components
    meetings/             # Meeting brief & context components
    voice/                # Voice-first ideation controls & visualizers
    proposals/            # Campaign proposal preview & editor components
    ui/                   # Reusable atomic UI primitives
  hooks/                  # Client-side React hooks
  lib/
    client/               # Browser API wrappers & client utilities
    server/               # Server-only services (GCP, Firestore, GCS, Gemini)
    skills/               # AI facilitation & structured ideation skill engine
  contracts/              # Shared Zod schemas & TypeScript types
    meeting.ts            # Meeting contract
    document.ts           # Document contract
    session.ts            # Preparation Session contract
    proposal.ts           # Campaign Proposal contract
  types/                  # Shared auxiliary TypeScript definitions
```

### Team Ownership
See [`AGENTS.md`](./AGENTS.md) for detailed module ownership boundaries:
- **Developer A:** Frontend pages, components, hooks, and client services.
- **Developer B:** API routes, server services, and skill engine.
- **Shared Contracts (`src/contracts/`):** Require team agreement before changes.

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in values as integrations are enabled:

```bash
cp .env.example .env.local
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the WOPS! dashboard, or verify the health endpoint at [http://localhost:3000/api/health](http://localhost:3000/api/health).

### 4. Verification Scripts

```bash
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript compiler check (tsc --noEmit)
npm run build       # Build for production
```
