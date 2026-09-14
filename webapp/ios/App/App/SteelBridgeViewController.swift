import Capacitor

/// Registers Steel's native plugins inside the iOS shell only. The shared web
/// client therefore remains unable to access HealthKit directly.
final class SteelBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginType(SteelHealthKitPlugin.self)
    }
}
