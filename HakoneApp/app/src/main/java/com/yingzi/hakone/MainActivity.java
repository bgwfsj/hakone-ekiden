package com.yingzi.hakone;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
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