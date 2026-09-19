package com.loosebudget.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class VoiceWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_voice_1x1);

        // 1-Tap Voice Launch PendingIntent: Directly triggers the voice expense modal
        Intent voiceIntent = new Intent(context, MainActivity.class);
        voiceIntent.setAction(Intent.ACTION_VIEW);
        voiceIntent.setData(Uri.parse("expensetrack://voice"));
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent voicePendingIntent = PendingIntent.getActivity(
                context,
                2001,
                voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_voice_1x1_button, voicePendingIntent);
        views.setOnClickPendingIntent(R.id.widget_voice_1x1_root, voicePendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
