package com.yingzi.hakone;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

/** 接收系统安装会话的完成广播：给用户明确结果，避免「下载完 100% 后没反应/卡住」 */
public class InstallReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"com.yingzi.hakone.INSTALL_DONE".equals(intent.getAction())) return;
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_SUCCESS) {
            Diagnostics.log(context, "update", "安装成功");
            // 通知兜底：后台拉起新版本可能被系统限制，通知一定能提醒到
            try {
                Intent launch = new Intent(context, MainActivity.class);
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                PendingIntent pi = PendingIntent.getActivity(context, 0, launch,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    if (android.os.Build.VERSION.SDK_INT >= 26) {
                        nm.createNotificationChannel(new NotificationChannel("update", "版本更新", NotificationManager.IMPORTANCE_HIGH));
                    }
                    NotificationCompat.Builder b = new NotificationCompat.Builder(context, "update")
                            .setSmallIcon(R.drawable.ic_stat_run)
                            .setContentTitle("更新成功")
                            .setContentText("已升级到新版本，点按打开")
                            .setContentIntent(pi)
                            .setAutoCancel(true)
                            .setPriority(NotificationCompat.PRIORITY_HIGH);
                    nm.notify(1002, b.build());
                }
            } catch (Throwable ignored) { }
            try {
                Intent launch = new Intent(context, MainActivity.class);
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(launch);
            } catch (Throwable ignored) { }
        } else {
            String extra = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            Diagnostics.log(context, "update", "安装失败 status=" + status + " msg=" + extra);
            String msg = "安装未完成：" + (extra != null && !extra.isEmpty() ? extra : "请到 GitHub Release 手动下载安装");
            Toast.makeText(context, msg, Toast.LENGTH_LONG).show();
        }
    }
}