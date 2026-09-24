package com.xiaoxiaobaike.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 允许 WebView 内音频自动播放（进页即念故事）
        WebSettings webSettings = this.bridge.getWebView().getSettings();
        webSettings.setMediaPlaybackRequiresUserGesture(false);
    }
}
