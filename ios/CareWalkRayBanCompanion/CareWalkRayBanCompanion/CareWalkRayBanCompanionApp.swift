import SwiftUI

@main
struct CareWalkRayBanCompanionApp: App {
    @StateObject private var model = CompanionModel()

    init() {
        MetaWearablesRegistration.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView(model: model)
                .onOpenURL { url in
                    model.handleOpenURL(url)
                }
        }
    }
}
