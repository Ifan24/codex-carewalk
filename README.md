# CareWalk - AI Worker Glasses Visit Review

CareWalk is a consent-first visit copilot for aged care and home support providers. The worker PWA follows a focused mobile flow: run sheet, patient, navigation, consent, Worker Glasses session, checklist, AI-assisted review, visit-pack generation, and supervisor submission.

The Sydney Codex Hackathon build adds a mobile-first review workflow that uses AI to generate a submit-readiness field sheet from mock visit evidence, keeps clinical uncertainty explicit, and routes worker sign-off plus supervisor review as final gates.

## What Was Built During The Hackathon

- Mobile-first review page with a full submit-readiness workflow instead of a generic card stack.
- AI review-checklist endpoint at `/api/visits/:visitId/review-checklist`.
- GPT-backed checklist generation through the OpenAI Responses API, with a local demo fallback when no API key is present.
- Neon/PostgreSQL persistence through Prisma.
- Demo evidence cards for rug hazard, medication supply follow-up, and dizziness chat.
- Polished worker review flow: readiness summary, draft visit pack, evidence review, checklist side rail, escalation summary, and final supervisor submit.

## Worker Flow

1. Sign in as the worker.
2. Open Maggie Liu's visit from the run sheet.
3. Launch the preferred navigation app.
4. Record consent for notes, voice, Worker Glasses capture, and family summary.
5. Start the Worker Glasses live session.
6. Follow checklist prompts by tap or voice.
7. Save selected snapshots when needed.
8. End the session.
9. Generate the AI submit-readiness review.
10. Generate the visit pack, approve the worker note, and submit to the supervisor.
11. Supervisors triage follow-up tasks for home hazards, dizziness check-ins, medication supply uncertainty, and service requests.

## Local Setup

```bash
corepack enable pnpm
pnpm install
pnpm db:generate
pnpm db:reset
pnpm dev --hostname 0.0.0.0
```

Open [http://localhost:3000](http://localhost:3000) on this computer, or use the network URL printed by Next.js from a phone on the same Wi-Fi.

Use the sign-in roles shown on the login screen. The shared password is `carewalk`.

Environment variables are in `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require"
AI_PROVIDER="stub"
NEXT_PUBLIC_DEMO_MODE="true"
OPENAI_REVIEW_MODEL="gpt-5.5"
OPENAI_API_KEY="sk-..."
```

`OPENAI_API_KEY` is optional for local demos. Without it, the AI review checklist uses a deterministic demo fallback.

## Vercel Deploy

The repo includes `vercel.json` so Vercel installs with pnpm, generates Prisma Client, and builds the Next.js app.

Set these environment variables in Vercel Project Settings before deploying:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require"
AI_PROVIDER="stub"
NEXT_PUBLIC_DEMO_MODE="true"
OPENAI_REVIEW_MODEL="gpt-5.5"
OPENAI_API_KEY="sk-..."
```

Then seed the shared demo database once from a local terminal:

```bash
pnpm db:seed
```

Use the same Neon `DATABASE_URL` locally and in Vercel when you want the deployed demo to show the seeded Maggie Liu visit.

## QA

```bash
pnpm lint
pnpm test
pnpm build
```

The test suite uses the configured `DATABASE_URL`. When pointed at Neon it can take around a minute because DB-backed integration tests reset and reseed remote data.

## Implementation Notes

- The Worker Glasses bridge contract is documented in [docs/worker-glasses-live-bridge.md](docs/worker-glasses-live-bridge.md).
- The iOS companion scaffold lives under the `ios/` workspace.
- Public APIs use `/api/visits/:visitId/worker-glasses/...`; legacy internal routes remain compatible.
- AI submit-readiness review uses `/api/visits/:visitId/review-checklist` and returns structured checklist items with `title`, `status`, `result`, and `rationale`.
- Worker Glasses media is modelled internally with the existing media source enum for compatibility.
- Private contexts such as bedroom, bathroom interior, toileting, changing, and personal care are blocked.
- Raw continuous video is not stored. CareWalk stores selected snapshots, transcript snippets, checklist evidence, event summaries, audit log, and generated reports.
- Family summaries never expose raw media, redaction details, audit details, or worker-only records.

## Demo Script

1. Sign in as the worker with password `carewalk`.
2. Open Maggie Liu's visit from the dashboard.
3. Record consent and continue through the Worker Glasses/checklist flow.
4. On the review page, generate the AI submit-readiness sheet.
5. Generate the visit pack, review the worker note, and submit to supervisor.
6. Open the supervisor dashboard to show the submitted review and follow-up queue.
