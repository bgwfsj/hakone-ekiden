package com.yingzi.hakone;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.widget.Toast;

/** 接收系统安装会话的完成广播：给用户明确结果，避免「下载完 100% 后没反应/卡住」 */
public class InstallReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"com.yingzi.hakone.INSTALL_DONE".equals(intent.getAction())) return;
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_SUCCESS) {
            Diagnostics.log(context, "update", "安装成功");
            Toast.makeText(context, "更新成功，正在打开新版本", Toast.LENGTH_LONG).show();
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