package com.chatprivado.app;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebStorage;
import android.widget.Toast;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;

public class MainActivity extends Activity {

    // Production URL — points to the live Render app
    private static final String APP_URL = "https://chat-privado-lxfk.onrender.com/";
    private static final String TAG = "ChatPrivado";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 🔒 FLAG_SECURE: blocks screenshots AND screen recording
        // When someone tries to screenshot or record, the screen shows black/empty
        Window window = getWindow();
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        // Status bar with solid background
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0a0a0a"));

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        // Essential settings for modern web app
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        // NO CACHE — always load from network so the app always shows the latest version
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        // Allow file upload from camera/gallery
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        // Enable proper viewport
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        // Enable smooth scrolling
        settings.setBuiltInZoomControls(false);
        // Set recognizable User-Agent
        settings.setUserAgentString(settings.getUserAgentString() + " ChatPrivado/1.1 (Android)");

        // Enable cookies (essential for session auth)
        android.webkit.CookieManager.getInstance().setAcceptCookie(true);
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // Clear old cache on every launch — fresh start every time
        webView.clearCache(true);
        webView.clearHistory();
        WebStorage.getInstance().deleteAllData();
        // Clear cookies too, so old expired sessions don't cause issues
        android.webkit.CookieManager.getInstance().removeAllCookies(null);
        android.webkit.CookieManager.getInstance().flush();

        // WebViewClient — handles URL loading + errors
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri.getHost() != null && (uri.getHost().contains("onrender.com") || uri.getHost().contains("cloudflarestorage.com"))) {
                    return false; // load in-app
                }
                // Open external links (like R2 downloads if needed) in browser
                startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, uri));
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                Log.e(TAG, "WebView error: " + error.getDescription() + " code=" + error.getErrorCode());
                // Show offline message if main page fails
                if (request.isForMainFrame()) {
                    view.loadData(
                        "<html><body style='background:#0a0a0a;color:#fff;font-family:sans-serif;text-align:center;padding:40px;'>" +
                        "<h2 style='color:#10b981;'>Sin conexión</h2>" +
                        "<p>No se pudo conectar al servidor.</p>" +
                        "<p style='color:#888;font-size:14px;'>Verifica tu internet e intenta abrir la app de nuevo.</p>" +
                        "<p style='color:#666;font-size:12px;margin-top:30px;'>URL: " + APP_URL + "</p>" +
                        "</body></html>",
                        "text/html", "UTF-8"
                    );
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // Let all requests go through normally (don't intercept)
                return super.shouldInterceptRequest(view, request);
            }
        });

        // WebChromeClient — handles permissions (camera, mic) + file chooser
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        // Grant ALL requested permissions (camera, mic, etc.)
                        request.grant(request.getResources());
                    }
                });
            }
        });

        // Load the app
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            Log.i(TAG, "Loading URL: " + APP_URL);
            webView.loadUrl(APP_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Re-apply FLAG_SECURE on resume (some Android versions reset it)
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
