package com.yingzi.hakone;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int REQ_EXPORT = 1001;
    private static final int REQ_IMPORT = 1002;
    private WebView web;
    private BackupManager backupManager;
    private Updater updater;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        web.setBackgroundColor(Color.WHITE);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                        "if(window.Hakone&&window.Hakone.onNativeReady)window.Hakone.onNativeReady();", null);
            }
        });
        web.addJavascriptInterface(new Bridge(), "AppNative");
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);

        backupManager = new BackupManager(this);
        updater = new Updater(this, web, backupManager);
    }

    /** JS -> 原生 桥 */
    private class Bridge {
        @JavascriptInterface
        public void checkUpdate() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { updater.check(); }
            });
        }

        @JavascriptInterface
        public void backupNow() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    exportAndBackup(new Runnable() {
                        @Override
                        public void run() {
                            notifyPage("已备份 · 保留最近 2 份");
                        }
                    });
                }
            });
        }

        /** JS 端导出后直接交给原生保存 */
        @JavascriptInterface
        public void exportData() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE,
                            "强风吹拂2-存档-" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date()) + ".json");
                    try { startActivityForResult(intent, REQ_EXPORT); }
                    catch (Exception e) { notifyPage("导出失败：无法打开保存位置"); }
                }
            });
        }

        @JavascriptInterface
        public void importData() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*"); // .json 文件在各文件管理器里 MIME 不一，放宽选择后由 JS 校验
                    try { startActivityForResult(intent, REQ_IMPORT); }
                    catch (Exception e) { notifyPage("导入失败：无法打开文件选择器"); }
                }
            });
        }

        @JavascriptInterface
        public void saveBackup(final String json) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (json == null || json.isEmpty()) {
                        notifyPage("备份失败：没有可备份的数据");
                        return;
                    }
                    backupManager.saveBackup(json);
                    notifyPage("已备份 · 保留最近 2 份");
                }
            });
        }
    }

    /** 从页面导出完整数据（更新安装前自动备份用） */
    void exportAndBackup(final Runnable done) {
        web.evaluateJavascript("window.Hakone.getData()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                String json = null;
                try {
                    org.json.JSONObject o = new org.json.JSONObject(value);
                    json = o.optString("json");
                } catch (Exception ignored) { }
                if (json == null || json.isEmpty()) {
                    notifyPage("备份失败：数据为空");
                    return;
                }
                backupManager.saveBackup(json);
                if (done != null) done.run();
            }
        });
    }

    /** 原生 -> 页面 提示（走页面自己的 toast，保持统一 UI） */
    void notifyPage(final String msg) {
        web.post(new Runnable() {
            @Override
            public void run() {
                web.evaluateJavascript("window.Hakone.notify(" + org.json.JSONObject.quote(msg) + ")", null);
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
        final Uri uri = data.getData();
        if (requestCode == REQ_EXPORT) {
            fetchJsonFromPage("window.Hakone.exportJson()", new JsonCallback() {
                @Override
                public void onResult(String json) {
                    if (json == null || json.isEmpty()) { notifyPage("导出失败：没有数据"); return; }
                    writeToUri(uri, json, "已导出 JSON");
                }
            });
        } else if (requestCode == REQ_IMPORT) {
            final String content = readFromUri(uri);
            if (content == null || content.isEmpty()) { notifyPage("导入失败：文件为空"); return; }
            final String quoted = org.json.JSONObject.quote(content);
            web.post(new Runnable() {
                @Override
                public void run() {
                    web.evaluateJavascript("window.Hakone.importData(" + quoted + ")", null);
                }
            });
        }
    }

    interface JsonCallback { void onResult(String json); }

    /** 从页面取 JSON 字符串（JS 返回 {json:"..."} 对象） */
    private void fetchJsonFromPage(final String script, final JsonCallback cb) {
        web.evaluateJavascript(script, new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                String json = null;
                try {
                    org.json.JSONObject o = new org.json.JSONObject(value);
                    json = o.optString("json");
                } catch (Exception ignored) { }
                cb.onResult(json);
            }
        });
    }

    private void writeToUri(Uri uri, String content, String okMsg) {
        try {
            OutputStream os = getContentResolver().openOutputStream(uri, "w");
            if (os == null) { notifyPage("导出失败：无法写入"); return; }
            os.write(content.getBytes(StandardCharsets.UTF_8));
            os.flush();
            os.close();
            notifyPage(okMsg);
        } catch (Exception e) {
            notifyPage("导出失败：" + e.getMessage());
        }
    }

    private String readFromUri(Uri uri) {
        try {
            InputStream is = getContentResolver().openInputStream(uri);
            if (is == null) { notifyPage("导入失败：无法读取"); return null; }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) out.write(buf, 0, n);
            is.close();
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            notifyPage("导入失败：无法读取文件");
            return null;
        }
    }

    @Override
    public void onBackPressed() {
        // 页面有弹层时先关弹层，否则走系统返回
        web.evaluateJavascript(
                "window.Hakone&&window.Hakone.onBack?window.Hakone.onBack():false",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (!"true".equals(value)) {
                            MainActivity.super.onBackPressed();
                        }
                    }
                });
    }
}