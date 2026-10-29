import React from 'react';
import { PlayerFrame, PlayerId } from '@/lib/playerTracker';
import { BouncePoint } from '@/lib/rally';
import { TABLE_WIDTH_CM, TABLE_HEIGHT_CM } from '@/lib/homography';

interface MiniTableMapProps {
  players: Record<PlayerId, PlayerFrame | null>;
  bounces?: BouncePoint[];
}

const PLAYER_BADGE_STYLES: Record<PlayerId, { bg: string; text: string; num: string }> = {
  P1: { bg: 'bg-lime-500 shadow-lime-500/50', text: 'text-slate-950', num: '1' },
  P3: { bg: 'bg-cyan-500 shadow-cyan-500/50', text: 'text-slate-950', num: '3' },
  P2: { bg: 'bg-purple-500 shadow-purple-500/50', text: 'text-white', num: '2' },
  P4: { bg: 'bg-amber-500 shadow-amber-500/50', text: 'text-slate-950', num: '4' },
};

export const MiniTableMap: React.FC<MiniTableMapProps> = ({ players, bounces = [] }) => {
  const mapWidth = 148;
  const mapHeight = Math.round(mapWidth * (TABLE_HEIGHT_CM / TABLE_WIDTH_CM));

  const scaleX = mapWidth / TABLE_WIDTH_CM;
  const scaleY = mapHeight / TABLE_HEIGHT_CM;

  const toMini = (tablePos?: { x: number; y: number }) => {
    if (!tablePos) return null;
    const x = Math.max(-15, Math.min(TABLE_WIDTH_CM + 15, tablePos.x)) * scaleX;
    const y = Math.max(-15, Math.min(TABLE_HEIGHT_CM + 15, tablePos.y)) * scaleY;
    return { x, y };
  };

  const recentBounces = bounces.slice(-20);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-2.5 shadow-xl flex flex-col gap-1.5 pointer-events-auto">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>Peta Meja & Pantulan</span>
        <span className="text-[9px] text-slate-500 font-normal">est.</span>
      </div>

      <div
        className="relative bg-blue-950/90 rounded-lg border-2 border-slate-300/80 overflow-visible shadow-inner"
        style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
      >
        {/* Net Line in Center (x = 137cm) */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white/90 shadow-sm"
          style={{ left: `${mapWidth / 2}px` }}
        />

        {/* Center Service Line (horizontal) */}
        <div
          className="absolute left-0 right-0 h-[1px] bg-white/40 border-t border-dashed border-white/50"
          style={{ top: `${mapHeight / 2}px` }}
        />

        {/* Zone Labels */}
        <span className="absolute left-2 top-1 text-[8px] font-black text-lime-400/50 select-none">
          Tim A
        </span>
        <span className="absolute right-2 top-1 text-[8px] font-black text-purple-400/50 select-none">
          Tim B
        </span>

        {/* Ball Bounces */}
        {recentBounces.map((b) => {
          const bx = b.tableX * scaleX;
          const by = b.tableY * scaleY;
          const isP1Team = b.hitter === 'P1';

          return (
            <div
              key={b.id}
              className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm ${
                isP1Team ? 'bg-orange-400 shadow-orange-400/80' : 'bg-purple-400 shadow-purple-400/80'
              }`}
              style={{ left: `${bx}px`, top: `${by}px` }}
              title={`Pantulan ${b.hitter} (${b.tableX}, ${b.tableY} cm)`}
            />
          );
        })}

        {/* Render Players Markers (P1, P2, P3, P4) */}
        {(['P1', 'P2', 'P3', 'P4'] as PlayerId[]).map((id) => {
          const p = players[id];
          const coords = toMini(p?.tablePos);
          if (!coords) return null;
          const style = PLAYER_BADGE_STYLES[id];

          return (
            <div
              key={id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-10"
              style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full ${style.bg} border border-white shadow-md flex items-center justify-center`}
              >
                <span className={`text-[7px] font-black ${style.text}`}>{style.num}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5">
        <span>Pantulan: {bounces.length}</span>
        <span className="text-orange-400 font-mono">274×152 cm</span>
      </div>
    </div>
  );
};
