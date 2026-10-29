import React, { useState } from 'react';
import { PlayerFrame, PlayerId, MatchMode } from '@/lib/playerTracker';
import { PoseTrackerMetrics } from './usePoseTracker';
import { MiniTableMap } from './MiniTableMap';
import { RallyStats } from '@/lib/rally';
import { TrajectoryPoint } from './useBallTracker';
import { Point2D } from '@/lib/homography';
import { BallColorProfile } from '@/workers/ball.worker';
import { Gauge, Zap, Flame, Users, User } from 'lucide-react';

interface ReelOverlayHUDProps {
  players: Record<PlayerId, PlayerFrame | null>;
  currentBall: Point2D | null;
  trajectory: TrajectoryPoint[];
  rallyStats: RallyStats;
  colorProfile: BallColorProfile;
  onColorProfileChange: (p: BallColorProfile) => void;
  matchMode: MatchMode;
  onMatchModeChange: (mode: MatchMode) => void;
  metrics: PoseTrackerMetrics;
  videoRef: React.RefObject<HTMLVideoElement>;
  sessionDurationFormatted?: string;
  isCalibrating: boolean;
}

const PLAYER_THEMES: Record<PlayerId, { bg: string; text: string; wristDot: string; ringColor: string }> = {
  P1: { bg: 'bg-lime-500 shadow-lime-500/40', text: 'text-slate-950', wristDot: 'bg-lime-400', ringColor: 'text-lime-400' },
  P3: { bg: 'bg-cyan-500 shadow-cyan-500/40', text: 'text-slate-950', wristDot: 'bg-cyan-400', ringColor: 'text-cyan-400' },
  P2: { bg: 'bg-purple-500 shadow-purple-500/40', text: 'text-white', wristDot: 'bg-purple-400', ringColor: 'text-purple-400' },
  P4: { bg: 'bg-amber-500 shadow-amber-500/40', text: 'text-slate-950', wristDot: 'bg-amber-400', ringColor: 'text-amber-400' },
};

export const ReelOverlayHUD: React.FC<ReelOverlayHUDProps> = ({
  players,
  currentBall,
  trajectory,
  rallyStats,
  colorProfile,
  onColorProfileChange,
  matchMode,
  onMatchModeChange,
  metrics,
  videoRef,
  sessionDurationFormatted = '00:00',
  isCalibrating,
}) => {
  const [showPerfDetails, setShowPerfDetails] = useState<boolean>(true);

  if (isCalibrating) {
    return null;
  }

  const video = videoRef.current;
  const vWidth = video?.videoWidth || 1280;
  const vHeight = video?.videoHeight || 720;

  const toPercent = (p: { x: number; y: number }) => ({
    left: `${Math.max(2, Math.min(98, (p.x / vWidth) * 100))}%`,
    top: `${Math.max(2, Math.min(98, (p.y / vHeight) * 100))}%`,
  });

  const activePlayerIds = (
    matchMode === 'doubles' ? ['P1', 'P3', 'P2', 'P4'] : ['P1', 'P2']
  ) as PlayerId[];

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-sans select-none">
      {/* 1. Ball Trajectory Trail & Current Ball Marker */}
      <svg
        viewBox={`0 0 ${vWidth} ${vHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full absolute inset-0 pointer-events-none"
      >
        {trajectory.length >= 2 && (
          <polyline
            points={trajectory.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colorProfile.type === 'orange' ? '#f97316' : '#38bdf8'}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4,2"
            opacity="0.8"
          />
        )}

        {currentBall && (
          <g transform={`translate(${currentBall.x}, ${currentBall.y})`}>
            <circle
              r="7"
              fill={colorProfile.type === 'orange' ? '#ffedd5' : '#ffffff'}
              stroke={colorProfile.type === 'orange' ? '#ea580c' : '#0284c7'}
              strokeWidth="2.5"
            />
            <circle
              r="12"
              fill="none"
              stroke={colorProfile.type === 'orange' ? '#f97316' : '#38bdf8'}
              strokeWidth="1.5"
              opacity="0.6"
              className="animate-ping"
            />
          </g>
        )}
      </svg>

      {/* 2. Floating Player Badges (P1, P2, P3, P4) */}
      {activePlayerIds.map((id) => {
        const p = players[id];
        if (!p) return null;
        const theme = PLAYER_THEMES[id];

        return (
          <React.Fragment key={id}>
            {/* Hip Tag */}
            <div
              className="absolute -translate-x-1/2 -translate-y-full transition-all duration-75 pointer-events-none z-20"
              style={toPercent(p.hip)}
            >
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${theme.bg} ${theme.text} font-black text-xs shadow-lg border border-white`}
                >
                  <span>{id}</span>
                  {p.confidence < 0.6 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  )}
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${theme.wristDot} border border-slate-950 shadow`} />
              </div>
            </div>

            {/* Wrists tracking dots */}
            <div
              className={`absolute w-2.5 h-2.5 rounded-full ${theme.wristDot} border border-white -translate-x-1/2 -translate-y-1/2 shadow-sm`}
              style={toPercent(p.wrists[0])}
            />
            <div
              className={`absolute w-2.5 h-2.5 rounded-full ${theme.wristDot} border border-white -translate-x-1/2 -translate-y-1/2 shadow-sm`}
              style={toPercent(p.wrists[1])}
            />
          </React.Fragment>
        );
      })}

      {/* 3. Top-Left: RALLY & Session Panel */}
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

          {/* Performance Pill */}
          <button
            onClick={() => setShowPerfDetails((prev) => !prev)}
            className="flex items-center gap-1.5 text-[10px] text-slate-300 hover:text-white"
            title="Klik untuk toggle rincian FPS"
          >
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold">{metrics.inferenceFps} fps</span>
          </button>
        </div>

        {/* Detailed Performance Metric */}
        {showPerfDetails && (
          <div className="bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-lg px-2.5 py-1 text-[9px] text-slate-400 font-mono flex items-center gap-2">
            <span>Pose: {metrics.inferenceTimeMs}ms</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">{metrics.delegate}</span>
          </div>
        )}
      </div>

      {/* 4. Top-Right: SHOT COUNT, SPEED & MODE Switcher */}
      <div className="absolute top-12 right-3 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-3">
          {/* Rally Shot Count */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>Rally</span>
            </span>
            <span className="text-lg font-black font-mono text-orange-400 leading-tight">
              {rallyStats.currentRallyShots}
            </span>
          </div>

          <div className="w-[1px] h-7 bg-slate-700" />

          {/* Best Rally */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
              Best
            </span>
            <span className="text-sm font-black font-mono text-slate-200 leading-tight">
              {rallyStats.longestRallyShots}
            </span>
          </div>

          {/* Ball Speed est. */}
          {rallyStats.lastSpeedKmh && (
            <>
              <div className="w-[1px] h-7 bg-slate-700" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span>Speed</span>
                </span>
                <span className="text-xs font-black font-mono text-emerald-400 leading-tight">
                  {rallyStats.lastSpeedKmh} <span className="text-[8px] font-normal text-slate-400">km/h est.</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Controls Row: Single/Double Mode & Ball Color Switcher */}
        <div className="flex items-center gap-2">
          {/* Match Mode Switcher (Single 1v1 vs Ganda 2v2) */}
          <div className="flex items-center bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-0.5 text-[9px]">
            <button
              onClick={() => onMatchModeChange('singles')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium transition ${
                matchMode === 'singles'
                  ? 'bg-orange-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-2.5 h-2.5" />
              <span>Single</span>
            </button>
            <button
              onClick={() => onMatchModeChange('doubles')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium transition ${
                matchMode === 'doubles'
                  ? 'bg-orange-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-2.5 h-2.5" />
              <span>Ganda</span>
            </button>
          </div>

          {/* Color Profile Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-1 text-[9px]">
            <span className="text-slate-400 px-0.5">Bola:</span>
            <button
              onClick={() => onColorProfileChange({ type: 'orange' })}
              className={`px-1.5 py-0.5 rounded font-medium transition ${
                colorProfile.type === 'orange'
                  ? 'bg-orange-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Oranye
            </button>
            <button
              onClick={() => onColorProfileChange({ type: 'white' })}
              className={`px-1.5 py-0.5 rounded font-medium transition ${
                colorProfile.type === 'white'
                  ? 'bg-slate-200 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Putih
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom-Left: Players Status Panel */}
      <div className="absolute bottom-3 left-3 pointer-events-auto flex flex-col gap-1">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl p-2.5 shadow-xl flex items-center gap-3 text-xs">
          {/* Team A (P1, P3) */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Tim A (Kiri)</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-lime-500" />
                <span className="text-[10px] font-bold text-slate-200">
                  P1: {players.P1 ? `${(players.P1.confidence * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              {matchMode === 'doubles' && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-bold text-slate-200">
                    P3: {players.P3 ? `${(players.P3.confidence * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="w-[1px] h-7 bg-slate-800" />

          {/* Team B (P2, P4) */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Tim B (Kanan)</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[10px] font-bold text-slate-200">
                  P2: {players.P2 ? `${(players.P2.confidence * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              {matchMode === 'doubles' && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-bold text-slate-200">
                    P4: {players.P4 ? `${(players.P4.confidence * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom-Right: Top-Down Table Miniature Map */}
      <div className="absolute bottom-3 right-3 pointer-events-auto">
        <MiniTableMap players={players} bounces={rallyStats.bounces} />
      </div>
    </div>
  );
};
