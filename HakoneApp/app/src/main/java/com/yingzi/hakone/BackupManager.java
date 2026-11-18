package com.yingzi.hakone;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;

/**
 * 存档备份：JSON 写入 backups/ 目录，只保留最近 KEEP 份，多的自动清理。
 */
public class BackupManager {
    private static final int KEEP = 2;
    private final Context ctx;

    public BackupManager(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    public File backupsDir() {
        File dir = ctx.getExternalFilesDir(null);
        File out = new File(dir != null ? dir : ctx.getFilesDir(), "backups");
        if (!out.exists()) out.mkdirs();
        return out;
    }

    public void saveBackup(String json) {
        try {
            File dir = backupsDir();
            String name = "backup_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date()) + ".json";
            File f = new File(dir, name);
            FileOutputStream fos = new FileOutputStream(f);
            OutputStreamWriter w = new OutputStreamWriter(fos, StandardCharsets.UTF_8);
            w.write(json);
            w.flush();
            w.close();
            prune(dir);
        } catch (Exception e) {
            // 备份失败静默，由上层提示
        }
    }

    private void prune(File dir) {
        File[] files = dir.listFiles(new FileFilterJson());
        if (files == null || files.length <= KEEP) return;
        Arrays.sort(files, Comparator.comparingLong(File::lastModified));
        for (int i = 0; i < files.length - KEEP; i++) {
            File f = files[i];
            if (f != null) f.delete();
        }
    }

    static class FileFilterJson implements java.io.FileFilter {
        @Override
        public boolean accept(File f) {
            return f.isFile() && f.getName().startsWith("backup_") && f.getName().endsWith(".json");
        }
    }
}