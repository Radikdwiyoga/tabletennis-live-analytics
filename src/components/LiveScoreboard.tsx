import React, { useState } from 'react';
import {
  MatchScoreState,
  addPoint,
  undoPoint,
  startNextSet,
  resetMatch,
} from '@/lib/score';
import { MatchMode } from '@/lib/playerTracker';
import { RotateCcw, ChevronUp, ChevronDown, Trophy, CircleDot, Play } from 'lucide-react';

interface LiveScoreboardProps {
  scoreState: MatchScoreState;
  onScoreChange: (newState: MatchScoreState) => void;
  matchMode: MatchMode;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  scoreState,
  onScoreChange,
  matchMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const handleAddPointA = () => {
    onScoreChange(addPoint(scoreState, 'A'));
  };

  const handleAddPointB = () => {
    onScoreChange(addPoint(scoreState, 'B'));
  };

  const handleUndo = () => {
    onScoreChange(undoPoint(scoreState));
  };

  const handleReset = () => {
    if (confirm('Reset skor pertandingan kembali ke 0-0?')) {
      onScoreChange(resetMatch(scoreState));
    }
  };

  const handleNextSet = () => {
    onScoreChange(startNextSet(scoreState));
  };

  const teamALabel = matchMode === 'doubles' ? 'Tim A (P1+P3)' : 'P1 (Kiri)';
  const teamBLabel = matchMode === 'doubles' ? 'Tim B (P2+P4)' : 'P2 (Kanan)';

  return (
    <div className="flex flex-col items-center pointer-events-auto select-none">
      {/* Set Won / Match Won Modal Banner */}
      {scoreState.setWinner && (
        <div className="mb-2 px-4 py-2 rounded-xl bg-orange-600/95 border border-orange-400 text-white shadow-2xl flex items-center gap-3 animate-bounce">
          <Trophy className="w-5 h-5 text-amber-300" />
          <div className="text-xs font-bold">
            {scoreState.matchWinner ? (
              <span>Pertandingan Selesai! Pemenang: {scoreState.matchWinner === 'A' ? teamALabel : teamBLabel} 🎉</span>
            ) : (
              <span>Set {scoreState.currentSet} Dimenangkan oleh {scoreState.setWinner === 'A' ? teamALabel : teamBLabel}!</span>
            )}
          </div>
          {!scoreState.matchWinner && (
            <button
              onClick={handleNextSet}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white text-orange-700 text-xs font-black shadow hover:bg-orange-50 active:scale-95 transition"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Set {scoreState.currentSet + 1}</span>
            </button>
          )}
        </div>
      )}

      {/* Main Scoreboard Container */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header: Set Info & Controls */}
        <div className="px-3 py-1 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-4 text-[10px]">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <span className="text-orange-400">SET {scoreState.currentSet}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Sets: {scoreState.teamASets} - {scoreState.teamBSets}
            </span>
            {scoreState.isDeuce && (
              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black">
                DEUCE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={scoreState.history.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="Undo Point"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={handleReset}
              className="text-[9px] text-slate-400 hover:text-rose-400 transition"
              title="Reset Skor"
            >
              Reset
            </button>
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-0.5 rounded text-slate-400 hover:text-white transition"
              title={isCollapsed ? 'Buka Scoreboard' : 'Sembunyikan'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Score Body */}
        {!isCollapsed && (
          <div className="p-2 sm:p-3 flex items-center gap-3 sm:gap-4">
            {/* Team A Score Button */}
            <button
              onClick={handleAddPointA}
              className="flex-1 flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 active:scale-95 border border-slate-800 hover:border-lime-500/50 transition group"
              title={`Tambah poin untuk ${teamALabel}`}
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-lime-400">
                <span className="w-2 h-2 rounded-full bg-lime-500" />
                <span className="truncate max-w-[80px]">{teamALabel}</span>
                {scoreState.currentServer === 'A' && (
                  <span title="Sedang Servis">
                    <CircleDot className="w-3 h-3 text-amber-400 animate-pulse ml-0.5" />
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-100 group-hover:text-lime-400 transition-colors">
                {scoreState.teamAScore}
              </div>
              <span className="text-[8px] text-slate-500 font-medium">+1 Tap</span>
            </button>

            {/* Center Divider / Dash */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-slate-600">:</span>
            </div>

            {/* Team B Score Button */}
            <button
              onClick={handleAddPointB}
              className="flex-1 flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 active:scale-95 border border-slate-800 hover:border-purple-500/50 transition group"
              title={`Tambah poin untuk ${teamBLabel}`}
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="truncate max-w-[80px]">{teamBLabel}</span>
                {scoreState.currentServer === 'B' && (
                  <span title="Sedang Servis">
                    <CircleDot className="w-3 h-3 text-amber-400 animate-pulse ml-0.5" />
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-100 group-hover:text-purple-400 transition-colors">
                {scoreState.teamBScore}
              </div>
              <span className="text-[8px] text-slate-500 font-medium">+1 Tap</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
