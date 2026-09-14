package uk.co.projectsteel.mobile;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SteelHealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
