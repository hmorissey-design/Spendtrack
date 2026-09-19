package com.loosebudget.app;

import android.content.Context;
import android.webkit.JavascriptInterface;

public class WidgetBridgeInterface {
    private final Context context;

    public WidgetBridgeInterface(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public void updateBudget(String remainingAmount, String statusText) {
        if (remainingAmount != null && !remainingAmount.trim().isEmpty()) {
            BudgetVoiceWidgetProvider.saveBudgetData(
                context,
                remainingAmount.trim(),
                statusText != null && !statusText.trim().isEmpty() ? statusText.trim() : "On Track"
            );
        }
    }
}
