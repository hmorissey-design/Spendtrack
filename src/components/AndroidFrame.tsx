/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Smartphone, Monitor, Download, Info, X, CheckCircle, ArrowUpRight, HelpCircle } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  currentTime?: string;
  onRefreshDatabase?: () => void;
}

export function AndroidFrame({ children, currentTime = '12:00', onRefreshDatabase }: AndroidFrameProps) {
  const [deviceTime, setDeviceTime] = useState(currentTime);
  const [batteryLevel] = useState(87);
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false); // Default to gorgeous edge-to-edge Responsive Web view!
  const [isRealMobileAndTablet, setIsRealMobileAndTablet] = useState<boolean>(false);
  const [dismissSimulator, setDismissSimulator] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('dismiss_simulator');
      return stored !== null ? stored === 'true' : true; // Default to true for pure web app experience!
    } catch {
      return true;
    }
  });

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const handleOpenGuide = () => {
      setShowInstallGuide(true);
    };
    window.addEventListener('open-pwa-install-guide', handleOpenGuide);
    return () => {
      window.removeEventListener('open-pwa-install-guide', handleOpenGuide);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    try {
      localStorage.setItem('dismiss_simulator', String(dismissSimulator));
    } catch (e) {
      // ignore
    }
  }, [dismissSimulator]);

  useEffect(() => {
    // Sync clock with the current timezone / local time
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setDeviceTime(`${hours}:${minutes} ${ampm}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768; // standard tablet & mobile breakpoint
      setIsRealMobileAndTablet(isMobileUA || isSmallScreen);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const renderInstallGuideModal = () => {
    if (!showInstallGuide) return null;
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
          <button
            onClick={() => setShowInstallGuide(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg cursor-pointer border-0 bg-transparent"
            title="Close Guide"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2.5 border-b border-white/5 pb-3 mb-4">
            <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 text-[#10b981] rounded-xl">
              <Download size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Install ExpenseTrack PWA</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Add standalone App icon to your home screen or desktop launcher.</p>
            </div>
          </div>

          <div className="space-y-4 font-sans text-xs">
            {/* iOS Guide */}
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
              <p className="font-extrabold text-emerald-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                📱 iPhone & iPad (Safari)
              </p>
              <ol className="text-[10.5px] text-gray-300 list-decimal list-inside space-y-1 pl-1">
                <li>Open Safari and visit this website.</li>
                <li>Tap the <strong className="text-white font-semibold">Share button</strong> (square with up arrow).</li>
                <li>Scroll down and tap <strong className="text-white font-semibold">Add to Home Screen</strong>.</li>
                <li>Tap <strong className="text-emerald-400 font-bold">Add</strong> at the top right.</li>
              </ol>
            </div>

            {/* Android Guide */}
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
              <p className="font-extrabold text-emerald-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                🤖 Android (Chrome)
              </p>
              <ol className="text-[10.5px] text-gray-300 list-decimal list-inside space-y-1 pl-1">
                <li>Tap the browser's <strong className="text-white font-semibold">menu icon</strong> (3 dots in top right).</li>
                <li>Tap <strong className="text-white font-semibold">Install App</strong> or <strong className="text-white font-semibold">Add to Home screen</strong>.</li>
                <li>Follow the prompts on screen to confirm.</li>
              </ol>
            </div>

            {/* Desktop Guide */}
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
              <p className="font-extrabold text-emerald-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                💻 Desktop (Chrome, Edge)
              </p>
              <ol className="text-[10.5px] text-gray-300 list-decimal list-inside space-y-1 pl-1">
                <li>Click the <strong className="text-white font-semibold">Install icon</strong> (small monitor with download arrow) inside the URL address bar.</li>
                <li>Or open settings menu (3 dots) and click <strong className="text-white font-semibold">Save and share → Install app</strong>.</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-[#161616] p-2.5 border border-white/5 rounded-xl">
              <CheckCircle size={14} className="text-emerald-400 shrink-0" />
              <span>Stand-alone PWA apps consume near-zero memory, loads instantly offline, and can be easily uninstalled at any time.</span>
            </div>
          </div>

          <button
            onClick={() => setShowInstallGuide(false)}
            className="mt-5 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer border-0 active:scale-95 text-center"
          >
            Got It
          </button>
        </div>
      </div>
    );
  };

  if (isRealMobileAndTablet || dismissSimulator) {
    return (
      <div className="w-full h-screen flex flex-col bg-[#0A0A0A] text-slate-200 select-none pb-safe relative overflow-hidden animate-in fade-in duration-300">
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          {children}
        </div>
        {dismissSimulator && !isRealMobileAndTablet && (
          <button 
            onClick={() => setDismissSimulator(false)}
            className="fixed bottom-18 right-4 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-full shadow-lg z-50 text-xs flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity cursor-pointer duration-150 active:scale-95 border-0"
            title="Show PWA Companion Hub"
          >
            <Smartphone size={15} />
            <span className="text-[10px] font-bold">PWA Hub</span>
          </button>
        )}
        {renderInstallGuideModal()}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start min-h-screen bg-[#070707] p-2 sm:p-4 text-slate-200 font-sans" id="android_preview_container">
      {/* Upper PWA Hub Options Bar */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 bg-[#111111] border border-white/5 p-4 mb-4 rounded-2xl shadow-xl transition-all">
        <div>
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5 font-sans uppercase tracking-[0.1em]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            ExpenseTrack PWA App Center
          </h2>
          <p className="text-[10px] text-gray-400 mt-1 max-w-lg leading-relaxed">
            ExpenseTrack is built as a fully functional, offline-first installable **Progressive Web App (PWA)**. 
            All data resides 100% locally on your own device.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* PWA Direct Installation Button */}
          {showInstallBtn ? (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer active:scale-95 rounded-lg transition-all flex items-center gap-1 animate-pulse"
              title="Install ExpenseTrack on your device as a native standalone application"
            >
              <Download size={13} className="stroke-[2.5]" />
              <span>Install App 📲</span>
            </button>
          ) : (
            <button
              onClick={() => setShowInstallGuide(true)}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 cursor-pointer active:scale-95 rounded-lg transition-all flex items-center gap-1.5"
              title="View instructions to install this PWA app on iPhone, iPad, Android or Desktop"
            >
              <Download size={13} />
              <span>How to Install 📲</span>
            </button>
          )}

          {/* View Mode Select */}
          <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/10">
            <button
              onClick={() => setIsMobileMode(true)}
              className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1 cursor-pointer border-0 bg-transparent ${
                isMobileMode 
                  ? 'bg-[#1a1a1a] text-emerald-400 shadow-xs' 
                  : 'text-gray-400 hover:text-emerald-400'
              }`}
              title="Preview emulated Mobile Screen layout (9:19.5 aspect ratio)"
            >
              <Smartphone size={12} />
              <span>Mobile Bezel</span>
            </button>
            <button
              onClick={() => setIsMobileMode(false)}
              className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1 cursor-pointer border-0 bg-transparent ${
                !isMobileMode 
                  ? 'bg-[#1a1a1a] text-emerald-400 shadow-xs' 
                  : 'text-gray-400 hover:text-emerald-400'
              }`}
              title="View full-width standard Responsive Web layout"
            >
              <Monitor size={12} />
              <span>Responsive Web</span>
            </button>
          </div>

          <button
            onClick={() => setDismissSimulator(true)}
            className="px-3 py-1.5 text-xs font-bold bg-[#1a1a1a] hover:bg-white/5 border border-white/10 text-gray-300 cursor-pointer active:scale-95 rounded-lg transition-all flex items-center gap-1"
            title="Collapses this PWA options panel entirely to show the standalone app experience"
          >
            <span>✨ Pure App View</span>
          </button>

          {onRefreshDatabase && (
            <button
              onClick={onRefreshDatabase}
              className="px-2.5 py-1.5 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 cursor-pointer active:scale-95 rounded-lg transition-all flex items-center gap-1 border-0"
              title="Wipes local state to perform a clean-state test"
            >
              Reset Database
            </button>
          )}
        </div>
      </div>

      {/* Frame Rendering Container */}
      <div className={`transition-all duration-300 w-full flex items-center justify-center ${
        isMobileMode ? 'max-w-[412px]' : 'max-w-4xl'
      }`}>
        {isMobileMode ? (
          /* Actual High-fidelity Android Smartphone Bezels */
          <div className="h-[76vh] max-h-[820px] min-h-[500px] aspect-[9/19.5] w-auto bg-[#020202] rounded-[48px] p-3 shadow-2xl border-4 border-zinc-800 ring-10 ring-black flex flex-col relative overflow-hidden">
            {/* Camera Pin Hole Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full border border-neutral-900 z-50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-blue-950 rounded-full opacity-60"></div>
            </div>

            {/* Android Status Bar (top) */}
            <div className="w-full flex items-center justify-between px-6 pt-1 pb-1.5 text-white/90 text-xs font-sans tracking-wide select-none z-40 bg-[#0A0A0A] border-b border-white/5">
              <span className="font-semibold">{deviceTime}</span>
              <div className="flex items-center gap-1.5">
                <Signal size={12} className="opacity-90" />
                <Wifi size={12} className="opacity-90" />
                <div className="flex items-center gap-0.5 bg-white/5 px-1 py-0.5 rounded text-[9px] font-bold font-mono">
                  <span>{batteryLevel}%</span>
                  <Battery size={13} className="rotate-0 shrink-0 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Inner Content Window */}
            <div className="flex-1 bg-[#0A0A0A] relative flex flex-col overflow-hidden rounded-t-[12px] rounded-b-[32px]">
              {children}
            </div>

            {/* Android Navigation Pill Bar */}
            <div className="w-full flex justify-center items-center py-2.5 bg-black text-white select-none rounded-b-[36px] border-t border-white/5">
              <div className="flex-1 text-center shrink-0">
                <span className="inline-block w-3.5 h-3.5 border-t-2 border-l-2 border-zinc-600 -rotate-45 transform cursor-pointer hover:border-white transition-colors"></span>
              </div>
              <div className="flex-1 text-center shrink-0 flex justify-center">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-zinc-600 transition-colors"></span>
              </div>
              <div className="flex-1 text-center shrink-0 flex justify-center">
                <span className="inline-block w-3 h-3 border-2 border-zinc-600 rounded-sm cursor-pointer hover:border-white transition-colors"></span>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Desktop Web View Layout Card */
          <div className="w-full bg-[#0A0A0A] rounded-2xl shadow-2xl border border-white/5 overflow-hidden flex flex-col h-[76vh] max-h-[820px] min-h-[500px]">
            {/* Simulated Desktop Header Bar */}
            <div className="bg-[#111111] text-white px-4 py-2.5 text-xs font-mono flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="ml-2 font-semibold text-gray-400">https://expensetrack.pwa/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400 font-semibold uppercase tracking-wider text-[9px] border border-emerald-500/10">Active Local Database</span>
                <span className="text-gray-400">{deviceTime}</span>
              </div>
            </div>

            {/* Content view directly */}
            <div className="flex-1 relative flex flex-col overflow-hidden min-h-0">
              {children}
            </div>
          </div>
        )}
      </div>

      {renderInstallGuideModal()}
    </div>
  );
}
