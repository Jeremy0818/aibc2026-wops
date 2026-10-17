# WOPS! — Work Out Problems Swiftly

**Less Chit. More Chat.**

> **A proactive, voice-first AI thinking partner that helps teams turn unclear challenges into informed decisions before the meeting begins.**

WOPS! is built around a simple belief: **better meetings begin before everyone enters the room.** Rather than spending valuable meeting time discovering the problem, brainstorming from scratch, and debating unstructured ideas, WOPS! helps participants arrive with a clearer understanding of the challenge, evaluated options, and actionable next steps.

WOPS! is **not** another meeting recorder, transcription tool, or post-meeting summarizer. Its primary job happens **before the meeting**: helping people think.

## Why WOPS! Exists

Meetings often start with uneven context. Participants may have received a brief but not fully explored its implications, considered alternatives, or identified the decisions the group actually needs to make. As a result, time is spent aligning on basics instead of moving forward.

WOPS! addresses this preparation gap through an interactive AI conversation. It makes it easier to:

- **Understand the challenge** — clarify goals, constraints, stakeholders, and missing information.
- **Explore possibilities** — generate distinct, relevant approaches rather than settle on the first idea.
- **Evaluate trade-offs** — consider feasibility, impact, originality, and risks.
- **Align on direction** — identify a preferred option, open questions, and concrete next steps.

The aim is not to replace human judgment. It is to **strengthen the thinking people bring to collaborative decisions**.

## The Experience

WOPS! combines the accessibility of a natural voice conversation with the discipline of a structured decision-making workflow.

1. **A team lead creates a meeting.** They describe the purpose, objectives, requirements, participants, constraints, and available budget.
2. **Relevant context is attached.** Client briefs and supporting PDFs provide the facts and boundaries of the discussion.
3. **WOPS! initiates a preparation call.** A participant sees an in-app simulated incoming call and accepts a real-time AI voice conversation.
4. **The participant thinks out loud with AI.** WOPS! asks questions, challenges assumptions, and explores possible approaches through guided stages.
5. **A direction is selected.** The participant reviews alternatives and confirms decisions, while unresolved questions remain visible.
6. **A meeting-ready artifact is generated.** WOPS! produces a structured proposal grounded in the source materials and the choices made during the conversation.

The incoming call is an **in-app experience**, not a telephone-network call. The product is designed to be **voice-first**, with visual controls and readable outputs supporting the conversation.

## Demo Story: KOVA Creative Campaign

Our hackathon demonstration follows a creative agency preparing a launch campaign for **KOVA**, a **fictional Indonesian ready-to-drink coffee brand** introducing a low-sugar iced coffee line.

**The Creative Team Lead** sets up a campaign ideation meeting and provides a client brief: the campaign objectives, audience, brand considerations, required deliverables, timeline, and budget ceiling.

**The Creative Campaign Planner** receives a WOPS! preparation call. Together, the planner and AI clarify the brief, brainstorm campaign territories, assess different creative directions, and settle on a recommended approach.

The resulting **Creative Campaign Proposal** is intended to capture:

- Executive summary, client context, objectives, and audience insight
- Multiple creative directions and the selected big idea
- Key messages, activations, channels, and creator strategy
- A six-week indicative timeline
- Budget breakdown and total spend **at or below IDR 250,000,000**
- KPIs, risks, source references, assumptions, and next steps

The proposal is a **starting point for team discussion**, not an automatically approved campaign. WOPS! should avoid unsupported claims about health or product benefits and distinguish documented facts from AI suggestions.

## The Thinking Framework

WOPS! guides preparation through four deliberate stages:

| Stage | Core question | Expected outcome |
| --- | --- | --- |
| **UNDERSTAND** | What problem are we actually solving? | Objectives, constraints, evidence, and unknowns |
| **EXPLORE** | What could we do? | Multiple differentiated directions |
| **EVALUATE** | Which options hold up, and why? | Trade-offs, feasibility, risks, and comparisons |
| **ALIGN** | What are we taking into the meeting? | Preferred direction, decisions, and next steps |

These stages are more than labels in the interface. The intended design uses a **backend-owned skill state machine** to track progress, preserve decisions, and validate stage transitions. The AI guides the dialogue; application logic maintains the workflow state.

## Product Principles

**Preparation over documentation.** WOPS! creates value before the meeting, rather than simply recording what was said afterward.

**Conversation over forms.** Speaking naturally lowers the barrier to exploring half-formed ideas. Structured outputs capture the useful results.

**Guidance without taking over.** AI proposes, probes, and evaluates. People retain ownership of decisions.

**Evidence before invention.** Client documents and user-confirmed choices must be distinguishable from assumptions or AI-generated possibilities.

**Multiple options before commitment.** Good ideation considers alternatives and their trade-offs before selecting a direction.

**Actionable outcomes.** The end product should help a team make progress, not merely summarize a conversation.

**Honest system behavior.** A simulated call interface must not be confused with a real phone call; mocked services must not be presented as live integrations.

## System Overview

The project uses a **full-stack Next.js and TypeScript** architecture, designed to keep the web experience, API contracts, and backend orchestration in one codebase.

```text
Creative Team Lead / Creative Campaign Planner
                       |
                       v
            Next.js Web Experience
       (dashboard, meeting, voice, proposal)
                       |
          +------------+-------------+
          |                          |
          v                          v
 Next.js Route Handlers      Browser Gemini Live Client
 (meetings, documents,       (microphone, audio playback,
  sessions, tokens,           real-time conversation)
  proposal generation)                 |
          |                            v
          |                     Gemini Live API
          v
 Server-side services
 (document context, skill state,
  proposal generation, persistence)
          |
          +--> Gemini text generation
          +--> Google Cloud Storage (planned)
          +--> Firestore (planned)
```

**Security boundary:** Permanent API credentials belong on the server. The planned Gemini Live integration uses a supported, short-lived client authentication mechanism where available; exact token support and model configuration must be verified against the current SDK and provider documentation. The browser should never receive a permanent Gemini API key.

**Document boundary:** Uploaded PDFs are contextual evidence, not trusted instructions. Source attribution and explicit handling of assumptions are central to the design.

## Technology Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Application | Next.js App Router | UI routes and server API routes |
| Language | TypeScript | Shared types across client and server |
| Styling | Tailwind CSS | Responsive interface |
| Validation | Zod | Runtime validation and shared contracts |
| Voice AI | Gemini Live API *(planned)* | Real-time conversational preparation |
| Proposal AI | Gemini text generation *(planned)* | Structured campaign proposal |
| File storage | Google Cloud Storage *(planned)* | Client documents |
| Persistence | Firestore *(planned)* | Meetings, sessions, decisions, proposals |

The architecture prioritizes a demonstrable end-to-end workflow over unnecessary infrastructure. Advanced retrieval, such as Vertex AI RAG Engine, is a possible later enhancement—not a prerequisite for the MVP.

## Repository Structure

```text
src/
├── app/
│   ├── (workspace)/         # Product pages: dashboard, meetings, proposals
│   └── api/                 # Next.js Route Handlers
│       └── health/          # Initial health endpoint
├── components/
│   ├── layout/
│   ├── meetings/
│   ├── voice/
│   ├── proposals/
│   └── ui/
├── hooks/                   # Client-side React hooks
├── lib/
│   ├── client/              # Browser-facing integrations
│   ├── server/              # Server-only services
│   └── skills/              # AI skill orchestration
├── contracts/               # Shared Zod schemas and TypeScript types
│   ├── meeting.ts
│   ├── document.ts
│   ├── session.ts
│   ├── proposal.ts
│   ├── error.ts
│   └── index.ts
└── types/                   # Additional shared types as needed

API_CONTRACT.md              # Endpoint and payload specification
AGENTS.md                    # Development ownership and agent guidelines
.env.example                 # Safe environment variable placeholders
```

The `src/contracts/` directory is the shared boundary between frontend and backend. Both sides should use the same request and response definitions rather than inventing parallel types.

## Collaboration Model

WOPS! is developed collaboratively with two developers, each using an Antigravity coding environment against the same GitHub repository.

| Owner | Responsibility | Primary areas |
| --- | --- | --- |
| **Developer A — Frontend & Voice UX** | User journey, meeting forms, call experience, audio client, proposal presentation | `src/app/(workspace)/`, `src/components/`, `src/hooks/`, `src/lib/client/` |
| **Developer B — Backend & AI** | APIs, document processing, secure Live authentication, session state, skill engine, proposal generation | `src/app/api/`, `src/lib/server/`, `src/lib/skills/` |
| **Shared** | API contracts, schemas, configuration changes, integration tests | `src/contracts/`, `API_CONTRACT.md`, shared config |

Development branches are expected to follow `feat/frontend-creative-flow` and `feat/backend-ai-engine`. Shared schema changes should be agreed on before either agent modifies them. See `AGENTS.md` for repository-specific working rules.

## Development Status

WOPS! is currently in the **foundation and contract-definition phase**. The following status reflects the latest reported Antigravity work; it is not a claim that all product functionality has been implemented.

**Reported as completed and validated:**
- Next.js + TypeScript project foundation and workspace structure
- Minimal WOPS! landing/dashboard placeholder
- `GET /api/health` route
- Shared Zod schemas for meetings, documents, sessions, proposals, and errors
- `API_CONTRACT.md` covering the proposed MVP endpoints
- Lint, TypeScript checks, and runtime contract validation

**Planned / not yet verified end to end:**
- Meeting creation and listing APIs and UI
- PDF upload, extraction, and source-grounded context
- Real Gemini Live browser voice conversation
- Skill-stage transitions, transcript and decision persistence
- Generated Creative Campaign Proposal
- Google Cloud deployment and persistent storage

The primary MVP success criterion is **one real, demonstrable journey** from meeting creation and client context to guided voice ideation and a grounded proposal.

## Getting Started

### Prerequisites

- Node.js and npm compatible with the project's Next.js version
- Access to the repository
- Provider credentials only when implementing or testing the relevant integrations

### Local development

```bash
git clone https://github.com/Oki-B/aibc2026-wops.git
cd aibc2026-wops
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The health route is available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

### Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Use `.env.example` as a reference for local configuration. Keep actual secrets in local environment files that are ignored by Git. Never commit Gemini API keys or Google Cloud service-account credentials.

## What Success Looks Like

WOPS! succeeds when a participant enters a meeting **better prepared to contribute**: they understand the brief, have explored credible alternatives, can explain their recommendation, and know which decisions still need to be made.

The ambition is broader than the KOVA demo. Creative planning is our first concrete use case; the underlying preparation framework can apply to product planning, strategy, operations, and other collaborative decisions.

---

**WOPS! — Work Out Problems Swiftly**  
*Less Chit. More Chat.*
