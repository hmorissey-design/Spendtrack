/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Terminal, Phone, Share2, Compass, Smartphone, Monitor } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  currentTime?: string;
  onRefreshDatabase?: () => void;
}

export function AndroidFrame({ children, currentTime = '12:00', onRefreshDatabase }: AndroidFrameProps) {
  const [deviceTime, setDeviceTime] = useState(currentTime);
  const [batteryLevel] = useState(87);
  const [isMobileMode, setIsMobileMode] = useState<boolean>(true); // Default to gorgeous emulated Android view!
  const [isRealMobileAndTablet, setIsRealMobileAndTablet] = useState<boolean>(false);
  const [dismissSimulator, setDismissSimulator] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dismiss_simulator') === 'true';
    } catch {
      return false;
    }
  });

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

  if (isRealMobileAndTablet || dismissSimulator) {
    return (
      <div className="w-full h-screen flex flex-col bg-[#0A0A0A] text-slate-200 select-none pb-safe relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          {children}
        </div>
        {dismissSimulator && (
          <button 
            onClick={() => setDismissSimulator(false)}
            className="fixed bottom-16 right-4 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-full shadow-lg z-50 text-xs flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity"
            title="Restore Simulator Frame"
          >
            <Smartphone size={16} />
            <span className="text-[10px] font-bold">Show Simulator</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start min-h-screen bg-[#070707] p-2 sm:p-4 text-slate-200 font-sans" id="android_preview_container">
      {/* Upper Control Bar */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-2.5 bg-[#121212] border border-white/5 p-4 mb-4 rounded-2xl shadow-lg transition-all">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans uppercase tracking-[0.1em]">
            <Smartphone size={16} className="text-emerald-500 animate-bounce" />
            Vite-to-Android App Preflight Simulator
          </h2>
          <p className="text-[11px] text-gray-400 mt-1">
            Simulating Play Store sandboxed environment. Built with fully localized private database schemas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Select */}
          <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/10">
            <button
              onClick={() => setIsMobileMode(true)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                isMobileMode 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-400 hover:text-emerald-500 hover:bg-white/5'
              }`}
            >
              <Smartphone size={13} />
              <span>Android Mobile</span>
            </button>
            <button
              onClick={() => setIsMobileMode(false)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                !isMobileMode 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-400 hover:text-emerald-500 hover:bg-white/5'
              }`}
            >
              <Monitor size={13} />
              <span>Responsive Web</span>
            </button>
          </div>

          <button
            onClick={() => setDismissSimulator(true)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 cursor-pointer active:scale-95 rounded-md transition-all flex items-center gap-1"
            title="Hides the simulator panel completely to show only the pure, fullscreen Web view of the app"
          >
            ✨ Pure Full Web view
          </button>

          {onRefreshDatabase && (
            <button
              onClick={onRefreshDatabase}
              className="px-2.5 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 cursor-pointer active:scale-95 rounded-md transition-all flex items-center gap-1"
              title="Restores default setup structures instantly for clean-state testing"
            >
              🗑️ Reset Local DB
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

            {/* Android Action Indicator Pill or Bottom Navigation Bar (Software keys) */}
            <div className="w-full flex justify-center items-center py-2.5 bg-black text-white select-none rounded-b-[36px] border-t border-white/5">
              {/* Back Button */}
              <div className="flex-1 text-center shrink-0">
                <span className="inline-block w-3.5 h-3.5 border-t-2 border-l-2 border-zinc-600 -rotate-45 transform cursor-pointer hover:border-white transition-colors"></span>
              </div>
              {/* Home Indicator Button */}
              <div className="flex-1 text-center shrink-0 flex justify-center">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-zinc-600 cursor-pointer hover:border-white transition-colors"></span>
              </div>
              {/* Multitasking Button */}
              <div className="flex-1 text-center shrink-0 flex justify-center">
                <span className="inline-block w-3 h-3 border-2 border-zinc-600 rounded-sm cursor-pointer hover:border-white transition-colors"></span>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Desktop Web View Layout Card */
          <div className="w-full bg-[#0A0A0A] rounded-2xl shadow-2xl border border-white/5 overflow-hidden flex flex-col h-[76vh] max-h-[820px] min-h-[500px]">
            {/* Simulated Desktop Header Bar */}
            <div className="bg-[#111111] text-white px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="ml-2 font-semibold text-gray-400">https://localhost:3000/personal-finance-dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400 font-semibold uppercase tracking-wider text-[9px] border border-emerald-500/10">Local Sandbox Profile</span>
                <span className="text-gray-400">{deviceTime}</span>
              </div>
            </div>

            {/* Content view directly */}
            <div className="flex-1 relative flex flex-col">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
