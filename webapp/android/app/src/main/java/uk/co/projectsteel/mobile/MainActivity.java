package uk.co.projectsteel.mobile;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SteelHealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
        // The Android emulator can retain stale WebView tiles during SPA navigation.
        // Keep the workaround emulator-only so physical devices retain hardware compositing.
        if (isEmulator() && getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null);
        }
    }

    private boolean isEmulator() {
        String fingerprint = android.os.Build.FINGERPRINT;
        String model = android.os.Build.MODEL;
        return fingerprint.startsWith("generic") || fingerprint.startsWith("unknown")
                || model.contains("sdk_gphone") || model.contains("Emulator");
    }
}
