import SwiftUI

struct ContentView: View {
    @ObservedObject var model: CompanionModel

    var body: some View {
        NavigationStack {
            Form {
                Section("CareWalk Bridge") {
                    TextField("Server base URL", text: $model.serverBaseURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    TextField("Visit ID", text: $model.visitId)
                        .textInputAutocapitalization(.never)
                    TextField("Session token", text: $model.sessionToken, axis: .vertical)
                        .textInputAutocapitalization(.never)
                        .lineLimit(2...4)
                    Picker("Context", selection: $model.captureContext) {
                        Text("Hallway").tag("hallway")
                        Text("Entryway").tag("entryway")
                        Text("Kitchen").tag("kitchen")
                        Text("Living area").tag("general_living_area")
                        Text("Bathroom exterior").tag("bathroom_exterior")
                    }
                }

                Section("Worker Glasses Stream") {
                    HStack {
                        Circle()
                            .fill(model.isStreaming ? Color.green : Color.secondary)
                            .frame(width: 10, height: 10)
                        Text(model.status)
                    }
                    Button {
                        model.registerGlasses()
                    } label: {
                        Label("Register glasses", systemImage: "eyeglasses")
                    }
                    if let lastFrameAt = model.lastFrameAt {
                        Text("Last frame: \(lastFrameAt.formatted(date: .omitted, time: .standard))")
                    }
                    Text("Frames sent: \(model.framesSent)")

                    Button {
                        model.isStreaming ? model.stop() : model.start()
                    } label: {
                        Label(model.isStreaming ? "Stop Worker Glasses stream" : "Start Worker Glasses stream",
                              systemImage: model.isStreaming ? "stop.fill" : "play.fill")
                    }
                    .buttonStyle(.borderedProminent)
                }

                Section("Visit Artefacts") {
                    TextField("Transcript snippet", text: $model.transcriptDraft, axis: .vertical)
                        .lineLimit(2...4)
                    Button {
                        model.sendTranscriptDraft()
                    } label: {
                        Label("Send transcript event", systemImage: "text.bubble")
                    }

                    TextField("Checklist voice command", text: $model.checklistCommand, axis: .vertical)
                        .lineLimit(2...4)
                    Button {
                        model.sendChecklistCommand()
                    } label: {
                        Label("Send checklist command", systemImage: "checklist")
                    }
                }

                Section("Privacy") {
                    Text("This companion relays preview frames and visit artefacts only. CareWalk stores snapshots, transcript snippets, checklist evidence, and summaries, not raw continuous video.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Worker Glasses")
        }
    }
}

#Preview {
    ContentView(model: CompanionModel())
}
