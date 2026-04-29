# Worker Glasses Live Bridge

CareWalk receives Worker Glasses frames and visit events through the companion app. The web app shows the live frame stream, but saves only selected snapshots plus transcript snippets, checklist responses, Q&A, and hazard summaries.

## Frame Endpoint

```txt
POST /api/visits/:visitId/worker-glasses/frame
GET /api/visits/:visitId/worker-glasses/frame
```

```json
{
  "actorId": "worker_001",
  "actorRole": "worker",
  "frameId": "frame_001",
  "sessionToken": "worker_glasses_session_token_from_start_live",
  "captureContext": "hallway",
  "jpegBase64": "...",
  "sentAt": "2026-04-29T10:05:00.000Z"
}
```

Frames are held only in the server's in-memory preview buffer.

## Snapshot Endpoint

```txt
POST /api/visits/:visitId/worker-glasses/snapshot
```

Snapshots become pending Worker Glasses evidence and must go through review/redaction.

## Event Endpoint

```txt
POST /api/visits/:visitId/worker-glasses/events
GET /api/visits/:visitId/worker-glasses/events
```

Supported event types:

- `session_started`
- `transcript_chunk`
- `hazard_candidate`
- `question_answer`
- `checklist_prompt`
- `checklist_response`
- `session_ended`

## Question Endpoint

```txt
POST /api/visits/:visitId/worker-glasses/answer
```

The answer endpoint captures service questions with provider-confirmation guardrails. It does not promise worker availability, funding approval, clinical advice, or medication advice.

## Checklist Voice Endpoint

```txt
POST /api/visits/:visitId/checklist/voice
```

The PWA remains the source of truth for checklist state. Companion voice commands are parsed into `done`, `skip`, or `concern`, then linked to checklist evidence and structured observations for human review.

## End Session

```txt
POST /api/visits/:visitId/worker-glasses/end
```

Ending the session converts live events into structured observations for human review. Hazard candidates are deliberately not saved as visit observations before this step.

## Safety Rules

- Live mode requires granted consent for Worker Glasses media and voice note.
- Bedroom, bathroom interior, toileting, changing, and personal-care contexts are blocked.
- Raw live video is not stored.
- Checklist transcript snippets are stored as visit artefacts only after the worker has recorded consent for manual notes and voice note.
- Every generated observation still requires human review before visit outputs are approved.
