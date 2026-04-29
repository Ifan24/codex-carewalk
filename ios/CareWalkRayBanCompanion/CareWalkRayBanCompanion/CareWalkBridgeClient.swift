import Foundation

struct CareWalkBridgeClient {
    var serverBaseURL: String
    var visitId: String
    var sessionToken: String

    func postFrame(_ frame: RayBanJPEGFrame, captureContext: String) async throws {
        guard let url = URL(string: "\(serverBaseURL)/api/visits/\(visitId)/worker-glasses/frame") else {
            throw BridgeError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(FrameUploadBody(
            actorId: "worker_001",
            actorRole: "worker",
            frameId: frame.id,
            sessionToken: sessionToken,
            captureContext: captureContext,
            jpegBase64: frame.jpegData.base64EncodedString(),
            sentAt: ISO8601DateFormatter().string(from: frame.capturedAt)
        ))

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw BridgeError.uploadFailed
        }
    }

    func postTranscript(_ text: String) async throws {
        guard let url = URL(string: "\(serverBaseURL)/api/visits/\(visitId)/worker-glasses/events") else {
            throw BridgeError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(LiveEventBody(
            actorId: "worker_001",
            actorRole: "worker",
            eventType: "transcript_chunk",
            payload: ["text": text]
        ))

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw BridgeError.uploadFailed
        }
    }

    func postChecklistVoice(_ transcript: String) async throws {
        guard let url = URL(string: "\(serverBaseURL)/api/visits/\(visitId)/checklist/voice") else {
            throw BridgeError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(ChecklistVoiceBody(
            actorId: "worker_001",
            actorRole: "worker",
            transcript: transcript
        ))

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw BridgeError.uploadFailed
        }
    }
}

private struct FrameUploadBody: Encodable {
    let actorId: String
    let actorRole: String
    let frameId: String
    let sessionToken: String
    let captureContext: String
    let jpegBase64: String
    let sentAt: String
}

private struct LiveEventBody: Encodable {
    let actorId: String
    let actorRole: String
    let eventType: String
    let payload: [String: String]
}

private struct ChecklistVoiceBody: Encodable {
    let actorId: String
    let actorRole: String
    let transcript: String
}

enum BridgeError: Error {
    case invalidURL
    case uploadFailed
}
