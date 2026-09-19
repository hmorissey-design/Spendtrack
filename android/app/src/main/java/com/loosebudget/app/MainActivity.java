package com.loosebudget.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        handleIncomingIntent(getIntent());
        super.onCreate(savedInstanceState);
        attachWidgetBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        attachWidgetBridge();
    }

    private void attachWidgetBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> {
                try {
                    bridge.getWebView().addJavascriptInterface(
                        new WidgetBridgeInterface(getApplicationContext()),
                        "AndroidWidgetBridge"
                    );
                    // Request web app to immediately synchronize the latest budget stats to the widget
                    bridge.getWebView().evaluateJavascript(
                        "if (typeof window.__syncWidgetBudget === 'function') { window.__syncWidgetBudget(); }",
                        null
                    );
                } catch (Exception ignored) {}
            });
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        handleIncomingIntent(intent);
        super.onNewIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action)) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text == null) {
                text = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            }
            if (text != null && !text.trim().isEmpty()) {
                Uri deepLink = Uri.parse("expensetrack://add?text=" + Uri.encode(text.trim()));
                intent.setData(deepLink);
                intent.setAction(Intent.ACTION_VIEW);
            }
        }
    }
}
