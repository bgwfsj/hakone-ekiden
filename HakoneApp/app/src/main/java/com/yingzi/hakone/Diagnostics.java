package com.yingzi.hakone;

import android.content.Context;
import android.net.Uri;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;

/** 轻量诊断日志：记录更新/崩溃信息，可在菜单「导出诊断日志」导出排查 */
public class Diagnostics {
    private static final int MAX_BYTES = 512 * 1024;

    public static File logFile(Context ctx) {
        File dir = ctx.getExternalFilesDir(null);
        if (dir == null) dir = ctx.getCacheDir();
        return new File(dir, "hakone_diag.log");
    }

    public static void log(Context ctx, String tag, String msg) {
        try {
            append(ctx, ts() + " [" + tag + "] " + msg);
        } catch (Throwable ignored) { }
    }

    public static void logCrash(Context ctx, Throwable t) {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append(ts()).append(" [crash] ").append(t.toString()).append('\n');
            StackTraceElement[] st = t.getStackTrace();
            if (st != null) {
                for (StackTraceElement e : st) sb.append("    at ").append(e.toString()).append('\n');
            }
            append(ctx, sb.toString());
        } catch (Throwable ignored) { }
    }

    private static String ts() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
    }

    private static synchronized void append(Context ctx, String line) throws Exception {
        File f = logFile(ctx);
        if (f.getParentFile() != null) f.getParentFile().mkdirs();
        byte[] existing = f.exists() ? java.nio.file.Files.readAllBytes(f.toPath()) : new byte[0];
        byte[] add = (line + "\n").getBytes(StandardCharsets.UTF_8);
        byte[] all = new byte[existing.length + add.length];
        System.arraycopy(existing, 0, all, 0, existing.length);
        System.arraycopy(add, 0, all, existing.length, add.length);
        if (all.length > MAX_BYTES) {
            all = Arrays.copyOfRange(all, all.length - MAX_BYTES, all.length);
        }
        FileOutputStream fos = new FileOutputStream(f);
        fos.write(all);
        fos.close();
    }

    /** 收集完整诊断文本 */
    public static String collect(Context ctx) {
        StringBuilder sb = new StringBuilder();
        sb.append("强风吹拂2 诊断日志\n");
        sb.append("版本: v").append(BuildConfig.VERSION_NAME)
          .append(" (code ").append(BuildConfig.VERSION_CODE).append(")\n");
        sb.append("Android: ").append(android.os.Build.VERSION.RELEASE)
          .append(" (SDK ").append(android.os.Build.VERSION.SDK_INT).append(")\n");
        sb.append("设备: ").append(android.os.Build.MANUFACTURER).append(' ').append(android.os.Build.MODEL).append('\n');
        sb.append("导出时间: ").append(ts()).append("\n\n");
        sb.append("---- 日志 ----\n");
        File f = logFile(ctx);
        if (f.exists()) {
            try {
                sb.append(new String(java.nio.file.Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8));
            } catch (Exception e) {
                sb.append("(读取日志失败)\n");
            }
        } else {
            sb.append("(暂无日志)\n");
        }
        return sb.toString();
    }

    /** 写入用户选择的文件（SAF） */
    public static void writeTo(Context ctx, Uri uri) throws Exception {
        OutputStream os = ctx.getContentResolver().openOutputStream(uri, "w");
        if (os == null) throw new Exception("无法打开目标文件");
        os.write(collect(ctx).getBytes(StandardCharsets.UTF_8));
        os.flush();
        os.close();
    }
}