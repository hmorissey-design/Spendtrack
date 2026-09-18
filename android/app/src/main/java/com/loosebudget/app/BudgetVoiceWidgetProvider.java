package com.loosebudget.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

public class BudgetVoiceWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "LooseBudgetWidgetPrefs";
    private static final String KEY_REMAINING = "remaining_budget_str";
    private static final String KEY_STATUS = "budget_status_str";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_budget_voice);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String remaining = prefs.getString(KEY_REMAINING, "$--.--");
        String status = prefs.getString(KEY_STATUS, "Tap to update");

        views.setTextViewText(R.id.widget_remaining_amount, remaining);
        views.setTextViewText(R.id.widget_status, status);

        // 1. Click on Voice Button -> Launches app directly into 1-Tap Voice Expense Modal
        Intent voiceIntent = new Intent(context, MainActivity.class);
        voiceIntent.setAction(Intent.ACTION_VIEW);
        voiceIntent.setData(Uri.parse("expensetrack://voice"));
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent voicePendingIntent = PendingIntent.getActivity(
                context,
                1001,
                voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_voice_button, voicePendingIntent);

        // 2. Click on Budget Container -> Opens Dashboard
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.setAction(Intent.ACTION_VIEW);
        appIntent.setData(Uri.parse("expensetrack://dashboard"));
        appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent appPendingIntent = PendingIntent.getActivity(
                context,
                1002,
                appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_budget_container, appPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_root, appPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void saveBudgetData(Context context, String remainingAmount, String statusText) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
             .putString(KEY_REMAINING, remainingAmount)
             .putString(KEY_STATUS, statusText)
             .apply();

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(
                new android.content.ComponentName(context, BudgetVoiceWidgetProvider.class)
        );
        for (int id : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id);
        }
    }
}
