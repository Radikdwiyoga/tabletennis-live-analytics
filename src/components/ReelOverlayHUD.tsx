import React, { useState } from 'react';
import { PlayerFrame } from '@/lib/playerTracker';
import { PoseTrackerMetrics } from './usePoseTracker';
import { MiniTableMap } from './MiniTableMap';
import { Gauge } from 'lucide-react';

interface ReelOverlayHUDProps {
  p1: PlayerFrame | null;
  p2: PlayerFrame | null;
  metrics: PoseTrackerMetrics;
  videoRef: React.RefObject<HTMLVideoElement>;
  sessionDurationFormatted?: string;
  isCalibrating: boolean;
}

export const ReelOverlayHUD: React.FC<ReelOverlayHUDProps> = ({
  p1,
  p2,
  metrics,
  videoRef,
  sessionDurationFormatted = '00:00',
  isCalibrating,
}) => {
  const [showPerfDetails, setShowPerfDetails] = useState<boolean>(true);

  if (isCalibrating) {
    return null; // Don't obstruct calibration view
  }

  const video = videoRef.current;
  const vWidth = video?.videoWidth || 1280;
  const vHeight = video?.videoHeight || 720;

  // Convert pixel coords to percentage for responsive DOM positioning
  const toPercent = (p: { x: number; y: number }) => ({
    left: `${Math.max(2, Math.min(98, (p.x / vWidth) * 100))}%`,
    top: `${Math.max(2, Math.min(98, (p.y / vHeight) * 100))}%`,
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-sans select-none">
      {/* 1. In-Video Floating Player Badges (F4) */}
      {p1 && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full transition-all duration-75 pointer-events-none z-20"
          style={toPercent(p1.hip)}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-lime-500 text-slate-950 font-black text-xs shadow-lg shadow-lime-500/40 border border-white">
              <span>P1</span>
              {p1.confidence < 0.6 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-700 animate-pulse" />
              )}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-lime-400 border border-slate-950 shadow" />
          </div>
        </div>
      )}

      {p2 && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full transition-all duration-75 pointer-events-none z-20"
          style={toPercent(p2.hip)}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-500/40 border border-white">
              <span>P2</span>
              {p2.confidence < 0.6 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 border border-slate-950 shadow" />
          </div>
        </div>
      )}

      {/* Wrists / Hands Tracking Dots */}
      {p1 && (
        <>
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-lime-400 border border-white -translate-x-1/2 -translate-y-1/2 shadow-sm"
            style={toPercent(p1.wrists[0])}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-lime-400 border border-white -translate-x-1/2 -translate-y-1/2 shadow-sm"
            style={toPercent(p1.wrists[1])}
          />
        </>
      )}
      {p2 && (
        <>
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-purple-400 border border-white -translate-x-1/2 -translate-y-1/2 shadow-sm"
            style={toPercent(p2.wrists[0])}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-purple-400 border border-white -translate-x-1/2 -translate-y-1/2 shadow-sm"
            style={toPercent(p2.wrists[1])}
          />
        </>
      )}

      {/* 2. Top-Left: RALLY & Session Panel (F5) */}
      <div className="absolute top-12 left-3 flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl px-3 py-2 shadow-xl flex items-center gap-3">
          <div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-orange-400">
              Session Time
            </div>
            <div className="text-sm font-black font-mono text-slate-100">
              {sessionDurationFormatted}
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-700" />

          {/* Performance Pill (tt-perf-testing) */}
          <button
            onClick={() => setShowPerfDetails((prev) => !prev)}
            className="flex items-center gap-1.5 text-[10px] text-slate-300 hover:text-white"
            title="Klik untuk toggle rincian FPS"
          >
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold">{metrics.inferenceFps} fps</span>
          </button>
        </div>

        {/* Detailed Performance Metric overlay */}
        {showPerfDetails && (
          <div className="bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-lg px-2.5 py-1 text-[9px] text-slate-400 font-mono flex items-center gap-2">
            <span>Model: {metrics.inferenceTimeMs}ms</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">{metrics.delegate}</span>
          </div>
        )}
      </div>

      {/* 3. Bottom-Left: Players Status Panel (F5) */}
      <div className="absolute bottom-3 left-3 pointer-events-auto flex flex-col gap-1">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl p-2.5 shadow-xl flex items-center gap-3 text-xs">
          {/* P1 Status */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-500 shadow-sm shadow-lime-500/50" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-200 leading-none">P1 (Kiri)</span>
              <span className="text-[9px] text-slate-400 font-mono">
                {p1 ? `${(p1.confidence * 100).toFixed(0)}%` : 'Mencari...'}
              </span>
            </div>
          </div>

          <div className="w-[1px] h-5 bg-slate-800" />

          {/* P2 Status */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-200 leading-none">P2 (Kanan)</span>
              <span className="text-[9px] text-slate-400 font-mono">
                {p2 ? `${(p2.confidence * 100).toFixed(0)}%` : 'Mencari...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom-Right: Top-Down Table Miniature Map (F5) */}
      <div className="absolute bottom-3 right-3 pointer-events-auto">
        <MiniTableMap p1={p1} p2={p2} />
      </div>
    </div>
  );
};
