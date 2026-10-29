import React, { useState } from 'react';
import {
  MatchScoreState,
  addPoint,
  undoPoint,
  startNextSet,
  resetMatch,
  setTargetPoints,
} from '@/lib/score';
import { MatchMode } from '@/lib/playerTracker';
import { generateScoreAnnouncement, announceVoice } from '@/lib/scoreVoice';
import {
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Trophy,
  CircleDot,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

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
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);

  const teamALabel = matchMode === 'doubles' ? 'Tim A' : 'P1';
  const teamBLabel = matchMode === 'doubles' ? 'Tim B' : 'P2';

  const handleAddPointA = () => {
    const nextState = addPoint(scoreState, 'A');
    onScoreChange(nextState);
    const speech = generateScoreAnnouncement(nextState, teamALabel, teamBLabel);
    announceVoice(speech, isVoiceEnabled);
  };

  const handleAddPointB = () => {
    const nextState = addPoint(scoreState, 'B');
    onScoreChange(nextState);
    const speech = generateScoreAnnouncement(nextState, teamALabel, teamBLabel);
    announceVoice(speech, isVoiceEnabled);
  };

  const handleUndo = () => {
    const nextState = undoPoint(scoreState);
    onScoreChange(nextState);
    const speech = generateScoreAnnouncement(nextState, teamALabel, teamBLabel);
    announceVoice(speech, isVoiceEnabled);
  };

  const handleReset = () => {
    if (confirm('Reset skor pertandingan kembali ke 0-0?')) {
      const nextState = resetMatch(scoreState);
      onScoreChange(nextState);
      announceVoice('Pertandingan di-reset, nol sama.', isVoiceEnabled);
    }
  };

  const handleNextSet = () => {
    const nextState = startNextSet(scoreState);
    onScoreChange(nextState);
    announceVoice(`Memulai Set ${nextState.currentSet}, nol sama.`, isVoiceEnabled);
  };

  return (
    <div className="flex flex-col items-center pointer-events-auto select-none max-w-full px-2">
      {/* Set Won / Match Won Banner */}
      {scoreState.setWinner && (
        <div className="mb-1.5 px-3 py-1.5 rounded-xl bg-orange-600/95 border border-orange-400 text-white shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="truncate max-w-[200px]">
            {scoreState.matchWinner
              ? `Juara: ${scoreState.matchWinner === 'A' ? teamALabel : teamBLabel}! 🎉`
              : `Set ${scoreState.currentSet}: ${scoreState.setWinner === 'A' ? teamALabel : teamBLabel} Menang!`}
          </span>
          {!scoreState.matchWinner && (
            <button
              onClick={handleNextSet}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white text-orange-700 text-[10px] font-black shadow hover:bg-orange-50 active:scale-95 transition"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Set {scoreState.currentSet + 1}</span>
            </button>
          )}
        </div>
      )}

      {/* Main Sleek Scoreboard Card */}
      <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl overflow-hidden flex flex-col w-auto max-w-[340px] sm:max-w-md">
        {/* Top Mini Bar: Set, Points Mode (11/21), Voice, Undo, Collapse */}
        <div className="px-2.5 py-0.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2 text-[9px] text-slate-300">
          <div className="flex items-center gap-1 font-bold">
            <span className="text-orange-400">S{scoreState.currentSet}</span>
            <span className="text-slate-500">({scoreState.teamASets}-{scoreState.teamBSets})</span>
            {scoreState.isDeuce && (
              <span className="px-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[8px] font-black">
                DEUCE
              </span>
            )}
          </div>

          {/* Mini Score Preview when Collapsed */}
          {isCollapsed && (
            <div className="flex items-center gap-1.5 font-mono font-black text-[10px] px-1 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-lime-400">{teamALabel} {scoreState.teamAScore}</span>
              <span className="text-slate-500">:</span>
              <span className="text-purple-400">{scoreState.teamBScore} {teamBLabel}</span>
            </div>
          )}

          {/* 11pt vs 21pt selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 text-[8px] font-bold">
            <button
              onClick={() => onScoreChange(setTargetPoints(scoreState, 11))}
              className={`px-1 py-0.2 rounded transition ${
                scoreState.targetPoints === 11
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              11pt
            </button>
            <button
              onClick={() => onScoreChange(setTargetPoints(scoreState, 21))}
              className={`px-1 py-0.2 rounded transition ${
                scoreState.targetPoints === 21
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              21pt
            </button>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsVoiceEnabled((prev) => !prev)}
              className={`p-0.5 rounded transition ${
                isVoiceEnabled ? 'text-orange-400' : 'text-slate-500'
              }`}
              title={isVoiceEnabled ? 'Suara Skor Aktif' : 'Suara Skor Mati'}
            >
              {isVoiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </button>
            <button
              onClick={handleUndo}
              disabled={scoreState.history.length === 0}
              className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="Undo Point"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={handleReset}
              className="text-[8px] text-slate-400 hover:text-rose-400 transition px-0.5"
              title="Reset Skor"
            >
              Reset
            </button>
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-0.5 rounded text-slate-400 hover:text-white transition"
              title={isCollapsed ? 'Buka Scoreboard' : 'Sembunyikan'}
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Compact Clickable Scores Row */}
        {!isCollapsed && (
          <div className="px-2 py-1 flex items-center justify-center gap-2">
            {/* Team A Button */}
            <button
              onClick={handleAddPointA}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 active:scale-95 border border-slate-800/80 hover:border-lime-500/50 transition group"
              title={`Tambah poin ${teamALabel}`}
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-lime-400">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                <span className="max-w-[45px] sm:max-w-[70px] truncate">{teamALabel}</span>
                {scoreState.currentServer === 'A' && (
                  <span title="Sedang Servis">
                    <CircleDot className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                  </span>
                )}
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-100 group-hover:text-lime-400 transition-colors">
                {scoreState.teamAScore}
              </span>
            </button>

            <span className="text-sm font-black text-slate-600 select-none">:</span>

            {/* Team B Button */}
            <button
              onClick={handleAddPointB}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 active:scale-95 border border-slate-800/80 hover:border-purple-500/50 transition group"
              title={`Tambah poin ${teamBLabel}`}
            >
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-100 group-hover:text-purple-400 transition-colors">
                {scoreState.teamBScore}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-400">
                {scoreState.currentServer === 'B' && (
                  <span title="Sedang Servis">
                    <CircleDot className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                  </span>
                )}
                <span className="max-w-[45px] sm:max-w-[70px] truncate">{teamBLabel}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
