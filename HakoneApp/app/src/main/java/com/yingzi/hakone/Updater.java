package com.yingzi.hakone;

import android.Manifest;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.WebView;

import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 应用内更新：
 * 1. 查 GitHub Releases/latest（API 优先，失败自动改用网页接口，再不行走加速镜像，避免限流/被阻断）
 * 2. 发现新版本 -> 弹窗确认 -> 先自动备份存档（保留最近 2 份）-> 下载
 * 3. 下载直连 GitHub，不畅时自动切换镜像通道；SHA-256 校验通过后经 FileProvider 唤起系统安装器
 */
public class Updater {
    /** GitHub 仓库：在线更新从这里拉取 Release */
    private static final String OWNER = "bgwfsj";
    private static final String REPO = "hakone-ekiden";
    private static final String UA = "HakoneEkiden-Update/1.0";
    private static final String CHANNEL_ID = "update";
    private static final int NOTIFY_ID = 1001;
    /** 加速镜像前缀：直连 GitHub 不畅时自动切换 */
    private static final String MIRROR = "https://gh-proxy.com/";

    private final MainActivity activity;
    private final WebView web;
    private final BackupManager backupManager;

    public Updater(MainActivity activity, WebView web, BackupManager backupManager) {
        this.activity = activity;
        this.web = web;
        this.backupManager = backupManager;
    }

    static class UpdateInfo {
        String version;
        String apiAssetUrl;
        String browserUrl;
        String mirrorUrl;
        String sha256;
        UpdateInfo(String version, String apiAssetUrl, String browserUrl, String mirrorUrl, String sha256) {
            this.version = version;
            this.apiAssetUrl = apiAssetUrl;
            this.browserUrl = browserUrl;
            this.mirrorUrl = mirrorUrl;
            this.sha256 = sha256;
        }
    }

    public void check() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                UpdateInfo info = fetchLatest();
                if (info == null) {
                    notifyPage("检查更新失败（网络或限流）");
                    return;
                }
                String cur = BuildConfig.VERSION_NAME;
                if (!isNewer(info.version, cur)) {
                    notifyPage("已是最新版本 v" + cur);
                    return;
                }
                final UpdateInfo fi = info;
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() { showUpdateDialog(fi); }
                });
            }
        }).start();
    }

    private UpdateInfo fetchLatest() {
        // 1) GitHub API 直连
        UpdateInfo info = tryApi("https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases/latest");
        if (info != null) return info;

        // 2) GitHub 网页接口兜底（没有 API 配额限制）
        info = tryWeb("https://github.com/" + OWNER + "/" + REPO + "/releases/latest");
        if (info != null) return info;

        // 3) 加速镜像兜底（gh-proxy.com）：直连被限流/阻断时走这里
        info = tryApi(MIRROR + "https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases/latest");
        if (info != null) return info;

        return null;
    }

    private UpdateInfo tryApi(String urlStr) {
        try {
            JSONObject rel = getJson(urlStr);
            if (rel != null) {
                String tag = rel.optString("tag_name", "");
                String version = tag.startsWith("v") ? tag.substring(1) : tag;
                JSONArray assets = rel.optJSONArray("assets");
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject a = assets.optJSONObject(i);
                        if (a == null) continue;
                        if (a.optString("name", "").endsWith(".apk")) {
                            String digest = a.optString("digest", "");
                            String sha = digest.startsWith("sha256:") ? digest.substring(7) : null;
                            String dl = a.optString("browser_download_url", null);
                            return new UpdateInfo(version, a.optString("url", null), dl,
                                    dl != null ? MIRROR + dl : null, sha);
                        }
                    }
                }
            }
        } catch (Exception ignored) { }
        return null;
    }

    private UpdateInfo tryWeb(String latestUrl) {
        try {
            String finalUrl = getFinalUrl(latestUrl);
            Matcher m = Pattern.compile("releases/tag/([^/?#]+)").matcher(finalUrl);
            if (m.find()) {
                String tag = m.group(1);
                String page = getText("https://github.com/" + OWNER + "/" + REPO + "/releases/expanded_assets/" + tag, "text/html");
                if (page != null) {
                    Matcher am = Pattern.compile("href=\"([^\"]*\\.apk)\"").matcher(page);
                    if (am.find()) {
                        String href = am.group(1);
                        String file = href.substring(href.lastIndexOf('/') + 1);
                        String dl = "https://github.com/" + OWNER + "/" + REPO + "/releases/download/" + tag + "/" + file;
                        String version = tag.startsWith("v") ? tag.substring(1) : tag;
                        return new UpdateInfo(version, null, dl, MIRROR + dl, null);
                    }
                }
            }
        } catch (Exception ignored) { }
        return null;
    }

    private JSONObject getJson(String urlStr) {
        String text = getText(urlStr);
        if (text == null) return null;
        try { return new JSONObject(text); } catch (Exception e) { return null; }
    }

    private String getText(String urlStr) {
        return getText(urlStr, "application/vnd.github+json");
    }

    private String getText(String urlStr, String accept) {
        HttpURLConnection c = null;
        try {
            URL u = new URL(urlStr);
            c = (HttpURLConnection) u.openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(15000);
            c.setReadTimeout(20000);
            c.setRequestProperty("User-Agent", UA);
            c.setRequestProperty("Accept", accept);
            int code = c.getResponseCode();
            InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in == null) return null;
            BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
            r.close();
            return sb.toString();
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private String getFinalUrl(String urlStr) {
        HttpURLConnection c = null;
        try {
            URL u = new URL(urlStr);
            c = (HttpURLConnection) u.openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(15000);
            c.setRequestProperty("User-Agent", UA);
            c.connect();
            return c.getURL().toString();
        } catch (Exception e) {
            return urlStr;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private boolean isNewer(String remote, String cur) {
        int[] a = parseVersion(remote), b = parseVersion(cur);
        for (int i = 0; i < 3; i++) {
            if (a[i] > b[i]) return true;
            if (a[i] < b[i]) return false;
        }
        return false;
    }

    private int[] parseVersion(String v) {
        int[] r = new int[3];
        String[] parts = v.split("\\.");
        for (int i = 0; i < 3 && i < parts.length; i++) {
            try { r[i] = Integer.parseInt(parts[i].replaceAll("[^0-9]", "")); } catch (Exception e) { r[i] = 0; }
        }
        return r;
    }

    private void showUpdateDialog(final UpdateInfo info) {
        ensureNotifyPermission();
        new AlertDialog.Builder(activity)
                .setTitle("发现新版本 v" + info.version)
                .setMessage("更新前会自动备份当前存档（备份只保留最近 2 份）")
                .setPositiveButton("更新", (d, w) -> backupAndUpdate(info))
                .setNegativeButton("稍后", null)
                .show();
    }

    private void backupAndUpdate(final UpdateInfo info) {
        activity.exportAndBackup(new Runnable() {
            @Override
            public void run() {
                notifyPage("已备份当前存档，开始下载…");
                downloadAndInstall(info);
            }
        });
    }

    private void downloadAndInstall(final UpdateInfo info) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                File dir = new File(activity.getCacheDir(), "update");
                if (!dir.exists()) dir.mkdirs();
                final File apk = new File(dir, "hakone.apk");
                if (apk.exists()) apk.delete();
                // 1) 直连 GitHub 下载
                String direct = info.browserUrl != null ? info.browserUrl : info.apiAssetUrl;
                int r = downloadFrom(direct, apk, info.sha256, info.browserUrl == null);
                // 2) 直连失败/校验失败 -> 自动切换加速镜像
                if (r != 200 && info.mirrorUrl != null) {
                    notifyPage("直连不畅，切换镜像通道下载…");
                    apk.delete();
                    r = downloadFrom(info.mirrorUrl, apk, info.sha256, false);
                }
                if (r != 200) {
                    notifyPage(r < 0 ? "下载失败（网络错误），请稍后重试" : "下载失败（HTTP " + r + "），请稍后重试");
                    apk.delete();
                    return;
                }
                progressDone("下载完成，准备安装…");
                final File fapk = apk;
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() { install(fapk); }
                });
            }
        }).start();
    }

    /** @return 200=成功；-1=网络异常；-2=SHA-256 校验失败；其他=HTTP 状态码 */
    private int downloadFrom(String urlStr, File apk, String sha, boolean apiAsset) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(urlStr).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(20000);
            c.setReadTimeout(60000);
            c.setRequestProperty("User-Agent", UA);
            if (apiAsset) c.setRequestProperty("Accept", "application/octet-stream");
            int code = c.getResponseCode();
            if (code != 200) return code;
            long size = c.getContentLengthLong();
            InputStream in = c.getInputStream();
            FileOutputStream fos = new FileOutputStream(apk);
            byte[] buf = new byte[8192];
            int n;
            long done = 0;
            while ((n = in.read(buf)) > 0) {
                fos.write(buf, 0, n);
                done += n;
                updateProgress(done, size);
            }
            fos.close();
            in.close();
            if (sha != null && !sha256(apk).equalsIgnoreCase(sha)) return -2;
            if (sha == null) {
                FileInputStream fi = new FileInputStream(apk);
                byte[] head = new byte[4];
                if (fi.read(head) != 4 || head[0] != 'P' || head[1] != 'K') { fi.close(); return -3; }
                fi.close();
            }
            return 200;
        } catch (Exception e) {
            return -1;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private void updateProgress(long done, long size) {
        NotificationManager nm = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        int pct = size > 0 ? (int) (done * 100 / size) : 0;
        NotificationCompat.Builder b = new NotificationCompat.Builder(activity, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_run)
                .setContentTitle("正在下载更新")
                .setContentText(pct + "%（" + (size / 1024 / 1024) + " MB）")
                .setProgress(size > 0 ? 100 : 0, pct, size <= 0)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW);
        nm.notify(NOTIFY_ID, b.build());
    }

    private void progressDone(String text) {
        NotificationManager nm = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationCompat.Builder b = new NotificationCompat.Builder(activity, CHANNEL_ID)
                .setContentTitle("更新")
                .setContentText(text)
                .setProgress(0, 0, false)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        nm.notify(NOTIFY_ID, b.build());
    }

    private void ensureNotifyPermission() {
        NotificationManager nm = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "版本更新", NotificationManager.IMPORTANCE_LOW));
        }
        if (Build.VERSION.SDK_INT >= 33
                && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 100);
        }
    }

    private void install(File apk) {
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(activity)
                    .setTitle("需要允许安装")
                    .setMessage("更新需要安装新版本，请允许「安装未知应用」")
                    .setPositiveButton("去设置", (d, w) -> {
                        Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + activity.getPackageName()));
                        activity.startActivity(i);
                    })
                    .setNegativeButton("取消", null)
                    .show();
            return;
        }
        // 1) 系统安装会话（自带确认界面，兼容性最好）
        if (Build.VERSION.SDK_INT >= 21) {
            try {
                if (installViaSession(apk)) return;
            } catch (Exception ignored) { }
        }
        // 2) 文件共享 + 系统安装器兜底
        try {
            Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            NotificationManager nm = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NOTIFY_ID);
            return;
        } catch (Exception e) {
            notifyPage("自动安装失败，请到 GitHub Release 手动下载安装");
        }
    }

    /** PackageInstaller 会话安装：系统自带确认界面，不依赖外部安装器 */
    private boolean installViaSession(File apk) {
        PackageInstaller.Session session = null;
        try {
            PackageInstaller pi = activity.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            int sessionId = pi.createSession(params);
            session = pi.openSession(sessionId);
            InputStream in = new FileInputStream(apk);
            OutputStream out = session.openWrite("hakone.apk", 0, apk.length());
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            out.close();
            in.close();
            Intent done = new Intent("com.yingzi.hakone.INSTALL_DONE");
            PendingIntent pending = PendingIntent.getBroadcast(activity, 0, done,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            session.commit(pending.getIntentSender());
            session.close();
            session = null;
            NotificationManager nm = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NOTIFY_ID);
            return true;
        } catch (Exception e) {
            if (session != null) { try { session.abandon(); } catch (Exception ignored) { } }
            return false;
        }
    }

    private String sha256(File f) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            InputStream in = new FileInputStream(f);
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
            in.close();
            StringBuilder sb = new StringBuilder();
            for (byte b : md.digest()) sb.append(String.format(Locale.US, "%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private void notifyPage(final String msg) {
        activity.notifyPage(msg);
    }
}