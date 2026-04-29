# CareWalk - Worker Glasses Visit Flow

CareWalk is a consent-first visit copilot for aged care and home support providers. The worker PWA now follows a focused mobile flow: run sheet, patient, navigation, consent, Worker Glasses session, checklist, review, and supervisor submission.

## Worker Flow

1. Sign in as the worker.
2. Open Maggie Liu's visit from the run sheet.
3. Launch the preferred navigation app.
4. Record consent for notes, voice, Worker Glasses capture, and family summary.
5. Start the Worker Glasses live session.
6. Follow checklist prompts by tap or voice.
7. Save selected snapshots when needed.
8. End the session.
9. Generate the visit pack, approve the worker note, and submit to the supervisor.
10. Supervisors triage follow-up tasks for home hazards, dizziness check-ins, medication supply uncertainty, and service requests.

## Local Setup

```bash
corepack enable pnpm
pnpm install
pnpm db:generate
pnpm db:reset
pnpm dev --hostname 0.0.0.0
```

Open [http://localhost:3000](http://localhost:3000) on this computer or `http://172.19.47.8:3000` from a phone on the same network.

Use the sign-in roles shown on the login screen. The shared password is `carewalk`.

Environment variables are in `.env`:

```bash
DATABASE_URL="file:./dev.db"
AI_PROVIDER="stub"
NEXT_PUBLIC_DEMO_MODE="true"
```

## QA

```bash
pnpm lint
pnpm test
pnpm build
```

## Implementation Notes

- The Worker Glasses bridge contract is documented in [docs/worker-glasses-live-bridge.md](docs/worker-glasses-live-bridge.md).
- The iOS companion scaffold lives under the `ios/` workspace.
- Public APIs use `/api/visits/:visitId/worker-glasses/...`; legacy internal routes remain compatible.
- Worker Glasses media is modelled internally with the existing media source enum for compatibility.
- Private contexts such as bedroom, bathroom interior, toileting, changing, and personal care are blocked.
- Raw continuous video is not stored. CareWalk stores selected snapshots, transcript snippets, checklist evidence, event summaries, audit log, and generated reports.
- Family summaries never expose raw media, redaction details, audit details, or worker-only records.
