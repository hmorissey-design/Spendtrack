package com.loosebudget.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WalletBridgePlugin.class);
        handleVoiceIntent(getIntent());
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        handleVoiceIntent(intent);
        super.onNewIntent(intent);
    }

    private void handleVoiceIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if ("android.intent.action.CREATE_NOTE".equals(action) ||
            "com.google.android.gms.actions.CREATE_NOTE".equals(action) ||
            Intent.ACTION_SEND.equals(action)) {
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
