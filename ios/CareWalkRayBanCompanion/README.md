# CareWalk Worker Glasses Companion

This iOS companion sends consented Worker Glasses frames and visit events to the CareWalk web app.

## Setup

1. Open the iOS project in Xcode.
2. Add the app files to the companion target.
3. Add Meta Wearables Device Access Toolkit through Swift Package Manager.
4. Configure the developer application id in `Info.plist`.
5. Pair the glasses with the official mobile stack, then enable developer access for the companion app.

## Runtime Flow

1. In CareWalk web, open the visit capture page and tap `Start live`.
2. Copy the network server base URL and generated session token into this companion.
3. Connect the glasses.
4. Tap `Start Worker Glasses stream`.
5. Send transcript snippets or checklist voice commands when available.

The companion posts frames to:

```txt
POST /api/visits/:visitId/worker-glasses/frame
```

The companion can also post visit artefacts to:

```txt
POST /api/visits/:visitId/worker-glasses/events
POST /api/visits/:visitId/checklist/voice
```

CareWalk stores selected snapshots, transcript snippets, checklist evidence, and summaries after consent. It does not store raw continuous video.
