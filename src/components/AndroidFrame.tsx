/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AndroidFrameProps {
  children: React.ReactNode;
  currentTime?: string;
  onRefreshDatabase?: () => void;
}

export function AndroidFrame({ children }: AndroidFrameProps) {
  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-[#0A0A0A] text-slate-200 select-none relative overflow-hidden animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        {children}
      </div>
    </div>
  );
}
