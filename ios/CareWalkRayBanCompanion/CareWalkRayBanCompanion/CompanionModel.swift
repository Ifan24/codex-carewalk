import Foundation

@MainActor
final class CompanionModel: ObservableObject {
    @Published var serverBaseURL = "http://172.19.47.8:3000"
    @Published var visitId = "visit_001"
    @Published var sessionToken = ""
    @Published var captureContext = "hallway"
    @Published var status = "Standby"
    @Published var transcriptDraft = ""
    @Published var checklistCommand = ""
    @Published var lastFrameAt: Date?
    @Published var framesSent = 0
    @Published var isStreaming = false

    private let camera: RayBanCameraStreaming
    private var lastSentAt = Date.distantPast

    init(camera: RayBanCameraStreaming? = nil) {
        self.camera = camera ?? MetaWearablesCameraBridge()
    }

    func start() {
        guard !sessionToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            status = "Paste the CareWalk session token first."
            return
        }

        isStreaming = true
        status = "Connecting to Worker Glasses..."
        let client = CareWalkBridgeClient(
            serverBaseURL: serverBaseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")),
            visitId: visitId,
            sessionToken: sessionToken
        )

        Task {
            do {
                try await camera.startFrames { [weak self] frame in
                    guard let self else { return }
                    await self.send(frame, using: client)
                }
            } catch {
                await MainActor.run {
                    self.isStreaming = false
                    self.status = error.localizedDescription
                }
            }
        }
    }

    func registerGlasses() {
        status = "Opening glasses registration..."
        Task {
            do {
                try await MetaWearablesRegistration.start()
                await MainActor.run {
                    status = "Finish registration, then return here."
                }
            } catch {
                await MainActor.run {
                    status = MetaWearablesRegistration.describe(error)
                }
            }
        }
    }

    func handleOpenURL(_ url: URL) {
        Task {
            do {
                try await MetaWearablesRegistration.handle(url)
                await MainActor.run {
                    status = "Worker Glasses registration callback received."
                }
            } catch {
                await MainActor.run {
                    status = MetaWearablesRegistration.describe(error)
                }
            }
        }
    }

    func stop() {
        Task {
            await camera.stop()
            await MainActor.run {
                isStreaming = false
                status = "Stopped"
            }
        }
    }

    func sendTranscriptDraft() {
        let text = transcriptDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            status = "Enter transcript text first."
            return
        }

        let client = CareWalkBridgeClient(
            serverBaseURL: serverBaseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")),
            visitId: visitId,
            sessionToken: sessionToken
        )

        Task {
            do {
                try await client.postTranscript(text)
                await MainActor.run {
                    transcriptDraft = ""
                    status = "Transcript sent to CareWalk."
                }
            } catch {
                await MainActor.run {
                    status = "Transcript upload failed"
                }
            }
        }
    }

    func sendChecklistCommand() {
        let transcript = checklistCommand.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !transcript.isEmpty else {
            status = "Enter checklist command first."
            return
        }

        let client = CareWalkBridgeClient(
            serverBaseURL: serverBaseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")),
            visitId: visitId,
            sessionToken: sessionToken
        )

        Task {
            do {
                try await client.postChecklistVoice(transcript)
                await MainActor.run {
                    checklistCommand = ""
                    status = "Checklist response sent to CareWalk."
                }
            } catch {
                await MainActor.run {
                    status = "Checklist upload failed"
                }
            }
        }
    }

    private func send(_ frame: RayBanJPEGFrame, using client: CareWalkBridgeClient) async {
        let now = Date()
        guard now.timeIntervalSince(lastSentAt) >= 0.5 else { return }
        lastSentAt = now

        do {
            try await client.postFrame(frame, captureContext: captureContext)
            await MainActor.run {
                framesSent += 1
                lastFrameAt = frame.capturedAt
                status = "Streaming Worker Glasses"
            }
        } catch {
            await MainActor.run {
                status = "Frame upload failed"
            }
        }
    }
}
