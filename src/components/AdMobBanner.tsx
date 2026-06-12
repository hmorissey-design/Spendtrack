/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Info, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';

interface AdMobBannerProps {
  adUnitId?: string;
  className?: string;
  themeColor?: string;
}

// Simulated dynamic ads to bring life to the preview
const SIMULATED_ADS = [
  {
    title: "Google Pixel 9 Pro with Gemini",
    desc: "Experience Google's most advanced AI phone yet. Pre-order now and get $200 store credit.",
    cta: "Shop Now",
    badge: "Ad • Google",
    url: "https://pixel.google"
  },
  {
    title: "YouTube Premium Free Trial",
    desc: "Ad-free videos, offline downloads, and background play. Get 3 months free on us.",
    cta: "Try Free",
    badge: "Ad • YouTube",
    url: "https://youtube.com/premium"
  },
  {
    title: "NerdWallet - Manage Smart",
    desc: "Compare cards, high-yield savings accounts, and track your net worth in real-time.",
    cta: "Download App",
    badge: "Ad • NerdWallet",
    url: "https://nerdwallet.com"
  },
  {
    title: "AdMob Test Banner Ad",
    desc: "Nice work! Your integration works. Test ID: ca-app-pub-3940256099942544/6300978111",
    cta: "Get Started",
    badge: "Ad • Google AdMob",
    url: "https://google.com/admob"
  }
];

export function AdMobBanner({ adUnitId = 'ca-app-pub-3940256099942544/6300978111', className = '', themeColor = 'blue' }: AdMobBannerProps) {
  const [currentAdIndex, setCurrentAdIndex] = useState(3); // Start with AdMob Test Banner
  const [copied, setCopied] = useState<string | null>(null);
  const [showIntegrationDocs, setShowIntegrationDocs] = useState(false);

  useEffect(() => {
    // Cycle ads every 15 seconds to simulate real ad refreshing banners
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % SIMULATED_ADS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => {
      setCopied(null);
    }, 2000);
  };

  const currentAd = SIMULATED_ADS[currentAdIndex];

  // Integration code templates
  const manifestsXml = `<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />

    <application>
        <!-- Sample AdMob App ID: client-specific play store value -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-3940256099942544~3347511713"/>
    </application>
</manifest>`;

  const kotlinIntegrationCode = `// MainActivity.kt - Android SDK initialization
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.AdSize

class MainActivity : AppCompatActivity() {
    private lateinit var mAdView: AdView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main)

        // Initialize Mobile Ads SDK
        MobileAds.initialize(this) {}

        // Bind and Load standard banner layout
        mAdView = findViewById(R.id.adView)
        val adRequest = AdRequest.Builder().build()
        mAdView.loadAd(adRequest)
    }
}`;

  const reactNativeCapacitorCode = `// React / React Native integration using capacitor-community/admob
import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } from '@capacitor-community/admob';

export async function initializeAdMob() {
  await AdMob.initialize({
    requestTrackingAuthorization: true,
  });
}

export async function showBannerAd() {
  const options = {
    adId: 'ca-app-pub-3940256099942544/6300978111', // Test Unit ID
    adSize: BannerAdSize.SHRINK_AND_GROW,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 60,
    isTesting: true
  };
  await AdMob.showBanner(options);
}`;

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-dashed border-white/10 bg-[#111111] p-2 text-white transition-all ${className}`} id="admob_component_wrapper">
      {/* Banner Area */}
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1.5 text-[10px] text-gray-500 font-mono">
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 bg-white/10 font-bold tracking-wider rounded-inner text-emerald-400 uppercase text-[9px] border border-white/5">GOOGLE ADMOB</span>
          <span className="text-gray-500 hidden sm:inline">Unit ID: ca-app-pur.../6300978111</span>
        </div>
        <button 
          onClick={() => setShowIntegrationDocs(!showIntegrationDocs)}
          className="flex items-center gap-0.5 text-emerald-500 hover:text-emerald-400 transition-colors font-medium font-sans cursor-pointer text-[10px] uppercase tracking-wider"
        >
          <Info size={11} />
          {showIntegrationDocs ? 'Hide SDK' : 'View Android SDK Code'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 bg-[#0A0A0A] p-2 border border-white/5 rounded-lg relative group min-h-[50px]">
        {/* Banner Ad Content */}
        <div className="flex-1 min-w-0 pr-12">
          <div className="flex items-center gap-1.5">
            <span className="inline-block px-1 py-0.5 text-[8px] tracking-wider font-extrabold uppercase rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 leading-none">
              {currentAd.badge}
            </span>
            <h4 className="text-xs font-semibold text-gray-200 truncate">{currentAd.title}</h4>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-tight line-clamp-1 italic">{currentAd.desc}</p>
        </div>

        {/* CTA Button */}
        <div>
          <button 
            onClick={() => window.open(currentAd.url, '_blank')}
            className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-md flex items-center gap-1 border-0 outline-hidden transition-all duration-150 cursor-pointer uppercase tracking-wider"
          >
            {currentAd.cta}
          </button>
        </div>

        {/* Floating Google AdMob Symbol */}
        <div className="absolute right-1.5 top-1 text-[7px] text-gray-600 group-hover:text-emerald-400 pointer-events-none font-bold tracking-wider uppercase transition-colors">
          Smart Banner
        </div>
      </div>

      {/* Embedded SDK Panel */}
      {showIntegrationDocs && (
        <div className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2 border-b border-slate-800 pb-2 mb-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-100">Ready for AdMob Play Store Approval</p>
              <p className="text-[10px] text-slate-400">Below are the concrete codes included in your bundle setup for compile options:</p>
            </div>
          </div>

          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-1 mb-1 font-mono">1. Platform Setup Guidelines</p>
          <div className="text-[11px] text-slate-300 space-y-1 mb-3">
            <p>• Make sure to request Google Developer ID access inside Android Console prior to final release.</p>
            <p>• Replace your AdMob Test Unit ID <code className="bg-slate-800 px-1 rounded text-red-300 select-all font-mono">ca-app-pub-3940256099942544/6300978111</code> with your production unit ID in the components once registered.</p>
          </div>

          {/* Android Manifest Tab */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-t-md font-mono border-b border-slate-800">
                <span>AndroidManifest.xml Setup</span>
                <button 
                  onClick={() => handleCopy(manifestsXml, 'manifest')}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied === 'manifest' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copied === 'manifest' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2 bg-slate-950 font-mono text-[9px] text-emerald-400 overflow-x-auto rounded-b-md max-h-[120px]">
                {manifestsXml}
              </pre>
            </div>

            {/* Kotlin AdMob Controller */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-t-md font-mono border-b border-slate-800">
                <span>Native Android Kotlin SDK Loader</span>
                <button 
                  onClick={() => handleCopy(kotlinIntegrationCode, 'kotlin')}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied === 'kotlin' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copied === 'kotlin' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2 bg-slate-950 font-mono text-[9px] text-amber-300 overflow-x-auto rounded-b-md max-h-[120px]">
                {kotlinIntegrationCode}
              </pre>
            </div>

            {/* Hybrid Capacitor Setup */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-t-md font-mono border-b border-slate-800">
                <span>Hybrid Web (React/Cordova/Capacitor) Bind</span>
                <button 
                  onClick={() => handleCopy(reactNativeCapacitorCode, 'hybrid')}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied === 'hybrid' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copied === 'hybrid' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2 bg-slate-950 font-mono text-[9px] text-indigo-300 overflow-x-auto rounded-b-md max-h-[120px]">
                {reactNativeCapacitorCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
