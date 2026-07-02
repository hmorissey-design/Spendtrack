/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Info, Copy, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface AdMobBannerProps {
  adUnitId?: string; // Standard AdMob Unit ID or AdSense Slot ID
  isTopAd?: boolean; // Determines which default slot to load if not specified
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
    title: "SpendTrack PWA Mobile Ads",
    desc: "AdSense Auto Ads are fully responsive for 100% of mobile phone web screens.",
    cta: "Learn More",
    badge: "Ad • Google AdSense",
    url: "https://google.com/adsense"
  }
];

export function AdMobBanner({ adUnitId, isTopAd = false, className = '', themeColor = 'blue' }: AdMobBannerProps) {
  const [currentAdIndex, setCurrentAdIndex] = useState(3); // Start with AdSense / AdMob Test Banner
  const [copied, setCopied] = useState<string | null>(null);
  const [showIntegrationDocs, setShowIntegrationDocs] = useState(false);

  // Read environment variables for Google AdSense
  const adsenseClientId = (import.meta.env.VITE_ADSENSE_CLIENT_ID || '').trim();
  const adsenseSlotId = (adUnitId || (isTopAd ? import.meta.env.VITE_ADSENSE_TOP_SLOT_ID : import.meta.env.VITE_ADSENSE_BOTTOM_SLOT_ID) || '').trim();

  const isLiveAdSenseActive = Boolean(adsenseClientId && adsenseSlotId);

  useEffect(() => {
    // Only cycle ads when simulated
    if (isLiveAdSenseActive) return;

    // Cycle ads every 15 seconds to simulate real ad refreshing banners
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % SIMULATED_ADS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [isLiveAdSenseActive]);

  useEffect(() => {
    if (isLiveAdSenseActive) {
      // 1. Check & Inject AdSense global client script in <head> if not already present
      const scriptId = 'adsense-global-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }

      // 2. Trigger the adsbygoogle push event for this ad slot
      try {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      } catch (e) {
        console.log("AdSense unit initialization queued (will execute once the global script is fully ready).");
      }
    }
  }, [isLiveAdSenseActive, adsenseClientId, adsenseSlotId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => {
      setCopied(null);
    }, 2000);
  };

  const currentAd = SIMULATED_ADS[currentAdIndex];

  // AdSense integration code templates
  const adsenseHtmlTemplate = `<!-- Add this in public/index.html <head> tag -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR-CA-PUB-ID" crossorigin="anonymous"></script>

<!-- Add this inside your component/page container -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="YOUR-CA-PUB-ID"
     data-ad-slot="YOUR-SLOT-ID"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>`;

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

  if (isLiveAdSenseActive) {
    return (
      <div className={`w-full overflow-hidden flex items-center justify-center min-h-[50px] py-1 ${className}`} id="admob_live_wrapper">
        <ins className="adsbygoogle w-full block text-center"
             style={{ display: 'block', minWidth: '250px', minHeight: '50px' }}
             data-ad-client={adsenseClientId}
             data-ad-slot={adsenseSlotId}
             data-ad-format="horizontal"
             data-full-width-responsive="true"></ins>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-dashed border-white/10 bg-[#111111] p-1.5 text-white transition-all ${className}`} id="admob_component_wrapper">
      {/* Banner Area */}
      <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1 text-[9px] text-gray-500 font-mono">
        <div className="flex items-center gap-1">
          <span className="px-1 py-0.5 bg-white/10 font-bold tracking-wider rounded text-emerald-400 uppercase text-[8px] border border-white/5">
            AD CONSOLE PLACEHOLDER
          </span>
          <span className="text-gray-500 hidden sm:inline">
            Mocking mobile layout
          </span>
        </div>
        <button 
          onClick={() => setShowIntegrationDocs(!showIntegrationDocs)}
          className="flex items-center gap-0.5 text-emerald-500 hover:text-emerald-400 transition-colors font-medium font-sans cursor-pointer text-[9px] uppercase tracking-wider"
        >
          <Info size={10} />
          {showIntegrationDocs ? 'Hide Setup' : 'View AdSense & AdMob Guide'}
        </button>
      </div>

      {/* Highly Interactive Mock Ads Slot */}
      <div className="flex items-center justify-between gap-3 bg-[#0A0A0A] p-2 border border-white/5 rounded-lg relative group min-h-[44px]">
        {/* Banner Ad Content */}
        <div className="flex-1 min-w-0 pr-12 animate-fade-in">
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
            className="px-2 py-0.5 text-[9px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded flex items-center gap-1 border-0 outline-hidden transition-all duration-150 cursor-pointer uppercase tracking-wider"
          >
            {currentAd.cta}
          </button>
        </div>

        {/* Floating Ad Symbol */}
        <div className="absolute right-1.5 top-1 text-[7px] text-gray-600 group-hover:text-emerald-400 pointer-events-none font-bold tracking-wider uppercase transition-colors">
          AdSense Preview
        </div>
      </div>

      {/* Embedded SDK Panel */}
      {showIntegrationDocs && (
        <div className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2 border-b border-slate-800 pb-2 mb-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-100">Ready for Google AdSense & PWA Monetization</p>
              <p className="text-[10px] text-slate-400">Below are the setup codes and configurations to connect your live AdSense ads:</p>
            </div>
          </div>

          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-1 mb-1 font-mono">1. Easy PWA Setup Guidelines</p>
          <div className="text-[11px] text-slate-300 space-y-1 mb-3">
            <p>• Log into your <strong>Google AdSense Console</strong> and get your Publisher ID (e.g. <code className="bg-slate-800 px-1 rounded text-red-300 font-mono">ca-pub-XXXXXXXXXXXXXXXX</code>).</p>
            <p>• Create two Display Ad Units (Top and Bottom) to get your Ad Slot IDs.</p>
            <p>• Add these IDs to your environment secrets or `.env` variables to instantly transition from Simulated to Live ads!</p>
          </div>

          <div className="space-y-3">
            {/* HTML Setup */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-t-md font-mono border-b border-slate-800">
                <span>Google AdSense HTML & React Setup</span>
                <button 
                  onClick={() => handleCopy(adsenseHtmlTemplate, 'adsense')}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied === 'adsense' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copied === 'adsense' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2 bg-slate-950 font-mono text-[9px] text-emerald-400 overflow-x-auto rounded-b-md max-h-[140px]">
                {adsenseHtmlTemplate}
              </pre>
            </div>

            {/* Hybrid Capacitor Setup */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-t-md font-mono border-b border-slate-800">
                <span>Optional Native App Wrap (Capacitor AdMob)</span>
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
