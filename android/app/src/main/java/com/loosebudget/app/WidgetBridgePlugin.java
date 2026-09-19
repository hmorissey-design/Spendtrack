package com.loosebudget.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateBudget(PluginCall call) {
        String remaining = call.getString("remaining");
        String status = call.getString("status");

        if (remaining != null && !remaining.trim().isEmpty()) {
            BudgetVoiceWidgetProvider.saveBudgetData(
                getContext(),
                remaining.trim(),
                status != null && !status.trim().isEmpty() ? status.trim() : "On Track"
            );
        }
        call.resolve();
    }
}
