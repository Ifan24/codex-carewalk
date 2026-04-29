import Foundation
import UIKit

#if canImport(MWDATCore)
import MWDATCore
#endif

#if canImport(MWDATCamera)
import MWDATCamera
#endif

struct RayBanJPEGFrame: Identifiable {
    let id: String
    let jpegData: Data
    let capturedAt: Date
}

protocol RayBanCameraStreaming {
    func startFrames(onFrame: @escaping @Sendable (RayBanJPEGFrame) async -> Void) async throws
    func stop() async
}

@MainActor
final class MetaWearablesCameraBridge: RayBanCameraStreaming {
    private var isRunning = false
    #if canImport(MWDATCore) && canImport(MWDATCamera)
    private let wearables: WearablesInterface
    private var deviceSession: DeviceSession?
    private var streamSession: StreamSession?
    private var stateToken: AnyListenerToken?
    private var frameToken: AnyListenerToken?
    private var errorToken: AnyListenerToken?

    init(wearables: WearablesInterface = Wearables.shared) {
        self.wearables = wearables
    }
    #else
    init() {}
    #endif

    func startFrames(onFrame: @escaping @Sendable (RayBanJPEGFrame) async -> Void) async throws {
        isRunning = true

        #if canImport(MWDATCore) && canImport(MWDATCamera)
        let permission = Permission.camera
        var status = try await wearables.checkPermissionStatus(permission)
        if status != .granted {
            status = try await wearables.requestPermission(permission)
        }
        guard status == .granted else {
            throw MetaWearablesBridgeError.cameraPermissionDenied
        }

        let deviceSession = try await startedDeviceSession()
        let config = StreamSessionConfig(
            videoCodec: .raw,
            resolution: .low,
            frameRate: 15
        )
        guard let stream = try deviceSession.addStream(config: config) else {
            throw MetaWearablesBridgeError.streamCreationFailed
        }
        streamSession = stream

        stateToken = stream.statePublisher.listen { state in
            if state == .stopped {
                Task { @MainActor in
                    self.isRunning = false
                }
            }
        }

        errorToken = stream.errorPublisher.listen { error in
            NSLog("[CareWalkRayBan] stream error: \(String(describing: error))")
        }

        frameToken = stream.videoFramePublisher.listen { frame in
            guard let image = frame.makeUIImage(),
                  let jpegData = image.jpegData(compressionQuality: 0.58) else {
                return
            }
            let relayFrame = RayBanJPEGFrame(
                id: UUID().uuidString,
                jpegData: jpegData,
                capturedAt: Date()
            )
            Task {
                await onFrame(relayFrame)
            }
        }

        await stream.start()
        #else
        throw MetaWearablesBridgeError.sdkUnavailable
        #endif
    }

    func stop() async {
        isRunning = false
        #if canImport(MWDATCore) && canImport(MWDATCamera)
        stateToken = nil
        frameToken = nil
        errorToken = nil
        if let streamSession {
            await streamSession.stop()
        }
        streamSession = nil
        deviceSession?.stop()
        deviceSession = nil
        #endif
    }

    #if canImport(MWDATCore) && canImport(MWDATCamera)
    private func startedDeviceSession() async throws -> DeviceSession {
        if let deviceSession, deviceSession.state == .started {
            return deviceSession
        }

        if deviceSession?.state == .stopped {
            deviceSession = nil
        }

        let selector = AutoDeviceSelector(wearables: wearables)
        let session = try wearables.createSession(deviceSelector: selector)
        deviceSession = session

        let states = session.stateStream()
        try session.start()

        for await state in states {
            if state == .started {
                return session
            }
            if state == .stopped {
                deviceSession = nil
                throw MetaWearablesBridgeError.deviceSessionStopped
            }
        }

        throw MetaWearablesBridgeError.deviceSessionStopped
    }
    #endif
}

enum MetaWearablesBridgeError: LocalizedError {
    case sdkUnavailable
    case cameraPermissionDenied
    case deviceSessionStopped
    case streamCreationFailed

    var errorDescription: String? {
        switch self {
        case .sdkUnavailable:
            "Meta Wearables DAT iOS package is not available in this target yet."
        case .cameraPermissionDenied:
            "Worker Glasses camera permission was not granted."
        case .deviceSessionStopped:
            "Worker Glasses session stopped before streaming began."
        case .streamCreationFailed:
            "CareWalk could not start a Worker Glasses camera stream."
        }
    }
}

enum MetaWearablesRegistration {
    static func configure() {
        #if canImport(MWDATCore)
        do {
            try Wearables.configure()
        } catch {
            NSLog("[CareWalkRayBan] DAT configure failed: \(String(describing: error))")
        }
        #endif
    }

    static func start() async throws {
        #if canImport(MWDATCore)
        try await Wearables.shared.startRegistration()
        #else
        throw MetaWearablesBridgeError.sdkUnavailable
        #endif
    }

    static func handle(_ url: URL) async throws {
        #if canImport(MWDATCore)
        _ = try await Wearables.shared.handleUrl(url)
        #else
        throw MetaWearablesBridgeError.sdkUnavailable
        #endif
    }

    static func describe(_ error: Error) -> String {
        #if canImport(MWDATCore)
        if let registrationError = error as? RegistrationError {
            return "Registration failed: \(registrationError.description)"
        }
        if let callbackError = error as? WearablesHandleURLError {
            return "Glasses registration callback failed: \(String(describing: callbackError))"
        }
        #endif
        return error.localizedDescription
    }
}
